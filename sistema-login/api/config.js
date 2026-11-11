// GET /api/config
// Entrega para o navegador a URL do Supabase e a chave PÚBLICA (anon).
// Essas duas podem ficar públicas: quem protege os dados é o RLS.
// Assim você não precisa escrever as chaves dentro do código.
export default function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      erro: "Configure SUPABASE_URL e SUPABASE_ANON_KEY nas variáveis de ambiente da Vercel.",
    });
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ supabaseUrl, supabaseAnonKey });
}
