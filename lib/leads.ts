// Tudo que transforma texto colado, planilha ou Trello em lead.
import type { LeadFields } from "./types";
import { URL_RE, hrefOf, textToHtml } from "./html";

export type LeadKey = keyof LeadFields;

export const LEAD_FIELDS: { key: LeadKey; label: string; placeholder: string; link?: boolean }[] = [
  { key: "phone", label: "WhatsApp / Telefone", placeholder: "(11) 99999-9999" },
  { key: "instagram", label: "Instagram", placeholder: "@empresa ou link", link: true },
  { key: "website", label: "Site", placeholder: "empresa.com.br", link: true },
  { key: "ad_url", label: "Anúncio", placeholder: "link do anúncio", link: true },
  { key: "maps_url", label: "Google Maps", placeholder: "link do Maps", link: true },
  { key: "city", label: "Cidade", placeholder: "São Paulo" },
  { key: "niche", label: "Nicho", placeholder: "Clínica, restaurante…" },
  { key: "source", label: "Origem", placeholder: "Google, Instagram, indicação…" },
  { key: "deal_value", label: "Valor estimado (R$)", placeholder: "1500" },
];

export type LeadDraft = Partial<LeadFields> & {
  title: string;
  description: string; // HTML
  adDetected: boolean;
  status?: string; // nome da etapa (planilha / Trello)
  due?: string | null;
  labels?: { name: string; color: string }[];
  checklists?: { title: string; items: { text: string; done: boolean }[] }[];
};

// ---------- normalização ----------

export function normalizeLink(u: string): string {
  return hrefOf(u.trim());
}

export function instagramHandle(v: string | null | undefined): string {
  if (!v) return "";
  const m = v.match(/instagram\.com\/([^/?#\s]+)/i);
  const h = (m ? m[1] : v).replace(/^@/, "").trim();
  return h ? `@${h}` : "";
}

export function instagramUrl(v: string): string {
  const h = instagramHandle(v).slice(1);
  return h ? `https://instagram.com/${h}` : "";
}

export function phoneDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

export function whatsappUrl(phone: string | null | undefined): string {
  let d = phoneDigits(phone || "");
  if (!d) return "";
  if (d.length === 10 || d.length === 11) d = "55" + d; // número brasileiro sem DDI
  return `https://wa.me/${d}`;
}

export function formatPhone(v: string): string {
  let d = phoneDigits(v);
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v.trim();
}

// Normaliza o valor de um campo do lead antes de salvar.
export function normalizeField(key: LeadKey, v: string): string | number | null {
  const s = v.trim();
  if (!s) return null;
  switch (key) {
    case "instagram":
      return instagramUrl(s) || null;
    case "website":
    case "ad_url":
    case "maps_url":
      return normalizeLink(s);
    case "phone":
      return formatPhone(s);
    case "deal_value": {
      const n = Number(s.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
    default:
      return s;
  }
}

// ---------- classificação de link ----------

const SOCIAL = /(^|\.)(facebook\.com|fb\.com|fb\.me|linktr\.ee|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com|x\.com|twitter\.com)$/i;

export function classifyUrl(raw: string): LeadKey | "other" {
  let u: URL;
  try {
    u = new URL(hrefOf(raw));
  } catch {
    return "other";
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const path = u.pathname.toLowerCase();
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  if (host === "wa.me" || host.endsWith("whatsapp.com")) return "phone";
  if (
    host === "maps.app.goo.gl" ||
    host === "g.page" ||
    host.startsWith("maps.google.") ||
    (host === "goo.gl" && path.startsWith("/maps")) ||
    (/^google\.[a-z.]+$/.test(host) && path.startsWith("/maps"))
  )
    return "maps_url";
  if (
    host.endsWith("googleadservices.com") ||
    host.endsWith("doubleclick.net") ||
    (/^google\.[a-z.]+$/.test(host) && path.startsWith("/aclk")) ||
    u.searchParams.has("gclid") ||
    u.searchParams.has("gad_source")
  )
    return "ad_url";
  if (/^google\.[a-z.]+$/.test(host) || SOCIAL.test(host)) return "other";
  return "website";
}

// ---------- texto colado ----------

const PHONE_RE = /(?:\+?55\s?)?\(?\b\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/;
const HANDLE_RE = /(^|\s)@([a-z0-9._]{2,30})\b/i;
const DOMAIN_RE = /^(?!.*@)[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|br|io|app|site|online|store|shop|med|adv|eng|arq|tur|agr|info|biz)(\.br)?(\/\S*)?$/i;
const AD_WORD = /^(patrocinad[oa]|an[uú]ncio|sponsored|ad)\b/i;

// "Rótulo: valor". O separador é opcional ("site loja.com.br"); link e telefone são validados.
const LABELED: [RegExp, LeadKey | "title"][] = [
  [/^(nome|empresa|cliente|lead)\b(?![./])\s*[:\-–]\s*/i, "title"],
  [/^(whats(app)?|telefone|tel|fone|celular|contato)\b(?!\/)\.?\s*[:\-–]?\s*/i, "phone"],
  [/^(insta(gram)?|ig)\b(?![./])\s*[:\-–]?\s*/i, "instagram"],
  [/^(site|website)\b(?![./])\s*[:\-–]?\s*/i, "website"],
  [/^(an[uú]ncio|ads?)\b(?![./])\s*[:\-–]\s*/i, "ad_url"],
  [/^(maps|google maps|endere[cç]o)\b(?![./])\s*[:\-–]\s*/i, "maps_url"],
  [/^(cidade|local)\b(?![./])\s*[:\-–]?\s*/i, "city"],
  [/^(nicho|segmento|ramo|categoria)\b(?![./])\s*[:\-–]?\s*/i, "niche"],
  [/^(origem|fonte)\b(?![./])\s*[:\-–]\s*/i, "source"],
  [/^(valor|ticket|or[cç]amento)\b(?![./])\s*[:\-–]\s*/i, "deal_value"],
];

function titleFromLinks(d: Partial<LeadFields>): string {
  if (d.instagram) return instagramHandle(d.instagram);
  if (d.website) {
    try {
      return new URL(d.website).hostname.replace(/^www\./, "");
    } catch {
      return d.website;
    }
  }
  return "";
}

export function parseLeadBlock(block: string): LeadDraft {
  const fields: Partial<LeadFields> = {};
  const rest: string[] = [];
  const extraLinks: string[] = [];
  let title = "";
  let adDetected = false;

  const LINKISH = (v: string) => /^(https?:\/\/|www\.)/i.test(v) || DOMAIN_RE.test(v) || URL_RE.test(v);
  const put = (key: LeadKey, v: string, raw = v) => {
    URL_RE.lastIndex = 0;
    if (fields[key] != null) return;
    const bad =
      (["website", "ad_url", "maps_url"].includes(key) && !LINKISH(v)) ||
      (key === "instagram" && !/instagram\.com\//i.test(v) && !/^@?[a-z0-9._]{2,30}$/i.test(v)) ||
      (key === "phone" && phoneDigits(v).length < 8);
    URL_RE.lastIndex = 0;
    if (bad) {
      rest.push(raw);
      return;
    }
    const n = normalizeField(key, v);
    if (n != null) (fields as Record<string, unknown>)[key] = n;
    // Link do anúncio no próprio domínio da empresa: é o site dela também.
    if (key === "ad_url" && fields.website == null && typeof n === "string") {
      try {
        const u = new URL(n);
        if (!/google|doubleclick/i.test(u.hostname)) fields.website = u.origin;
      } catch {}
    }
  };

  for (const rawLine of block.split(/\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const lab = LABELED.find(([re]) => re.test(line));
    if (lab) {
      const value = line.replace(lab[0], "").trim();
      if (lab[1] === "title") title ||= value;
      else if (lab[1] === "maps_url" && !/^https?:|^www\./i.test(value)) rest.push(line);
      else put(lab[1], value, line);
      if (lab[1] === "ad_url") adDetected = true;
      continue;
    }

    if (AD_WORD.test(line)) adDetected = true;

    let leftover = line;
    for (const m of line.matchAll(URL_RE)) {
      const url = m[0].replace(/[.,;:!?]+$/, "");
      const kind = classifyUrl(url);
      if (kind === "phone") {
        const d = phoneDigits(new URL(hrefOf(url)).pathname);
        if (d) put("phone", d);
      } else if (kind === "other") extraLinks.push(hrefOf(url));
      else if (fields[kind] == null) put(kind, url);
      else extraLinks.push(hrefOf(url));
      if (kind === "ad_url") adDetected = true;
      leftover = leftover.replace(m[0], " ");
    }
    leftover = leftover.trim();
    if (!leftover) continue;

    if (DOMAIN_RE.test(leftover)) {
      if (fields.website == null) put("website", leftover);
      continue;
    }
    const h = leftover.match(HANDLE_RE);
    if (h && leftover.replace(h[0], "").trim() === "") {
      put("instagram", h[2]);
      continue;
    }
    const p = leftover.match(PHONE_RE);
    if (p && leftover.replace(p[0], "").replace(/[^\p{L}\d]/gu, "").length < 4) {
      put("phone", p[0]);
      continue;
    }
    if (p && fields.phone == null) put("phone", p[0]);
    if (AD_WORD.test(leftover) && leftover.length < 16) continue; // "Patrocinado", "Anúncio ·"
    if (!title && !AD_WORD.test(leftover) && leftover.length <= 80) {
      const t = leftover.replace(/^[-•*]\s*/, "");
      const head = t.split(/\s[|–-]\s/)[0].trim();
      title = head.length >= 3 ? head : t;
      if (head !== t) rest.push(t);
      continue;
    }
    rest.push(leftover);
  }

  if (!title) title = titleFromLinks(fields) || "Lead sem nome";
  const extra = extraLinks.length ? "\n" + extraLinks.join("\n") : "";
  return { ...fields, title, description: textToHtml(rest.join("\n") + extra), adDetected };
}

// Um lead por bloco (separados por linha em branco), ou tudo como um lead só.
export function parseLeadsText(text: string, single: boolean): LeadDraft[] {
  const blocks = single ? [text] : text.split(/\n\s*\n|\n-{3,}\n/);
  return blocks.map((b) => b.trim()).filter(Boolean).map(parseLeadBlock);
}

// ---------- planilha (CSV) ----------

export function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] || "";
  const counts = [";", ",", "\t"].map((d) => [d, first.split(d).length] as const);
  const delim = counts.sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

type CsvTarget = LeadKey | "title" | "description" | "status" | "due";
const CSV_HEADERS: [CsvTarget, string[]][] = [
  ["title", ["nome", "empresa", "cliente", "lead", "negocio", "razao social", "nome fantasia", "name", "title"]],
  ["phone", ["telefone", "whatsapp", "whats", "celular", "fone", "contato", "phone", "tel"]],
  ["instagram", ["instagram", "insta", "ig", "perfil"]],
  ["website", ["site", "website", "url", "link do site", "pagina"]],
  ["ad_url", ["anuncio", "ads", "google ads", "link do anuncio", "anuncio google"]],
  ["maps_url", ["maps", "google maps", "link maps", "localizacao"]],
  ["city", ["cidade", "municipio", "city", "local"]],
  ["niche", ["nicho", "segmento", "categoria", "ramo", "area", "tipo"]],
  ["source", ["origem", "fonte", "canal"]],
  ["deal_value", ["valor", "ticket", "orcamento", "valor estimado"]],
  ["description", ["observacoes", "observacao", "obs", "notas", "anotacoes", "descricao", "comentarios"]],
  ["status", ["status", "etapa", "fase", "situacao", "coluna"]],
  ["due", ["proximo contato", "follow up", "followup", "retorno", "data retorno", "data", "prazo"]],
];

export function mapCsvHeaders(headers: string[]): (CsvTarget | null)[] {
  const used = new Set<CsvTarget>();
  return headers.map((h) => {
    const n = norm(h);
    const hit =
      CSV_HEADERS.find(([t, names]) => !used.has(t) && names.includes(n)) ||
      CSV_HEADERS.find(([t, names]) => !used.has(t) && names.some((x) => n.includes(x)));
    if (!hit) return null;
    used.add(hit[0]);
    return hit[0];
  });
}

// "25/12/2026", "25/12/2026 14:30", "2026-12-25" → ISO.
export function parseBrDate(v: string): string | null {
  const s = v.trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(y, Number(m[2]) - 1, Number(m[1]), m[4] ? Number(m[4]) : 9, m[5] ? Number(m[5]) : 0);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(s.length > 10 ? s : s + "T09:00:00");
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export function csvToLeads(rows: string[][]): LeadDraft[] {
  const [headers, ...data] = rows;
  if (!headers) return [];
  const map = mapCsvHeaders(headers);
  return data.map((r) => {
    const fields: Partial<LeadFields> = {};
    let title = "";
    let status: string | undefined;
    let due: string | null = null;
    const notes: string[] = [];
    r.forEach((raw, i) => {
      const v = (raw || "").trim();
      if (!v) return;
      const t = map[i];
      if (t === "title") title = v;
      else if (t === "status") status = v;
      else if (t === "due") due = parseBrDate(v);
      else if (t === "description") notes.push(v);
      else if (t === "maps_url" && !/^https?:|^www\./i.test(v)) notes.push(`Endereço: ${v}`);
      else if (t) {
        const n = normalizeField(t, v);
        if (n != null) (fields as Record<string, unknown>)[t] = n;
      } else notes.push(`${headers[i]}: ${v}`);
    });
    return {
      ...fields,
      title: title || titleFromLinks(fields) || "Lead sem nome",
      description: textToHtml(notes.join("\n")),
      adDetected: !!fields.ad_url,
      status,
      due,
    };
  });
}

export function leadsToCsv(rows: Record<string, string | number | null>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // ";" porque é o que o Excel em português abre direto.
  return "﻿" + [headers.join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\n");
}

// ---------- Trello (Menu do quadro → Imprimir, exportar e compartilhar → Exportar como JSON) ----------

const TRELLO_COLORS: Record<string, string> = {
  green: "#5FD08A", yellow: "#FEC212", orange: "#f0a83c", red: "#e5484d", purple: "#a371f7",
  blue: "#4c9aff", sky: "#2dd4bf", lime: "#a3e635", pink: "#e879b9", black: "#172b4d",
};

type TrelloJson = {
  name?: string;
  lists?: { id: string; name: string; closed?: boolean; pos?: number }[];
  cards?: {
    id: string; name: string; desc?: string; idList: string; closed?: boolean; due?: string | null;
    pos?: number; labels?: { name?: string; color?: string | null }[];
  }[];
  checklists?: { idCard: string; name: string; checkItems?: { name: string; state: string; pos?: number }[] }[];
};

export function trelloToLeads(json: unknown): { boardName: string; lists: string[]; leads: LeadDraft[] } {
  const t = json as TrelloJson;
  if (!t || !Array.isArray(t.lists) || !Array.isArray(t.cards)) {
    throw new Error("Esse arquivo não parece um JSON exportado do Trello.");
  }
  const lists = t.lists.filter((l) => !l.closed).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  const listName = new Map(lists.map((l) => [l.id, l.name]));
  const leads = t.cards
    .filter((c) => !c.closed && listName.has(c.idList))
    .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
    .map((c) => {
      const parsed = parseLeadBlock(c.desc || "");
      const { title: _ignored, ...fromDesc } = parsed;
      void _ignored;
      return {
        ...fromDesc,
        title: c.name || "Lead sem nome",
        description: textToHtml(c.desc || ""),
        status: listName.get(c.idList),
        due: c.due || null,
        labels: (c.labels || []).map((l) => ({
          name: l.name || "",
          color: TRELLO_COLORS[(l.color || "").replace(/_(dark|light)$/, "")] || "#8d99ae",
        })),
        checklists: (t.checklists || [])
          .filter((k) => k.idCard === c.id)
          .map((k) => ({
            title: k.name,
            items: (k.checkItems || [])
              .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
              .map((i) => ({ text: i.name, done: i.state === "complete" })),
          })),
      };
    });
  return { boardName: t.name || "Importado do Trello", lists: lists.map((l) => l.name), leads };
}

export function matchList<T extends { id: string; title: string }>(lists: T[], status?: string): T | undefined {
  if (!status) return undefined;
  const s = norm(status);
  return lists.find((l) => norm(l.title) === s) || lists.find((l) => norm(l.title).includes(s) || s.includes(norm(l.title)));
}
