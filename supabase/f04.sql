-- ============================================================
-- Prospecção · F04: comentários, menções e caixa de entrada
-- ============================================================

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards on delete cascade,
  author_id uuid references profiles on delete set null,
  body text default '',
  created_at timestamptz default now()
);
create table if not exists comment_mentions (
  comment_id uuid references comments on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (comment_id, user_id)
);
create table if not exists card_followers (
  card_id uuid references cards on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (card_id, user_id)
);
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,     -- destinatário
  actor_id uuid references profiles on delete set null,   -- quem gerou
  type text not null,                                     -- mention | comment | assigned
  board_id uuid references boards on delete cascade,
  card_id uuid references cards on delete cascade,
  comment_id uuid references comments on delete cascade,
  body text,
  created_at timestamptz default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on notifications (user_id, read_at, created_at desc);

alter table comments         enable row level security;
alter table comment_mentions enable row level security;
alter table card_followers   enable row level security;
alter table notifications    enable row level security;

create policy "comments: leio do quadro" on comments for select to authenticated
  using (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id where c.id=card_id)));
create policy "comments: comento como eu" on comments for insert to authenticated
  with check (author_id = auth.uid()
    and has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id where c.id=card_id)));
create policy "comments: só o autor apaga" on comments for delete to authenticated
  using (author_id = auth.uid());

create policy "menções do quadro" on comment_mentions for all to authenticated
  using (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id
                            join comments cm on cm.card_id=c.id where cm.id=comment_id)))
  with check (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id
                            join comments cm on cm.card_id=c.id where cm.id=comment_id)));

create policy "seguidores do quadro" on card_followers for all to authenticated
  using (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id where c.id=card_id)))
  with check (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id where c.id=card_id)));

create policy "notif: só as minhas (select)" on notifications for select to authenticated using (user_id = auth.uid());
create policy "notif: só as minhas (update)" on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif: só as minhas (delete)" on notifications for delete to authenticated using (user_id = auth.uid());

-- Menção cria notificação para o mencionado, nunca para quem escreveu.
create or replace function public.notify_on_mention() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_card uuid; v_actor uuid; v_body text; v_board uuid;
begin
  select c.card_id, c.author_id, c.body into v_card, v_actor, v_body from comments c where c.id = new.comment_id;
  select l.board_id into v_board from cards cd join lists l on l.id = cd.list_id where cd.id = v_card;
  if new.user_id is distinct from v_actor then
    insert into notifications (user_id, actor_id, type, board_id, card_id, comment_id, body)
    values (new.user_id, v_actor, 'mention', v_board, v_card, new.comment_id, v_body);
  end if;
  return new;
end $$;
drop trigger if exists on_mention_created on comment_mentions;
create trigger on_mention_created after insert on comment_mentions
  for each row execute function public.notify_on_mention();

-- Comentário novo avisa quem segue o cartão, menos o autor.
create or replace function public.notify_followers_on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_board uuid; f record;
begin
  select l.board_id into v_board from cards cd join lists l on l.id = cd.list_id where cd.id = new.card_id;
  for f in select user_id from card_followers
            where card_id = new.card_id and user_id is distinct from new.author_id loop
    insert into notifications (user_id, actor_id, type, board_id, card_id, comment_id, body)
    values (f.user_id, new.author_id, 'comment', v_board, new.card_id, new.id, new.body);
  end loop;
  return new;
end $$;
drop trigger if exists on_comment_notify_followers on comments;
create trigger on_comment_notify_followers after insert on comments
  for each row execute function public.notify_followers_on_comment();

do $$ begin
  begin alter publication supabase_realtime add table comments;       exception when others then null; end;
  begin alter publication supabase_realtime add table card_followers; exception when others then null; end;
  begin alter publication supabase_realtime add table notifications;  exception when others then null; end;
end $$;
