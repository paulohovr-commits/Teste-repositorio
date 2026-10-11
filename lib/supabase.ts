import { createClient } from "@supabase/supabase-js";

// A chave anônima é pública e segura: quem protege os dados é a RLS.
// Os placeholders só evitam quebrar o build enquanto o .env.local está vazio.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
