"use client";

import { useEffect, useRef } from "react";
import { dueBucket } from "@/lib/dates";
import { stripTags } from "@/lib/html";
import { displayName } from "@/lib/people";
import type { BoardCard, Label, Profile } from "@/lib/types";
import Avatar from "../../Avatar";

type DueF = "late" | "today" | "week" | "none";
export type Filters = { q: string; members: string[]; labels: string[]; due: DueF[] };
export const emptyFilters: Filters = { q: "", members: [], labels: [], due: [] };

export function activeCount(f: Filters): number {
  return (f.q.trim() ? 1 : 0) + f.members.length + f.labels.length + f.due.length;
}

// OU dentro da categoria, E entre categorias.
export function matches(c: BoardCard, f: Filters): boolean {
  const q = f.q.trim().toLowerCase();
  if (q) {
    const hay = [c.title, stripTags(c.description || ""), c.city, c.niche, c.instagram, c.website, c.phone, c.source]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.members.length) {
    const ids = c.card_members.map((m) => m.user_id);
    const ok = f.members.some((m) => (m === "none" ? ids.length === 0 : ids.includes(m)));
    if (!ok) return false;
  }
  if (f.labels.length && !c.card_labels.some((l) => f.labels.includes(l.label_id))) return false;
  if (f.due.length) {
    const b = dueBucket(c.due);
    const ok = f.due.some((d) =>
      d === "late" ? b === "late" : d === "today" ? b === "today" : d === "week" ? b === "today" || b === "week" : b === "none",
    );
    if (!ok) return false;
  }
  return true;
}

const DUE_OPTS: { v: DueF; label: string }[] = [
  { v: "late", label: "Contato atrasado" },
  { v: "today", label: "Contatar hoje" },
  { v: "week", label: "Próximos 7 dias" },
  { v: "none", label: "Sem próximo contato" },
];

export default function FilterPanel({
  filters,
  setFilters,
  labels,
  people,
  onClose,
  onClear,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  labels: Label[];
  people: Profile[];
  onClose: () => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Fecha ao clicar fora.
    function onDown(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(t) && !t.closest(".pop-anchor > .btn")) onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const toggle = <K extends "members" | "labels" | "due">(k: K, v: Filters[K][number]) => {
    const arr = filters[k] as string[];
    setFilters({ ...filters, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] });
  };

  return (
    <div className="popover filter-panel" ref={ref}>
      <div className="fp-head">
        <strong>Filtrar leads</strong>
        {activeCount(filters) > 0 && (
          <button className="link" onClick={onClear}>
            ✕ Limpar filtros
          </button>
        )}
      </div>
      <input
        className="input"
        autoFocus
        placeholder="Buscar nome, cidade, nicho, @instagram, site…"
        value={filters.q}
        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
      />
      <h4>Responsável</h4>
      {people.map((p) => (
        <label key={p.id} className="fp-row">
          <input type="checkbox" checked={filters.members.includes(p.id)} onChange={() => toggle("members", p.id)} />
          <Avatar p={p} /> {displayName(p)}
        </label>
      ))}
      <label className="fp-row">
        <input type="checkbox" checked={filters.members.includes("none")} onChange={() => toggle("members", "none")} />
        Sem responsável
      </label>
      <h4>Etiquetas</h4>
      {labels.map((l) => (
        <label key={l.id} className="fp-row">
          <input type="checkbox" checked={filters.labels.includes(l.id)} onChange={() => toggle("labels", l.id)} />
          <span className="label-chip" style={{ background: l.color }}>
            {l.name || " "}
          </span>
        </label>
      ))}
      <h4>Próximo contato</h4>
      {DUE_OPTS.map((o) => (
        <label key={o.v} className="fp-row">
          <input type="checkbox" checked={filters.due.includes(o.v)} onChange={() => toggle("due", o.v)} />
          {o.label}
        </label>
      ))}
    </div>
  );
}
