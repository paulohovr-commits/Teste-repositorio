-- ============================================================
-- Prospecção · F05: os dados do lead e o arquivar
-- Rode DEPOIS de f00, f01, f02 e f04.
-- ============================================================

-- O lead mora no próprio cartão. A RLS de `cards` (por quadro) já protege tudo.
alter table cards add column if not exists phone      text;     -- WhatsApp / telefone
alter table cards add column if not exists instagram  text;     -- URL do perfil
alter table cards add column if not exists website    text;
alter table cards add column if not exists ad_url     text;     -- link do anúncio
alter table cards add column if not exists maps_url   text;     -- Google Maps
alter table cards add column if not exists city       text;
alter table cards add column if not exists niche      text;
alter table cards add column if not exists source     text;     -- onde achou o lead
alter table cards add column if not exists deal_value numeric;  -- valor estimado do negócio

-- Arquivar é SOFT de propósito (manual, F09): o lead perdido some do quadro,
-- mas o histórico fica. Adiantado para cá porque a Agenda já precisa dele.
alter table cards add column if not exists archived_at timestamptz;
create index if not exists cards_ativos_idx on cards (list_id, position) where archived_at is null;

-- Achar lead repetido ao colar/importar (mesmo Instagram ou mesmo site).
create index if not exists cards_instagram_idx on cards (lower(instagram));
create index if not exists cards_website_idx   on cards (lower(website));
