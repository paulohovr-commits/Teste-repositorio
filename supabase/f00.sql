-- ============================================================
-- Prospecção · F00: perfis, o dono e a porta de entrada
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  name text default '',
  is_owner boolean default false,
  role text,                          -- a cadeira/área da pessoa (usada no painel)
  created_at timestamptz default now()
);
alter table profiles enable row level security;

-- Quem é o dono, sem consultar profiles dentro da policy de profiles (recursão).
create or replace function public.current_is_owner() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_owner from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "profiles: a equipe lê" on profiles;
create policy "profiles: a equipe lê" on profiles for select to authenticated using (true);
drop policy if exists "profiles: eu edito o meu" on profiles;
create policy "profiles: eu edito o meu" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles: o dono edita qualquer um" on profiles;
create policy "profiles: o dono edita qualquer um" on profiles for update to authenticated
  using (public.current_is_owner()) with check (public.current_is_owner());

-- Perfil nasce junto com a conta, com o nome que vem do Google.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, is_owner)
  values (
    new.id, new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''),
             nullif(new.raw_user_meta_data->>'name',''),
             new.email),
    lower(new.email) = 'seu.email@gmail.com'        -- TROQUE AQUI (o seu e-mail, em minúsculas)
  )
  on conflict (id) do update
    set email = excluded.email,
        -- só sobrescreve o nome se o atual ainda era o e-mail (placeholder)
        name = case when public.profiles.name is null or public.profiles.name = public.profiles.email
                    then excluded.name else public.profiles.name end;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- A PORTA, no banco ----------
-- Checar domínio no navegador é aviso, não tranca: a chave anônima está no
-- JavaScript público, e quem completa o login vira `authenticated` de verdade.
create table if not exists acesso_permitido (
  valor text primary key,                       -- um domínio ou um e-mail inteiro
  tipo text not null check (tipo in ('dominio','email')),
  nota text,
  criado_em timestamptz default now()
);
insert into acesso_permitido (valor, tipo, nota)
  values ('seu.email@gmail.com', 'email', 'Dono')   -- TROQUE AQUI (o mesmo e-mail de cima)
  -- Time com e-mail da empresa? Libere o domínio inteiro também:
  -- ('suaempresa.com.br', 'dominio', 'Workspace da empresa')
  on conflict (valor) do nothing;
alter table acesso_permitido enable row level security;
drop policy if exists "acesso_permitido: só o dono" on acesso_permitido;
create policy "acesso_permitido: só o dono" on acesso_permitido for all to authenticated
  using (public.current_is_owner()) with check (public.current_is_owner());

create or replace function public.barrar_login_de_fora() returns trigger
language plpgsql security definer set search_path = public as $$
declare e text; dominio text;
begin
  e := lower(trim(new.email));
  dominio := split_part(e, '@', 2);
  if exists (select 1 from acesso_permitido where tipo='email'   and lower(valor) = e)
  or exists (select 1 from acesso_permitido where tipo='dominio' and lower(valor) = dominio)
  then return new; end if;
  raise exception 'Conta de fora da empresa.';
end $$;

drop trigger if exists trg_barrar_login on auth.users;
create trigger trg_barrar_login before insert on auth.users
  for each row execute function public.barrar_login_de_fora();
