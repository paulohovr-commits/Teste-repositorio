// datetime-local trabalha em horário local; o banco guarda timestamptz.
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function localInputToIso(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

// Data sem hora salva ao MEIO-DIA, senão aparece um dia antes em outro fuso.
export function dateOnlyToIso(v: string): string | null {
  return v ? new Date(v + "T12:00:00").toISOString() : null;
}
export function isoToDateOnly(iso: string | null): string {
  return isoToLocalInput(iso).slice(0, 10);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export type DueBucket = "late" | "today" | "week" | "later" | "none";

export function dueBucket(iso: string | null, now = new Date()): DueBucket {
  if (!iso) return "none";
  const d = new Date(iso);
  if (d < now) return "late";
  const today = startOfDay(now).getTime();
  const day = startOfDay(d).getTime();
  if (day === today) return "today";
  if (day - today <= 7 * 86400000) return "week";
  return "later";
}

export function fmtDue(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

export function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}
