// Descrição: HTML saneado. Comentários: texto puro com links.

// Também pega link colado sem "https://" dos sites que mais aparecem na prospecção.
export const URL_RE = /\b(?:https?:\/\/|www\.|(?:wa\.me|instagram\.com|maps\.app\.goo\.gl|g\.page)\/)[^\s<>"']+/gi;

// Pontuação final não faz parte da URL. (")" ficou de fora de propósito:
// URL entre parênteses pode levar o ")" junto. Limitação conhecida e aceita.)
function trimUrl(u: string): string {
  return u.replace(/[.,;:!?]+$/, "");
}

export function hrefOf(u: string): string {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Texto puro → pedaços de texto e de link (para o React desenhar, escapando sozinho).
export type Piece = { text: string; href?: string };
export function splitLinks(text: string): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const url = trimUrl(m[0]);
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i) });
    out.push({ text: url, href: hrefOf(url) });
    last = i + url.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

// Texto puro → HTML de parágrafos (para a descrição de lead importado).
export function textToHtml(text: string): string {
  return text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p>${escapeHtml(l)}</p>`)
    .join("");
}

const ALLOWED = new Set(["P", "BR", "B", "STRONG", "I", "EM", "S", "U", "H3", "UL", "OL", "LI", "A", "SPAN", "DIV"]);
const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "NOSCRIPT", "SVG", "MATH"]);
const SAFE_HREF = /^(https?:|mailto:|tel:)/i;

function cleanTree(el: Element) {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const child = node as Element;
    if (DROP.has(child.tagName)) {
      child.remove();
      continue;
    }
    cleanTree(child);
    if (!ALLOWED.has(child.tagName)) {
      child.replaceWith(...Array.from(child.childNodes));
      continue;
    }
    for (const a of Array.from(child.attributes)) {
      if (child.tagName === "A" && a.name === "href" && SAFE_HREF.test(a.value.trim())) continue;
      child.removeAttribute(a.name);
    }
    if (child.tagName === "A") {
      child.setAttribute("target", "_blank");
      child.setAttribute("rel", "noreferrer");
    }
  }
}

// URL solta vira <a>. Rodar SÓ ao semear o editor e ao salvar, nunca durante a digitação.
export function linkifyElement(root: Element) {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) {
    const t = walker.currentNode as Text;
    if (!t.parentElement?.closest("a")) texts.push(t);
  }
  for (const t of texts) {
    const pieces = splitLinks(t.data);
    if (!pieces.some((p) => p.href)) continue;
    const frag = doc.createDocumentFragment();
    for (const p of pieces) {
      if (!p.href) {
        frag.append(doc.createTextNode(p.text));
        continue;
      }
      const a = doc.createElement("a");
      a.href = p.href;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.textContent = p.text;
      frag.append(a);
    }
    t.replaceWith(frag);
  }
}

export function linkifyHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild!;
  linkifyElement(root);
  return root.innerHTML;
}

// Lista branca de tags, nenhum atributo (só href seguro de <a>), linkifica, tira <li> e lista vazios.
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild!;
  cleanTree(root);
  linkifyElement(root);
  root.querySelectorAll("li").forEach((li) => {
    if (!li.textContent?.trim()) li.remove();
  });
  root.querySelectorAll("ul,ol").forEach((l) => {
    if (!l.querySelector("li")) l.remove();
  });
  const out = root.innerHTML.trim();
  return out === "<p><br></p>" || out === "<br>" ? "" : out;
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// URLs de dentro de um HTML: href de <a> e URLs do texto.
export function urlsInHtml(html: string): string[] {
  const set = new Set<string>();
  for (const m of html.matchAll(/href="([^"]+)"/g)) set.add(m[1].replace(/&amp;/g, "&"));
  for (const m of stripTags(html).matchAll(URL_RE)) set.add(hrefOf(trimUrl(m[0])));
  return Array.from(set);
}
