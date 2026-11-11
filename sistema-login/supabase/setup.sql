-- =====================================================================
-- Mini sistema de login: rode este arquivo inteiro UMA vez no
-- Supabase → SQL Editor → New query → cole tudo → Run.
-- =====================================================================

-- 1) Tabela de perfis: cada usuário do Supabase Auth ganha uma linha aqui
--    dizendo o nome dele e o nível de acesso (papel).
create table if not exists public.perfis (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null default '',
  email      text not null,
  papel      text not null default 'comum' check (papel in ('admin', 'comum')),
  criado_em  timestamptz not null default now()
);

-- 2) Segurança (RLS): pelo navegador, cada pessoa só consegue LER o próprio
--    perfil. Ninguém consegue alterar o papel pelo navegador.
--    Listar, cadastrar e excluir usuários é feito pelas funções da pasta
--    api/ na Vercel, que usam a chave secreta e conferem se quem pediu é admin.
alter table public.perfis enable row level security;

drop policy if exists "ler o proprio perfil" on public.perfis;
create policy "ler o proprio perfil"
  on public.perfis for select
  to authenticated
  using (id = auth.uid());

-- 3) Gatilho: sempre que um usuário é criado no Auth (pela tela de admin ou
--    pelo painel do Supabase), cria o perfil dele automaticamente como 'comum'.
--    O papel 'admin' só é dado depois, pelo servidor ou pelo SQL abaixo.
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, email, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
    'comum'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- 4) Cria o perfil de quem já existia no Auth antes deste script.
insert into public.perfis (id, nome, email, papel)
select u.id, coalesce(u.raw_user_meta_data ->> 'nome', ''), u.email, 'comum'
from auth.users u
on conflict (id) do nothing;


-- =====================================================================
-- PRIMEIRO ADMINISTRADOR (rode depois de criar o seu usuário)
--
-- a) Supabase → Authentication → Users → "Add user" → "Create new user"
--    coloque seu e-mail e uma senha e marque "Auto Confirm User".
-- b) Troque o e-mail abaixo pelo seu e rode só esta linha:
--
-- update public.perfis set papel = 'admin', nome = 'Administrador'
-- where email = 'seu.email@exemplo.com';  -- TROQUE AQUI
-- =====================================================================
