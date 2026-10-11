// Gravação de leads em lote (colar, planilha, Trello) e o CSV de saída.
import { supabase } from "./supabase";
import { PROSPECT_CHECKLIST } from "./config";
import { LABEL_COLORS } from "./colors";
import { matchList, leadsToCsv, type LeadDraft } from "./leads";
import { stripTags } from "./html";
import { displayName } from "./people";
import type { BoardCard, Label, List, Profile } from "./types";

const lc = (s?: string | null) =>
  (s || "").trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");

// Lead repetido = mesmo Instagram ou mesmo site de um lead que já está no quadro.
export function findDuplicate(d: LeadDraft, existing: Pick<BoardCard, "id" | "title" | "instagram" | "website">[]) {
  return existing.find(
    (c) => (d.instagram && lc(c.instagram) === lc(d.instagram)) || (d.website && lc(c.website) === lc(d.website)),
  );
}

type Opts = {
  boardId: string;
  meId: string;
  lists: List[];
  labels: Label[];
  existing: BoardCard[];
  defaultListId: string;
  checklist: boolean;
  autoLabels: boolean;
  skipDuplicates: boolean;
};

export async function insertLeads(drafts: LeadDraft[], o: Opts): Promise<{ created: number; skipped: number }> {
  let skipped = 0;
  const todo: LeadDraft[] = [];
  const seen = o.existing.slice();
  for (const d of drafts) {
    if (o.skipDuplicates && findDuplicate(d, seen)) {
      skipped++;
      continue;
    }
    todo.push(d);
    seen.push({ id: "", title: d.title, instagram: d.instagram ?? null, website: d.website ?? null } as BoardCard);
  }
  if (!todo.length) return { created: 0, skipped };

  // Etiquetas: as do Trello são criadas se não existirem no quadro.
  const labels = o.labels.slice();
  const labelByName = (n: string) => labels.find((l) => lc(l.name) === lc(n));
  const missing = new Map<string, string>();
  for (const d of todo) for (const l of d.labels || []) if (l.name && !labelByName(l.name)) missing.set(lc(l.name), l.name);
  if (missing.size) {
    const rows = Array.from(missing.values()).map((name, i) => ({
      board_id: o.boardId,
      name,
      color: todo.flatMap((d) => d.labels || []).find((l) => l.name === name)?.color || LABEL_COLORS[i % LABEL_COLORS.length],
      position: labels.length + i,
    }));
    const { data } = await supabase.from("labels").insert(rows).select();
    labels.push(...((data as Label[]) || []));
  }

  // Posição: cada lead entra no fim da etapa de destino.
  const nextPos = new Map<string, number>();
  for (const l of o.lists) {
    const ps = o.existing.filter((c) => c.list_id === l.id).map((c) => c.position);
    nextPos.set(l.id, ps.length ? Math.max(...ps) + 1 : 0);
  }

  const rows = todo.map((d) => {
    const listId = matchList(o.lists, d.status)?.id || o.defaultListId;
    const position = nextPos.get(listId) ?? 0;
    nextPos.set(listId, position + 1);
    return {
      list_id: listId,
      position,
      title: d.title.slice(0, 300),
      description: d.description || "",
      due: d.due || null,
      phone: d.phone ?? null,
      instagram: d.instagram ?? null,
      website: d.website ?? null,
      ad_url: d.ad_url ?? null,
      maps_url: d.maps_url ?? null,
      city: d.city ?? null,
      niche: d.niche ?? null,
      source: d.source ?? null,
      deal_value: d.deal_value ?? null,
    };
  });

  let created = 0;
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const part = todo.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("cards").insert(rows.slice(i, i + CHUNK)).select("id");
    if (error) throw error;
    const ids = (data || []).map((r) => r.id as string);
    created += ids.length;

    // Quem cria o lead vira responsável dele (regra 3 do manual).
    await supabase.from("card_members").insert(ids.map((card_id) => ({ card_id, user_id: o.meId })));

    const cl: { card_id: string; label_id: string }[] = [];
    ids.forEach((card_id, k) => {
      const d = part[k];
      const names = new Set((d.labels || []).map((l) => lc(l.name)).filter(Boolean));
      if (o.autoLabels) {
        if (d.adDetected) names.add("anuncia no google");
        if (!d.website) names.add("sem site");
      }
      for (const n of names) {
        const lb = labelByName(n);
        if (lb) cl.push({ card_id, label_id: lb.id });
      }
    });
    if (cl.length) await supabase.from("card_labels").insert(cl);

    const checks: { card_id: string; title: string; position: number; items: { text: string; done: boolean }[] }[] = [];
    ids.forEach((card_id, k) => {
      const lists = part[k].checklists?.length
        ? part[k].checklists!
        : o.checklist
          ? [{ title: PROSPECT_CHECKLIST.title, items: PROSPECT_CHECKLIST.items.map((text) => ({ text, done: false })) }]
          : [];
      lists.forEach((c, position) => checks.push({ card_id, title: c.title, position, items: c.items }));
    });
    if (checks.length) {
      const { data: cks } = await supabase
        .from("checklists")
        .insert(checks.map(({ card_id, title, position }) => ({ card_id, title, position })))
        .select("id");
      const items = (cks || []).flatMap((ck, k) =>
        checks[k].items.map((it, position) => ({ checklist_id: ck.id, text: it.text, done: it.done, position })),
      );
      if (items.length) await supabase.from("checklist_items").insert(items);
    }
  }
  return { created, skipped };
}

export function downloadCsv(filename: string, cards: BoardCard[], lists: List[], labels: Label[], people: Profile[]) {
  const listTitle = new Map(lists.map((l) => [l.id, l.title]));
  const order = new Map(lists.map((l, i) => [l.id, i]));
  const rows = cards
    .slice()
    .sort((a, b) => (order.get(a.list_id)! - order.get(b.list_id)!) || a.position - b.position)
    .map((c) => ({
      Nome: c.title,
      Etapa: listTitle.get(c.list_id) || "",
      "WhatsApp/Telefone": c.phone,
      Instagram: c.instagram,
      Site: c.website,
      Anúncio: c.ad_url,
      "Google Maps": c.maps_url,
      Cidade: c.city,
      Nicho: c.niche,
      Origem: c.source,
      "Valor estimado": c.deal_value,
      "Próximo contato": c.due ? new Date(c.due).toLocaleString("pt-BR") : "",
      Etiquetas: c.card_labels.map((x) => labels.find((l) => l.id === x.label_id)?.name).filter(Boolean).join(", "),
      Responsáveis: c.card_members.map((x) => displayName(people.find((p) => p.id === x.user_id))).join(", "),
      Observações: stripTags(c.description || ""),
      "Criado em": new Date(c.created_at).toLocaleDateString("pt-BR"),
    }));
  const blob = new Blob([leadsToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
