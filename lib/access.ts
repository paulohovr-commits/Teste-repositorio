// O portão: quem pode ENTRAR. O que cada um VÊ depois é decidido pela RLS.
// Checar aqui é aviso, não tranca: a tranca é a tabela acesso_permitido (supabase/f00.sql).
const raw = (process.env.NEXT_PUBLIC_ALLOWED || "")
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);

export const ALLOWED_DOMAINS = raw.filter((x) => !x.includes("@"));
export const ALLOWLIST = raw.filter((x) => x.includes("@"));
export const OWNER_EMAIL = (process.env.NEXT_PUBLIC_OWNER_EMAIL || "").trim().toLowerCase();

export function isAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  // Sem configuração, não bloqueia na tela (o banco continua bloqueando).
  if (!raw.length && !OWNER_EMAIL) return true;
  if (e === OWNER_EMAIL || ALLOWLIST.includes(e)) return true;
  return ALLOWED_DOMAINS.includes(e.split("@")[1] || "");
}
