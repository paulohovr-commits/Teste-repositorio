// Código compartilhado pelas 3 telas (login, admin e usuário comum).
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm";

let _supabase = null;

// Busca a URL e a chave pública em /api/config e cria o cliente do Supabase.
export async function getSupabase() {
  if (_supabase) return _supabase;
  const resp = await fetch("/api/config");
  const cfg = await resp.json();
  if (!resp.ok) throw new Error(cfg.erro || "Não consegui carregar a configuração.");
  _supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  return _supabase;
}

// Lê o perfil (nome e papel) de quem está logado.
export async function meuPerfil() {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: perfil, error } = await supabase
    .from("perfis")
    .select("id, nome, email, papel")
    .eq("id", session.user.id)
    .single();

  if (error || !perfil) return { session, perfil: null };
  return { session, perfil };
}

// Manda cada nível de usuário para a sua tela.
export function telaDoPapel(papel) {
  return papel === "admin" ? "/admin.html" : "/usuario.html";
}

// Protege uma página: se não estiver logado volta para o login;
// se o papel não for o esperado, manda para a tela certa.
export async function protegerPagina(papelExigido) {
  const info = await meuPerfil();
  if (!info || !info.perfil) {
    if (info) await sair(); // logado mas sem perfil: sai para não ficar preso
    location.replace("/");
    return null;
  }
  if (papelExigido && info.perfil.papel !== papelExigido) {
    location.replace(telaDoPapel(info.perfil.papel));
    return null;
  }
  return info;
}

export async function sair() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  location.replace("/");
}

// Chama as rotas /api/... enviando o token de quem está logado.
export async function chamarApi(caminho, opcoes = {}) {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch(caminho, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
      ...(opcoes.headers || {}),
    },
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || `Erro ${resp.status}`);
  return dados;
}

export function mostrarMensagem(el, texto, tipo = "erro") {
  el.textContent = texto;
  el.className = `mensagem ${tipo}`;
  el.hidden = !texto;
}
