import type { Profile } from "./types";

type P = Pick<Profile, "name" | "email"> | null | undefined;

// Nome de exibição: o nome real, ou a parte antes do @.
export function displayName(p: P): string {
  if (!p) return "Alguém";
  const n = (p.name || "").trim();
  if (n && n !== p.email) return n;
  return (p.email || "").split("@")[0] || "Alguém";
}

// A sigla do avatar, num lugar só. "Ana Paula" → AP; "Ana" → AN; sem nome → e-mail.
export function initials(p: P): string {
  const n = displayName(p).trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase() || "?";
}

// O "handle" das menções: o nome real (sem espaços duplicados) ou o usuário do e-mail.
export function handle(p: P): string {
  return displayName(p).replace(/\s+/g, " ");
}
