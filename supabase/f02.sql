-- ============================================================
-- Prospecção · F02: etiquetas, responsáveis, datas, checklist
-- ============================================================

alter table cards add column if not exists description text default '';
alter table cards add column if not exists due timestamptz;
alter table cards add column if not exists start_date timestamptz;

create table if not exists labels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards on delete cascade,
  name text default '',
  color text not null,
  position int default 0
);
create table if not exists card_labels (
  card_id uuid references cards on delete cascade,
  label_id uuid references labels on delete cascade,
  primary key (card_id, label_id)
);
create table if not exists checklists (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards on delete cascade,
  title text default 'Checklist',
  position int default 0
);
create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid references checklists on delete cascade,
  text text default '',
  done boolean default false,
  position int default 0
);

alter table labels          enable row level security;
alter table card_labels     enable row level security;
alter table checklists      enable row level security;
alter table checklist_items enable row level security;

create policy "labels do quadro" on labels for all to authenticated
  using (has_board_access(board_id)) with check (has_board_access(board_id));

create policy "card_labels do quadro" on card_labels for all to authenticated
  using (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id where c.id=card_id)))
  with check (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id where c.id=card_id)));

create policy "checklists do quadro" on checklists for all to authenticated
  using (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id where c.id=card_id)))
  with check (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id where c.id=card_id)));

create policy "itens do quadro" on checklist_items for all to authenticated
  using (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id
                            join checklists ck on ck.card_id=c.id where ck.id=checklist_id)))
  with check (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id
                            join checklists ck on ck.card_id=c.id where ck.id=checklist_id)));

do $$ begin
  begin alter publication supabase_realtime add table labels;          exception when others then null; end;
  begin alter publication supabase_realtime add table card_labels;     exception when others then null; end;
  begin alter publication supabase_realtime add table checklists;      exception when others then null; end;
  begin alter publication supabase_realtime add table checklist_items; exception when others then null; end;
end $$;
