// /api/usuarios  (só administradores)
//   GET                      → lista os usuários
//   POST   { nome, email, senha, papel } → cadastra um usuário
//   DELETE ?id=<uuid>        → exclui um usuário
import { exigirAdmin } from "./_supabase.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const admin = await exigirAdmin(req, res);
  if (!admin) return; // exigirAdmin já respondeu com o erro
  const { supabase, usuario } = admin;

  try {
    if (req.method === "GET") return await listar(supabase, res);
    if (req.method === "POST") return await cadastrar(supabase, req, res);
    if (req.method === "DELETE") return await excluir(supabase, usuario, req, res);

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ erro: "Método não permitido." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Erro no servidor: " + e.message });
  }
}

async function listar(supabase, res) {
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome, email, papel, criado_em")
    .order("criado_em", { ascending: true });

  if (error) return res.status(500).json({ erro: error.message });
  return res.status(200).json({ usuarios: data });
}

async function cadastrar(supabase, req, res) {
  const corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const nome = String(corpo.nome || "").trim();
  const email = String(corpo.email || "").trim().toLowerCase();
  const senha = String(corpo.senha || "");
  const papel = corpo.papel === "admin" ? "admin" : "comum";

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: "Preencha nome, e-mail e senha." });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: "A senha precisa ter pelo menos 6 caracteres." });
  }

  // Cria o usuário no Supabase Auth já confirmado (não precisa confirmar e-mail).
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error) return res.status(400).json({ erro: error.message });

  // O gatilho do banco já criou o perfil como 'comum'. Aqui gravamos o nome
  // e o papel escolhido (upsert caso o gatilho ainda não exista).
  const { error: erroPerfil } = await supabase
    .from("perfis")
    .upsert({ id: data.user.id, nome, email, papel });
  if (erroPerfil) return res.status(500).json({ erro: erroPerfil.message });

  return res.status(201).json({ usuario: { id: data.user.id, nome, email, papel } });
}

async function excluir(supabase, usuarioLogado, req, res) {
  const id = String(req.query.id || "");
  if (!id) return res.status(400).json({ erro: "Informe o id do usuário." });

  if (id === usuarioLogado.id) {
    return res.status(400).json({ erro: "Você não pode excluir a sua própria conta." });
  }

  // Apagar do Auth também apaga o perfil (on delete cascade na tabela).
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return res.status(400).json({ erro: error.message });

  return res.status(200).json({ ok: true });
}
