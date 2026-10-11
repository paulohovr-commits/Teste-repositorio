-- ============================================================
-- Prospecção · F01: o quadro
-- ============================================================

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references profiles on delete cascade,
  created_at timestamptz default now()
);
create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards on delete cascade,
  title text not null default 'Nova coluna',
  position int default 0
);
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists on delete cascade,
  title text not null,
  position int default 0,
  created_at timestamptz default now()
);
-- Membros do quadro. Na Fase 7 o acesso muda de casa (e-mail e time); esta
-- tabela é o degrau simples para o quadro já funcionar hoje.
create table if not exists board_members (
  board_id uuid references boards on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (board_id, user_id)
);
-- Responsáveis da tarefa. Nasce aqui porque quem cria a tarefa já entra como
-- responsável dela, e isso vale desde o primeiro dia.
create table if not exists card_members (
  card_id uuid references cards on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (card_id, user_id)
);

-- A função que TODA policy de dentro do quadro vai consultar.
create or replace function public.has_board_access(b uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from boards where id = b and owner_id = auth.uid())
      or exists (select 1 from board_members m where m.board_id = b and m.user_id = auth.uid());
$$;

alter table boards        enable row level security;
alter table lists         enable row level security;
alter table cards         enable row level security;
alter table board_members enable row level security;
alter table card_members  enable row level security;

create policy "boards: quem tem acesso lê" on boards for select to authenticated
  using (has_board_access(id));
create policy "boards: só o dono cria" on boards for insert to authenticated
  with check (public.current_is_owner() and owner_id = auth.uid());
create policy "boards: o dono edita" on boards for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "boards: o dono exclui" on boards for delete to authenticated
  using (owner_id = auth.uid());

create policy "lists: do quadro com acesso" on lists for all to authenticated
  using (has_board_access(board_id)) with check (has_board_access(board_id));

create policy "cards: do quadro com acesso" on cards for all to authenticated
  using (has_board_access((select l.board_id from lists l where l.id = list_id)))
  with check (has_board_access((select l.board_id from lists l where l.id = list_id)));

create policy "board_members: o dono gerencia" on board_members for all to authenticated
  using (public.current_is_owner()) with check (public.current_is_owner());
-- Quem tem acesso ao quadro LÊ quem mais tem acesso a ele. Sem isso, o popover
-- de Responsáveis mostra só você (a "segunda lição mais cara" do manual).
create policy "board_members: quem tem acesso lê" on board_members for select to authenticated
  using (public.has_board_access(board_id) or public.current_is_owner());

create policy "card_members: do quadro com acesso" on card_members for all to authenticated
  using (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id where c.id=card_id)))
  with check (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id where c.id=card_id)));

do $$ begin
  begin alter publication supabase_realtime add table boards;       exception when others then null; end;
  begin alter publication supabase_realtime add table lists;        exception when others then null; end;
  begin alter publication supabase_realtime add table cards;        exception when others then null; end;
  begin alter publication supabase_realtime add table card_members; exception when others then null; end;
end $$;
