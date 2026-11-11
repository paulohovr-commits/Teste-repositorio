// Funções de apoio usadas pelas rotas da pasta api/.
// Arquivos que começam com "_" NÃO viram rotas na Vercel.
import { createClient } from "@supabase/supabase-js";

// Cliente com a chave SECRETA (service_role). Ele ignora o RLS, então só
// pode existir aqui no servidor. Nunca coloque essa chave no navegador.
export function clienteAdmin() {
  const url = process.env.SUPABASE_URL;
  const chaveSecreta = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chaveSecreta) {
    throw new Error(
      "Faltam as variáveis SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY na Vercel."
    );
  }
  return createClient(url, chaveSecreta, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Confere quem está chamando a rota (pelo token enviado no cabeçalho
// Authorization) e se essa pessoa é administradora.
// Devolve { supabase, usuario } se for admin; senão responde o erro e devolve null.
export async function exigirAdmin(req, res) {
  let supabase;
  try {
    supabase = clienteAdmin();
  } catch (e) {
    res.status(500).json({ erro: e.message });
    return null;
  }

  const cabecalho = req.headers.authorization || "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : null;
  if (!token) {
    res.status(401).json({ erro: "Você precisa estar logado." });
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ erro: "Sessão inválida. Entre de novo." });
    return null;
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", data.user.id)
    .single();

  if (perfil?.papel !== "admin") {
    res.status(403).json({ erro: "Só administradores podem fazer isso." });
    return null;
  }

  return { supabase, usuario: data.user };
}
