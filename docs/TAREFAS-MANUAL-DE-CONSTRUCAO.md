# TAREFAS: manual de construção

**O que é este arquivo:** a especificação completa de um software de tarefas (Kanban interno de equipe) que já está rodando em produção com um time de 15 pessoas usando todo dia. Não é uma ideia nem um rascunho: é o que sobrou depois de meses de uso real, com os bugs já pagos e as decisões já tomadas.

**Para que serve:** você entrega este arquivo ao seu Claude Code e ele constrói o software inteiro com você, fase por fase.

**O que NÃO tem aqui:** nenhuma integração com sistema de terceiro, nenhuma regra de negócio de outra empresa. É só o Tarefas, isolado, pronto para virar o seu.

---

## 0. COMO USAR ESTE DOCUMENTO

### Passo 1: crie a pasta do projeto

```bash
mkdir ~/tarefas && cd ~/tarefas
```

Copie este arquivo para dentro dela com o nome `TAREFAS-MANUAL-DE-CONSTRUCAO.md`.

### Passo 2: abra o Claude Code nessa pasta e cole este prompt

```
Leia o arquivo TAREFAS-MANUAL-DE-CONSTRUCAO.md por inteiro antes de escrever
qualquer linha de código.

Ele é a especificação de um software de tarefas que eu quero construir do zero.
Vamos seguir as fases na ordem, uma por vez. Nunca pule para a fase seguinte
sem eu confirmar que a anterior passou no critério de aceite.

Antes de começar a Fase 0, me pergunte as 4 decisões da seção "Decisões que
são suas" e espere minha resposta.

Em toda fase que tiver SQL: me entregue o SQL colado aqui no chat, eu rodo no
Supabase, eu confirmo, e só depois você escreve o código que depende dele.
Nunca escreva um select que nomeia coluna nova antes de a migração estar rodada.

Comece lendo o documento e me dizendo, em 10 linhas, o que você entendeu que
vamos construir.
```

### Passo 3: vá fase por fase

São 11 fases. As 5 primeiras já entregam um software usável. As outras 6 são o que transforma ele em ferramenta de time de verdade.

Não peça "constrói tudo". Software que nasce de uma tacada só nasce sem ninguém entendendo, e você vai precisar entender para consertar.

### Decisões que são suas

Antes da Fase 0, defina:

1. **O nome do app.** Aparece no cabeçalho, no logo e no assunto dos e-mails. Aqui eu chamo de **Tarefas**.
2. **O domínio de e-mail da sua empresa.** É o portão: só entra quem tem e-mail desse domínio. Aqui eu uso `suaempresa.com.br` como marcador.
3. **O e-mail do dono.** A pessoa que cria quadros, vê o tempo trabalhado e gerencia acessos. Aqui: `voce@suaempresa.com.br`.
4. **Onde vai rodar.** Vercel é o caminho de menor atrito (o deploy sai de graça e o cron vem junto).

Esses três textos aparecem em lugares específicos do SQL e do código. Cada aparição está marcada com `TROQUE AQUI`.

---

## 1. O QUE VOCÊ VAI CONSTRUIR

Um Kanban de equipe, privado, com:

**No quadro**
- Quadros (boards) que nascem privados, com colunas e cartões
- Arrastar cartão entre colunas e reordenar colunas, com o cartão fantasma seguindo o cursor
- Coluna com largura e altura fixas, com rolagem interna, contador de cartões e título editável no clique
- Faixa colorida no topo de cada coluna e tema de fundo do quadro
- Filtro (busca, responsável, etiqueta, entrega) e o botão "só minhas tarefas" na tecla Q

**No cartão**
- Etiquetas por quadro, editáveis, para prioridade
- Responsáveis (avatares no cartão)
- Checklists com barra de progresso
- Data de início e data de entrega com hora
- Descrição em editor de texto rico, sem biblioteca externa
- Link de Google Docs/Sheets/Slides/Drive colado na descrição vira cartão de preview (não existe anexo de arquivo)
- Comentários com menção `@pessoa`
- Seguir o cartão (recebe os comentários sem ser responsável)
- Salvar como template
- Transformar em tarefa rotineira (diária, semanal, mensal, com hora e coluna de destino)
- Arquivar (some do quadro, o histórico fica) e excluir de vez (leva o histórico junto)

**Fora do quadro**
- Caixa de entrada: menções e comentários dos cartões que você segue
- Agenda: o que você tem para entregar, separado em atrasadas, hoje e próximas, mais o painel das suas rotineiras
- Painel de produtividade (só o dono): tempo trabalhado por pessoa e por área, entregas, média por tarefa
- Equipe e acessos: diretório de pessoas, times, e quem entra em qual quadro
- E-mail automático: você foi incluído numa tarefa, alguém te citou, e o resumo das tarefas de hoje

**Por baixo**
- Login com Google, travado no domínio da empresa (no banco, não só na tela)
- Row Level Security no Postgres: quem não tem acesso ao quadro não lê a linha, nem pela API
- Realtime: o quadro do colega atualiza sozinho
- Cron no banco para as rotinas e cron na hospedagem para os e-mails

---

## 2. A FILOSOFIA: TRELLO ENXUTO

A referência é o Trello. A regra é copiar o essencial e cortar o excesso, porque o Trello atende infinitas empresas e você atende uma.

O que ficou de fora de propósito, e você também deve deixar:

- **Power-ups e integrações de plataforma:** nada.
- **Anexo de arquivo:** nada. Os arquivos da empresa moram no Google Drive. O que existe é: colou link do Google na descrição, aparece um cartão bonito com ícone e botão de abrir. Isso resolve 100% do caso real e custa uma fração do trabalho.
- **Automações:** fase 2 da sua vida, não desta construção. Mas o software já nasce emitindo os eventos certos (cartão mudou de coluna, responsável adicionado), então ligar automação depois não é retrabalho.
- **Quadro público:** não existe. Todo quadro nasce privado e só vê quem foi colocado.
- **"Marcar como concluído" no cartão:** existiu, foi removido. Quem decide se acabou é a coluna onde o cartão está, senão você passa a ter dois estados de verdade brigando.

Três regras de produto que sustentam o resto:

1. **Só o dono cria quadro e cria coluna.** Não é frescura de permissão: sem isso, em duas semanas o quadro tem 11 colunas e ninguém sabe qual é a de entregue.
2. **O tempo trabalhado só o dono vê.** O time não fica se comparando, e o dado não vira política interna.
3. **Ninguém é notificado do que ele mesmo fez.** É o que separa notificação útil de spam.

---

## 3. STACK E PRÉ-REQUISITOS

**Stack**

| Peça | Escolha | Por quê |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Página e API no mesmo lugar, deploy trivial |
| Banco + Auth | Supabase (Postgres) | RLS, Realtime, login Google e pg_cron sem servidor próprio |
| Hospedagem | Vercel | Deploy no push e cron no `vercel.json` |
| E-mail (opcional) | Resend | API direta, sem SDK |

**Dependências de código: uma só.** `@supabase/supabase-js`. Sem biblioteca de drag and drop, sem biblioteca de UI, sem editor de texto rico de terceiro, sem cliente de e-mail. Tudo isso está escrito neste documento e cabe em poucas centenas de linhas. É o que mantém o app rápido e possível de entender.

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "next": "^16",
    "react": "^19",
    "react-dom": "^19"
  }
}
```

**O que você precisa ter antes de começar**

- Conta no Supabase, com um projeto novo criado
- Projeto no Google Cloud com OAuth configurado (client id e secret colados no Supabase, em Authentication > Providers > Google)
- Conta na Vercel ligada ao seu GitHub
- A extensão `pg_cron` habilitada no Supabase (Database > Extensions > pg_cron > Enable). Sem ela, as tarefas rotineiras não nascem.
- Opcional, só para a Fase 10: conta no Resend com um subdomínio verificado (por exemplo `tarefas.suaempresa.com.br`)

**Variáveis de ambiente** (`.env.local` no dev, e as mesmas na Vercel):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # só no servidor, nunca com prefixo NEXT_PUBLIC_
CRON_SECRET=...                       # string aleatória sua, protege as rotas de cron
RESEND_API_KEY=...                    # só na Fase 10
```

A chave anônima é pública e isso é seguro: quem protege os dados é a RLS, não o segredo da chave. A `service_role` ignora RLS e nunca pode chegar ao navegador.

---

## 4. VOCABULÁRIO

Use estas palavras na interface inteira, em português, sempre as mesmas:

| Palavra na tela | O que é | Tabela |
|---|---|---|
| Quadro de trabalho (ou quadro) | O board | `boards` |
| Coluna | A lista de dentro do quadro | `lists` |
| Tarefa (ou cartão) | O card | `cards` |
| Etiqueta | Label colorida do quadro | `labels` |
| Responsável | Quem faz a tarefa | `card_members` |
| Seguidor | Recebe notificação sem ser responsável | `card_followers` |
| Coluna universal | A coluna "Trabalhando" e a "Concluído" do quadro | `boards.working_list_id` / `done_list_id` |
| Rotineira | Tarefa que renasce sozinha | `routines` |
| Time | Grupo de pessoas que carrega acesso | `teams` |

---

## 5. MAPA DE ROTAS E ARQUIVOS

```
app/
  login/page.tsx                    entrar com Google
  page.tsx                          redireciona para /tarefas
  tarefas/
    page.tsx                        painel: seus quadros
    BottomBar.tsx                   barra inferior: Quadro, Caixa de entrada, Agenda, Mudar de quadros
    Breadcrumb.tsx                  trilha de navegação
    board/[id]/
      page.tsx                      O QUADRO (a tela central do produto)
      CardModal.tsx                 o detalhe da tarefa
      Comments.tsx                  comentários com @menção
      RichEditor.tsx                editor de descrição
      GoogleLinks.tsx               preview de link do Google
    agenda/page.tsx                 o que entregar hoje + minhas rotineiras
    inbox/page.tsx                  caixa de entrada
    notificacoes/page.tsx           quais e-mails eu recebo
    produtividade/page.tsx          painel do dono
    equipe/page.tsx                 diretório, times e acessos
  api/
    notificacoes/enviar/route.ts    cron: manda o que está pendente
    notificacoes/resumo/route.ts    cron: resumo das 8h
  globals.css                       o CSS inteiro, em um arquivo
lib/
  supabase.ts                       cliente do navegador
  supabaseAdmin.ts                  cliente de servidor (service_role)
  types.ts                          os tipos das tabelas
  access.ts                         domínio permitido e e-mail do dono
  people.ts                         nome de exibição e sigla do avatar
  colors.ts                         paleta das faixas e os temas do quadro
  tracking.ts                       formatação do tempo
  notificacoes.ts                   montagem e envio dos e-mails
supabase/
  f01.sql ... f11.sql               uma migração por fase
```

Regra de arquivo: **uma migração por fase, numerada, nunca editada depois de rodada.** Se precisar corrigir, crie a próxima. O dia em que você reescrever uma migração já aplicada, o banco de produção e o repositório passam a contar histórias diferentes.

---

## 6. FASE 0: o esqueleto

**Objetivo:** projeto de pé, login de Google funcionando, ninguém de fora entra.

**Passos**

1. `npx create-next-app@latest . --typescript --app --no-tailwind`
2. `npm i @supabase/supabase-js`
3. `lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

// A chave anônima é pública e segura: quem protege os dados é a RLS.
// Os placeholders só evitam quebrar o build enquanto o .env.local está vazio.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
```

4. `lib/access.ts`:

```ts
// O portão: quem pode ENTRAR. O que cada um VÊ depois é decidido pela RLS.
export const ALLOWED_DOMAINS = ["suaempresa.com.br"];          // TROQUE AQUI
export const ALLOWLIST: string[] = [];                          // exceções (freelancer com gmail)
export const OWNER_EMAIL = "voce@suaempresa.com.br";            // TROQUE AQUI

export function isAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (ALLOWLIST.map((x) => x.toLowerCase()).includes(e)) return true;
  return ALLOWED_DOMAINS.map((d) => d.toLowerCase()).includes(e.split("@")[1] || "");
}
```

5. `/login`: uma caixa com um botão só.

```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${window.location.origin}/` },
});
```

O erro do OAuth volta no **fragmento** da URL (`#error_description=...`), não na query. Ele nunca chega ao servidor, então a leitura tem que ser no navegador, e depois limpe o hash com `history.replaceState` para que recarregar a página não ressuscite o erro.

**SQL da Fase 0** (Supabase > SQL Editor):

```sql
-- ============================================================
-- Tarefas · F00: perfis, o dono e a porta de entrada
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
    lower(new.email) = 'voce@suaempresa.com.br'        -- TROQUE AQUI
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
  values ('suaempresa.com.br', 'dominio', 'Workspace da empresa')   -- TROQUE AQUI
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
```

**Aceite da Fase 0:** você entra com o seu Google e cai numa página vazia. Um Gmail qualquer tenta entrar e é recusado. No Supabase, `select * from profiles` mostra você com `is_owner = true`.

> ⚠️ O gatilho da porta é `before insert` em `auth.users`: quem já existe não é afetado. Crie a sua conta antes de ligar a tranca, ou libere o seu e-mail em `acesso_permitido` primeiro. É assim que você não se tranca do lado de fora.

---

## 7. FASE 1: quadro, colunas e cartões

**Objetivo:** o Kanban básico, com arrastar funcionando e tempo real.

**SQL**

```sql
-- ============================================================
-- Tarefas · F01: o quadro
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
create policy "board_members: eu leio o meu" on board_members for select to authenticated
  using (user_id = auth.uid() or public.current_is_owner());

create policy "card_members: do quadro com acesso" on card_members for all to authenticated
  using (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id where c.id=card_id)))
  with check (has_board_access((select l.board_id from lists l join cards c on c.list_id=l.id where c.id=card_id)));

do $$ begin
  begin alter publication supabase_realtime add table boards;       exception when others then null; end;
  begin alter publication supabase_realtime add table lists;        exception when others then null; end;
  begin alter publication supabase_realtime add table cards;        exception when others then null; end;
  begin alter publication supabase_realtime add table card_members; exception when others then null; end;
end $$;
```

**Comportamento exato**

- **Painel (`/tarefas`):** grade de cartões de quadro. Cada um com faixa colorida no topo, nome e data. Só o dono vê "+ Criar quadro" e o 🗑 de excluir, e excluir pede confirmação dentro do próprio cartão ("Excluir o quadro e tudo dentro? Não dá pra desfazer"), nunca com `confirm()` ou `prompt()` do navegador.
- **Quadro novo nasce povoado:** três colunas (`A fazer`, `Fazendo`, `Concluído`) e seis etiquetas (três nomeadas: Prioridade, Urgente, Crítico; três sem nome, só cor). Quadro vazio faz a pessoa fechar a aba.
- **Coluna:** largura fixa de 259px, altura limitada à tela, rolagem interna na lista de cartões. Nunca cresce. No topo: alça de arraste, título editável no clique (Enter salva e tira o foco), bolinha de cor e o contador de cartões. No rodapé: "+ Adicionar cartão".
- **Criar cartão:** só o título, num `textarea` de duas linhas. Enter cria, Shift+Enter quebra linha. Nada mais nesse momento.
- **Quem cria a tarefa vira responsável dela.** Insert em `card_members` logo depois do insert do cartão.
- **Arrastar:** implementado na mão, com `mousedown` / `mousemove` / `mouseup` e limiar de 5 pixels. Abaixo de 5px é clique e abre o cartão; acima, começa o arraste: clona o elemento como fantasma preso ao cursor, esmaece a origem e ilumina a coluna de destino. A posição de soltura é decidida por `elementFromPoint` mais a metade da altura de cada cartão.

> 🚫 **Não use `draggable="true"` (HTML5 drag and drop).** No Firefox ele suprime o clique, e o cartão deixa de abrir. Esse bug custou uma sessão inteira de depuração.

- **Reordenar:** ao soltar, reindexa a coluna inteira em memória, atualiza o estado, e só então dispara os updates em paralelo. A tela responde antes do banco.
- **Tempo real:** um canal do Supabase por quadro, escutando `cards`, `lists` e as tabelas relacionadas, chamando a mesma função `fetchAll`. Não tente aplicar patches cirúrgicos por evento: rebuscar tudo é mais simples, mais correto, e o volume de um quadro cabe nisso.

**Aceite da Fase 1:** dois navegadores abertos no mesmo quadro; arrastar um cartão em um aparece no outro em menos de um segundo.

---

## 8. FASE 2: o detalhe da tarefa

**Objetivo:** o modal que é 80% do valor percebido do produto.

**SQL**

```sql
-- ============================================================
-- Tarefas · F02: etiquetas, responsáveis, datas, checklist
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
```

**Anatomia do modal** (topo para baixo, coluna esquerda)

1. **Topo:** um `select` com a coluna atual (mover o cartão de coluna por aqui) e o X de fechar.
2. **Título** editável, salva no blur, nunca aceita vazio.
3. **Barra de ações:** 🏷 Etiquetas · 👤 Membros · ☑ Checklist · 👁 Seguir.
4. **Etiquetas:** popover com a lista do quadro. Cada linha tem a barra colorida (clicar aplica ou tira do cartão) e o lápis. No modo lápis: renomear e 🗑 excluir **com confirmação explícita**, porque `card_labels` tem cascade e excluir a etiqueta a remove de todos os cartões do quadro.
5. **Membros:** popover com quem tem acesso ao quadro, avatar com sigla, nome e e-mail.
6. **Datas:** início (`type="date"`) e entrega (`type="datetime-local"`), lado a lado.
7. **Descrição:** o editor rico (Fase 3).
8. **Checklists:** título editável, percentual, barra de progresso, itens com checkbox e texto editável, campo "Adicionar um item" com Enter.

**Coluna direita:** Ações (arquivar, excluir, salvar como template, tornar rotineira), o bloco de tempo trabalhado (só o dono) e os comentários.

**Atalhos do modal**

- `Esc` fecha
- `Espaço`, quando o foco não está num campo de texto, adiciona ou remove **você** como responsável. É o atalho mais usado do produto depois que o time descobre.

**Duas armadilhas de data**

- `datetime-local` trabalha em horário local e o banco guarda `timestamptz`. Converta nos dois sentidos: ao mostrar, `new Date(iso.getTime() - offset*60000).toISOString().slice(0,16)`; ao salvar, `new Date(valor).toISOString()`.
- Data sem hora (o início) salva **ao meio-dia**: `new Date(v + "T12:00:00").toISOString()`. Salvar à meia-noite faz a data aparecer um dia antes para metade do time, dependendo do fuso.

**Aceite da Fase 2:** criar etiqueta, nomear, aplicar, e o selo aparecer no cartão do quadro ao fechar o modal. Marcar um item da checklist e ver `☑ 1/2` no cartão.

---

## 9. FASE 3: a descrição (editor rico, sem biblioteca)

**Objetivo:** escrever texto formatado no cartão sem instalar 300kb de editor.

**O componente** é um `div contentEditable` mais uma barra de botões, usando `document.execCommand`. Ele guarda HTML.

**Barra:** B, I, U, S (riscado), H (título H3), lista com marcadores, lista numerada, 🔗 link, ⌫ limpar formatação.

**Regras que fazem ele funcionar de verdade**

1. **Semeie o HTML uma vez só**, no mount. `contentEditable` não é controlado pelo React; se você re-renderizar o conteúdo a cada tecla, o cursor pula.
2. No mount, rode `execCommand("defaultParagraphSeparator", false, "p")` e `execCommand("styleWithCSS", false, "false")`. Sem isso o Enter gera `<div>` e o negrito vira `<span style>`.
3. **Cole como texto puro:** intercepte o `paste`, leia `text/plain` e insira com `insertText`. Previsível e elimina o HTML sujo de fora.
4. **Salve com sanitização:** lista branca de tags (`P BR B STRONG I EM S U H3 UL OL LI A SPAN DIV`), remove **todo atributo** de toda tag, exceto `href` de `<a>` que não comece com `javascript:`, e força `target="_blank" rel="noreferrer"`. Remove `<li>` vazio e lista sem itens.
5. **Salvar acontece em três gestos:** botão Salvar, `Cmd/Ctrl+Enter`, e clicar fora do editor (listener de `mousedown` no documento enquanto focado). Os três chamam a mesma função.

> ⚠️ **A armadilha dos atalhos.** Se você deixar `Cmd+B` para o `contentEditable` nativo, o Chrome às vezes gera `<b>` e às vezes `<span style="font-weight:bold">`. Como o sanitizador apaga **todo atributo**, a formatação some ao salvar, de forma intermitente, e você vai caçar um fantasma. Trate `Cmd+B`, `Cmd+I`, `Cmd+U` na mão, com `preventDefault`, chamando `execCommand`. Aí sai `<b>/<i>/<u>`, que sobrevivem.
>
> Em `Cmd+S` (sublinhado, por pedido de quem usa), o `preventDefault` é obrigatório, senão abre o "salvar página" do navegador. E avise o time: aqui quem salva é `Cmd+Enter`.

**Linkificação:** URL solta vira `<a>` clicável. Rode em **exatamente dois momentos**: ao semear o editor (abrir o cartão) e dentro do sanitizador (salvar). **Nunca enquanto a pessoa digita**, senão o cursor pula. Ao salvar, reescreva o `innerHTML` com o HTML já linkificado, para ficar clicável sem precisar reabrir o cartão.

Enquanto está editando, clicar num link posiciona o cursor (Alt+clique abre mesmo assim); fora de edição, abre em aba nova. Capture esse estado no `mousedown`, não no `click`: o `focus` chega antes do `click` e faria a checagem sempre dizer "estou editando".

**Limitação conhecida e aceita:** URL dentro de frase entre parênteses pode levar o `)` de fechamento junto. Não tem solução limpa. Documente e siga.

**Preview de link do Google** (`GoogleLinks.tsx`): lê o HTML da própria descrição, extrai `href` de `<a>` e URLs do texto puro, classifica por domínio e caminho (`/document` → Docs, `/spreadsheets` → Sheets, `/presentation` → Slides, `/forms` → Forms, `drive.google` → Drive) e desenha um cartão com ícone SVG colorido, o nome do tipo, a URL limpa e "Abrir ↗". **Nenhuma tabela nova.** É o substituto inteiro do anexo de arquivo.

**Aceite da Fase 3:** escrever em negrito, salvar, recarregar a página, continuar em negrito. Colar um link de planilha e ver o cartão verde aparecer.

---

## 10. FASE 4: comentários e menções

**SQL**

```sql
-- ============================================================
-- Tarefas · F04: comentários, menções e caixa de entrada
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
```

**Comportamento**

- Digitar `@` no campo de comentário abre o popover com quem participa do quadro. O "handle" da pessoa é o nome real, ou a parte antes do `@` do e-mail quando não há nome.
- A regex das menções é montada com os handles **dos mais longos para os mais curtos**, senão "Ana" casa antes de "Ana Paula".
- Ao enviar: grava o comentário, grava as linhas em `comment_mentions` (é o insert nessa tabela que dispara a notificação, não o comentário), e faz `upsert` de quem comentou em `card_followers`. Quem comenta passa a seguir.
- `Cmd/Ctrl+Enter` envia. Com o popover aberto, Enter escolhe a primeira sugestão.
- Na exibição, primeiro destaque as menções, e o texto que sobra entre elas passa pela linkificação. O corpo do comentário é texto puro (o React escapa), então emitir `<a>` ali é seguro.

> ⚠️ **PostgREST e o embed ambíguo.** Assim que `comment_mentions` existir, haverá duas relações possíveis entre `comments` e `profiles`, e `author:profiles(...)` passa a falhar com `PGRST201`, deixando a lista de comentários vazia sem erro visível na tela. Escreva sempre com a chave estrangeira explícita:
> `author:profiles!comments_author_id_fkey(id,name,email)`

**Caixa de entrada (`/tarefas/inbox`):** lista das notificações, mais novas primeiro, com avatar de quem gerou, a frase ("mencionou você" / "comentou num cartão que você segue"), o trecho, onde aconteceu e o pontinho de não lida. Clicar marca como lida e navega para `/tarefas/board/{board_id}?card={card_id}`.

**Deep link:** a página do quadro lê `?card=` uma vez, depois que os cartões carregam, e abre o modal. Use uma `ref` para não reabrir quando o realtime rebuscar.

**Badge:** a barra inferior conta as não lidas com `head: true, count: "exact"` e escuta a tabela pelo realtime.

**Aceite da Fase 4:** em duas contas, A menciona B; B vê o badge subir na hora e clicar leva ao cartão certo, já aberto.

---

## 11. FASE 5: agenda, filtros e navegação

**Objetivo:** o software sair da tela do quadro.

**Barra inferior fixa**, quatro abas: 🗂️ Quadro · 📥 Caixa de entrada (com badge) · 📅 Agenda · ▦ Mudar de quadros. A aba "Quadro" lembra o último quadro aberto no `localStorage`.

**Trilha de navegação (breadcrumb)** no topo: `Tarefas › Nome do quadro`. O último item não é clicável.

**Agenda (`/tarefas/agenda`):** suas tarefas com data de entrega, em três grupos: **Atrasadas**, **Hoje**, **Próximas**. Só cartões onde você é responsável, e nunca cartões arquivados. Clicar abre o cartão pelo deep link. Embaixo, o bloco **🔁 Minhas rotineiras** (Fase 8), com pausar, retomar e excluir.

**Painel de filtro do quadro**, com quatro categorias:

- Busca (título e descrição; tire as tags do HTML da descrição antes de comparar)
- Responsável (avatares, mais a opção "Sem responsável")
- Etiquetas
- Entrega: Atrasadas, Vence hoje, Próximos 7 dias, Sem data

**A regra da combinação: dentro de uma categoria vale OU, entre categorias vale E.** É o que todo mundo espera sem saber explicar.

Mais: badge com o número de filtros ativos, "✕ Limpar filtros", contador "X de Y tarefas", e o painel fecha ao clicar fora.

**Botão "👤 Só minhas tarefas", na tecla Q.** O atalho ignora o evento quando o foco está em input, textarea ou contentEditable, quando há modal aberto, e quando tem Cmd/Ctrl/Alt junto.

**Aceite da Fase 5:** com um filtro de etiqueta e um de responsável ligados, o quadro mostra só os cartões que satisfazem os dois.

---

## 12. FASE 6: tracking e produtividade (a parte que exige rigor)

**Objetivo:** saber quanto tempo uma tarefa levou e quando foi entregue, sem transformar isso em vigilância exposta.

**O conceito: colunas universais.** Nas configurações do quadro (só o dono), ele escolhe, entre as colunas que existem, qual é a **"Trabalhando"** e qual é a **"Concluído"**. Uma de cada, por quadro. As outras seguem normais.

**O modelo do tempo (chamamos de modelo A):**

- Cartão entra em Trabalhando: o cronômetro inicia
- Sai de Trabalhando: pausa e soma o trecho aberto no acumulado
- Volta: retoma
- Chega em Concluído: registra a data de entrega (só na primeira vez)
- Sai de Concluído (reabriu): a data de entrega é limpa

Tempo fora da coluna Trabalhando não conta. Nunca.

**SQL**

```sql
-- ============================================================
-- Tarefas · F06: colunas universais e cronômetro
-- ============================================================

alter table boards add column if not exists working_list_id uuid references lists on delete set null;
alter table boards add column if not exists done_list_id    uuid references lists on delete set null;

-- Tabela SEPARADA de propósito: a RLS de `cards` é por quadro, então guardar o
-- tempo lá dentro faria o "só o dono vê" existir apenas na interface.
create table if not exists card_tracking (
  card_id uuid primary key references cards on delete cascade,
  work_ms bigint not null default 0,
  work_started_at timestamptz,
  done_at timestamptz
);
alter table card_tracking enable row level security;

-- Só LEITURA, e só do dono. Não existe policy de insert nem de update:
-- a AUSÊNCIA dela é a proteção. Quem escreve é o gatilho (security definer).
drop policy if exists "card_tracking: só o dono lê" on card_tracking;
create policy "card_tracking: só o dono lê" on card_tracking for select to authenticated
  using (public.current_is_owner());

create or replace function public.track_card() returns trigger
language plpgsql security definer set search_path = public as $$
declare wid uuid; did uuid; t record; v_now timestamptz := now();
begin
  select bo.working_list_id, bo.done_list_id into wid, did
    from lists l join boards bo on bo.id = l.board_id where l.id = new.list_id;
  if not found then return new; end if;
  if wid is null and did is null then return new; end if;

  -- Cartão NASCEU dentro de uma coluna universal.
  if TG_OP = 'INSERT' then
    if wid is not null and new.list_id = wid then
      insert into card_tracking (card_id, work_started_at) values (new.id, v_now)
        on conflict (card_id) do update set work_started_at = v_now;
    elsif did is not null and new.list_id = did then
      insert into card_tracking (card_id, done_at) values (new.id, v_now)
        on conflict (card_id) do update set done_at = v_now;
    end if;
    return new;
  end if;

  -- UPDATE: só interessa quando a COLUNA muda...
  if new.list_id is not distinct from old.list_id then return new; end if;
  -- ...e só quando entra ou sai de uma coluna universal (senão não cria lixo).
  if not ((wid is not null and (old.list_id = wid or new.list_id = wid))
       or (did is not null and (old.list_id = did or new.list_id = did))) then
    return new;
  end if;

  insert into card_tracking (card_id) values (new.id) on conflict (card_id) do nothing;
  select * into t from card_tracking where card_id = new.id;

  if wid is not null and old.list_id = wid and new.list_id <> wid and t.work_started_at is not null then
    update card_tracking
       set work_ms = coalesce(work_ms,0) + (extract(epoch from (v_now - t.work_started_at)) * 1000)::bigint,
           work_started_at = null
     where card_id = new.id;
  end if;

  if wid is not null and old.list_id <> wid and new.list_id = wid then
    update card_tracking set work_started_at = v_now where card_id = new.id;
  end if;

  if did is not null and new.list_id = did then
    update card_tracking set done_at = coalesce(done_at, v_now) where card_id = new.id;
  end if;

  if did is not null and old.list_id = did and new.list_id <> did then
    update card_tracking set done_at = null where card_id = new.id;
  end if;

  return new;
end $$;

drop trigger if exists trg_track_card on cards;
create trigger trg_track_card after insert or update of list_id on cards
  for each row execute function public.track_card();

do $$ begin
  begin alter publication supabase_realtime add table card_tracking; exception when others then null; end;
end $$;
```

> 🔴 **A lição mais cara deste documento.** Na primeira versão, o tempo morava em três colunas da tabela `cards` e o cálculo acontecia no navegador. Resultado: o "só você vê" era enfeite. Qualquer pessoa com acesso ao quadro lia o tempo de qualquer colega pela API e zerava o próprio com um update. E o relógio era o do computador de quem arrastava.
>
> A correção tem três partes, e as três importam: **tabela própria** (para a RLS poder ser diferente), **escrita só por gatilho** `security definer` (o navegador nunca grava tempo), **relógio do servidor** (`now()` no Postgres).
>
> Se você guardar só uma frase deste manual, guarde esta: **regra que só existe na interface não é regra, é sugestão.**

**No navegador, o tracking é só leitura e formatação:**

```ts
export function liveWorkMs(t?: Trk | null): number {
  if (!t) return 0;
  let ms = t.work_ms || 0;
  if (t.work_started_at) ms += Date.now() - new Date(t.work_started_at).getTime();
  return ms;
}
export function fmtDur(ms: number): string {
  if (ms < 1000) return "0m";
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
```

Para quem não é dono, o `select` em `card_tracking` volta vazio, e o selo simplesmente não aparece. Nenhum `if` de interface protegendo nada.

Um `setInterval` de 30 segundos redesenha os cronômetros em andamento, e só para o dono.

**Painel de produtividade (`/tarefas/produtividade`, só o dono):**

- Filtros: quadro e período (desde sempre, 7 dias, 30 dias, este mês). O período filtra pela **data de entrega**, e a tela diz isso em letras, senão ninguém entende o número.
- Destaques: entregues, tempo total, quem mais entregou, área mais lenta por tarefa
- Barras por pessoa: tempo, entregas e média por tarefa
- Barras por área (o campo `role` do perfil)
- O cartão que mais demorou
- A linha "Sem responsável", que existe para o total bater

**Aceite da Fase 6:** mova um cartão para Trabalhando, espere um minuto, mova para Concluído. O tempo aparece para você e some quando você olha com uma conta comum.

---

## 13. FASE 7: pessoas, times e acesso

**Objetivo:** dar acesso a um time inteiro, e que entrar no time já conceda.

**SQL**

```sql
-- ============================================================
-- Tarefas · F07: diretório, acesso por e-mail e times
-- ============================================================

-- O diretório: a lista mestre de quem existe na empresa.
create table if not exists team_members (
  email text primary key,
  name text default '',
  role text default '',
  created_at timestamptz default now()
);
-- Convidado avulso num quadro.
create table if not exists board_access (
  board_id uuid references boards on delete cascade,
  email text not null,
  primary key (board_id, email)
);
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  position int not null default 0,
  created_at timestamptz default now()
);
create table if not exists team_people (
  team_id uuid references teams on delete cascade,
  email text not null,
  primary key (team_id, email)
);
create table if not exists board_teams (
  board_id uuid references boards on delete cascade,
  team_id uuid references teams on delete cascade,
  primary key (board_id, team_id)
);

-- Migra quem já era membro (Fase 1) para o acesso por e-mail.
insert into board_access (board_id, email)
  select bm.board_id, lower(p.email) from board_members bm join profiles p on p.id = bm.user_id
  on conflict do nothing;

-- A trava passa a aceitar três portas: dono, e-mail avulso, ou time.
create or replace function public.has_board_access(b uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from boards where id = b and owner_id = auth.uid())
      or exists (select 1 from board_access ba
                  where ba.board_id = b and lower(ba.email) = lower(auth.jwt() ->> 'email'))
      or exists (select 1 from board_teams bt
                   join team_people tp on tp.team_id = bt.team_id
                  where bt.board_id = b and lower(tp.email) = lower(auth.jwt() ->> 'email'));
$$;

alter table team_members enable row level security;
alter table board_access enable row level security;
alter table teams        enable row level security;
alter table team_people  enable row level security;
alter table board_teams  enable row level security;

-- ESCRITA: só o dono, em tudo.
create policy "team_members: só o dono" on team_members for all to authenticated
  using (public.current_is_owner()) with check (public.current_is_owner());
create policy "board_access: o dono gerencia" on board_access for all to authenticated
  using (public.current_is_owner()) with check (public.current_is_owner());
create policy "teams: o dono gerencia" on teams for all to authenticated
  using (public.current_is_owner()) with check (public.current_is_owner());
create policy "team_people: o dono gerencia" on team_people for all to authenticated
  using (public.current_is_owner()) with check (public.current_is_owner());
create policy "board_teams: o dono gerencia" on board_teams for all to authenticated
  using (public.current_is_owner()) with check (public.current_is_owner());

-- LEITURA: quem tem acesso ao quadro enxerga QUEM MAIS tem acesso a ele.
create policy "board_access: quem tem acesso lê" on board_access for select to authenticated
  using (public.current_is_owner() or public.has_board_access(board_id));
create policy "board_teams: quem tem acesso lê" on board_teams for select to authenticated
  using (public.current_is_owner() or public.has_board_access(board_id));

-- SECURITY DEFINER de propósito: a policy consulta board_teams, e sem isso a
-- RLS de board_teams seria reavaliada dentro da própria policy (recursão).
create or replace function public.can_see_team(t uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select public.current_is_owner()
      or exists (select 1 from board_teams bt
                  where bt.team_id = t and public.has_board_access(bt.board_id));
$$;
create policy "team_people: quem divide quadro lê" on team_people for select to authenticated
  using (public.can_see_team(team_id));
create policy "teams: quem divide quadro lê" on teams for select to authenticated
  using (public.can_see_team(id));

-- Só o dono cria COLUNA. RESTRICTIVE combina com E (AND) às policies
-- permissivas que já existem, então não é preciso mexer na policy de `lists`.
drop policy if exists "lists: só o dono cria coluna" on lists;
create policy "lists: só o dono cria coluna" on lists
  as restrictive for insert to authenticated
  with check (public.current_is_owner());

-- O login passa a puxar nome e cargo do diretório, quando o e-mail está lá.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare tm record;
begin
  select name, role into tm from public.team_members where lower(email) = lower(new.email);
  insert into public.profiles (id, email, name, is_owner, role)
  values (
    new.id, new.email,
    coalesce(nullif(tm.name,''),
             nullif(new.raw_user_meta_data->>'full_name',''),
             nullif(new.raw_user_meta_data->>'name',''),
             new.email),
    lower(new.email) = 'voce@suaempresa.com.br',          -- TROQUE AQUI
    nullif(tm.role,'')
  )
  on conflict (id) do update
    set email = excluded.email,
        name = case when public.profiles.name is null or public.profiles.name = public.profiles.email
                    then excluded.name else public.profiles.name end;
  return new;
end $$;

do $$ begin
  begin alter publication supabase_realtime add table board_access; exception when others then null; end;
  begin alter publication supabase_realtime add table board_teams;  exception when others then null; end;
  begin alter publication supabase_realtime add table team_people;  exception when others then null; end;
end $$;
```

> 🔴 **A segunda lição mais cara.** Quando o acesso virou time, o time inteiro reclamou: "abro a tarefa, clico em Membros e só apareço eu". Ninguém conseguia atribuir tarefa a colega.
>
> Não era falta de recurso, e não era a escrita: inserir membro no cartão sempre foi liberado para quem tem acesso ao quadro. **Era a LEITURA.** A lista de "quem tem acesso a este quadro" era montada a partir de tabelas cuja policy de select só deixava cada um ler a própria linha. A tela montava uma lista com dados que a pessoa não podia ler, e vinha um nome só.
>
> A regra que ficou: **ao mover um dado para uma tabela nova com RLS restritiva, pergunte quem precisa LER aquilo para a tela funcionar, não só quem escreve.** Blindar a escrita e cegar a interface é o erro mais fácil de cometer com RLS.

Depois desta migração, `board_members` não decide mais nada: quem manda é `board_access` mais os times. Tire o insert em `board_members` da criação de quadro (o dono já entra por `owner_id`) e deixe a tabela parada até ter certeza de que nada lê dela. Duas fontes de verdade sobre acesso é como se cria o bug de "tirei a pessoa e ela continua vendo".

**Tela Equipe (`/tarefas/equipe`, só o dono):**
- Diretório: adicionar e-mail, editar nome e cargo. Editar sincroniza também o `profiles` de quem já logou, senão o painel de produtividade continua mostrando o nome velho.
- Times: criar, renomear, excluir, e montar quem está dentro clicando na linha.
- Para quem nunca logou, mostre um palpite de nome derivado do e-mail, como **placeholder**, sem salvar nada.

**Modal "Acesso ao quadro"** (dentro do quadro, só o dono):
- Blocos por time, com "dar acesso ao time" e "tirar o time", e a lista de quem entra por ali
- "Convidados avulsos": quem tem acesso individual, com "remover"
- Um `<details>` recolhido para convidar alguém de fora dos times
- Quem entra por time mostra "já entra pelo Marketing" e **não tem botão de remover individual**. É decisão consciente: para tirar, ou a pessoa sai do time, ou o time sai do quadro. Meio-termo ali vira acesso fantasma que ninguém explica depois.
- O dono aparece no fim, com a palavra "sempre"

**Membros assinaláveis num cartão** = o acesso **efetivo** (avulsos ∪ herdados dos times com acesso) cruzado com quem já logou pelo menos uma vez. Busque os times **antes** de calcular essa lista.

**Aceite da Fase 7:** coloque alguém num time que tem acesso a um quadro. Sem tocar em mais nada, essa pessoa passa a ver o quadro e a aparecer na lista de responsáveis.

---

## 14. FASE 8: tarefas rotineiras

**Objetivo:** a tarefa que se repete não precisa ser recriada na mão toda semana.

**A dor real:** "responder e-mails dos alunos" ou nunca é entregue (e dá sensação de improdutividade), ou é entregue e recriada toda semana por alguém.

**SQL**

```sql
-- ============================================================
-- Tarefas · F08: rotinas
-- PRÉ-REQUISITO: Database > Extensions > pg_cron > Enable
-- ============================================================

create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles on delete cascade,
  board_id uuid references boards on delete cascade,
  list_id uuid references lists on delete cascade,
  title text not null,
  description text default '',
  freq text not null,                    -- daily | weekly | monthly
  day_of_week int,                       -- 0=domingo .. 6=sábado
  day_of_month int,                      -- 1..31
  at_time time not null default '08:00',
  active boolean default true,
  -- Rotina criada hoje NÃO dispara hoje: o cartão de hoje já existe, foi dele
  -- que a rotina nasceu.
  last_created_date date default (now() at time zone 'America/Sao_Paulo')::date,
  created_at timestamptz default now()
);
alter table routines enable row level security;
create policy "routines: as minhas" on routines for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.run_routines() returns void
language plpgsql security definer set search_path = public as $$
declare r record; v_pos int; v_now timestamp; v_date date; v_dow int; v_dom int;
begin
  v_now  := now() at time zone 'America/Sao_Paulo';     -- TROQUE AQUI se o fuso for outro
  v_date := v_now::date;
  v_dow  := extract(dow from v_date);
  v_dom  := extract(day from v_date);
  for r in select * from routines
           where active
             and (last_created_date is distinct from v_date)
             and v_now::time >= at_time loop
    if (r.freq = 'daily')
       or (r.freq = 'weekly'  and r.day_of_week  = v_dow)
       or (r.freq = 'monthly' and r.day_of_month = v_dom) then
      select coalesce(max(position) + 1, 0) into v_pos from cards where list_id = r.list_id;
      insert into cards (list_id, title, description, position)
        values (r.list_id, r.title, coalesce(r.description,''), v_pos);
      update routines set last_created_date = v_date where id = r.id;
    end if;
  end loop;
end $$;

do $$ begin perform cron.unschedule('tarefas-routines'); exception when others then null; end $$;
select cron.schedule('tarefas-routines', '*/5 * * * *', $$select public.run_routines()$$);
```

**No modal, o formulário tem quatro campos e uma frase:**

1. Repetir: todo dia / toda semana / todo mês
2. No dia (semanal) ou dia do mês (mensal)
3. **Às** (a hora)
4. **Na coluna** (onde o cartão vai nascer), com o padrão sendo a coluna atual do cartão
5. A frase: `1º card: segunda, 17/08 às 09:00`

> ⚠️ **Duas falhas de usabilidade que parecem bug de motor.** As duas foram reportadas como "a rotina não funcionou", e as duas vezes o cron tinha rodado certinho:
>
> 1. **O cartão nascia na coluna do cartão modelo.** A pessoa transformou em rotina um cartão que já estava em Concluído, então todo dia nascia um cartão já concluído, invisível no meio dos entregues. Daí o campo "Na coluna" existir.
> 2. **A rotina não dispara no dia em que é criada.** A pessoa criou "toda segunda" numa segunda, não apareceu nada, e repetiu a operação seis vezes. A regra continua (o cartão de hoje já existe), mas agora ela está escrita na tela, na frase da previsão.
>
> A lição: **regra invisível vira bug na cabeça de quem usa.** Se o comportamento correto surpreende, ele precisa aparecer na interface, não no seu código.

**Painel "Minhas rotineiras"**, dentro da Agenda: título, descrição da frequência com a hora ("Toda segunda às 09:00"), **a coluna de destino** (`→ Sprint`, que é o que denuncia de relance uma rotina caindo em Concluído), e os botões pausar, retomar e excluir.

**Aceite da Fase 8:** crie uma rotina diária com hora para daqui a 10 minutos. Vá almoçar. Volte e veja o cartão na coluna que você escolheu.

---

## 15. FASE 9: arquivar, templates, cores e temas

**SQL**

```sql
-- ============================================================
-- Tarefas · F09: arquivar, templates, cores e temas
-- ============================================================

-- Arquivar é SOFT de propósito: card_tracking.card_id tem ON DELETE CASCADE,
-- então apagar cartão destrói o tempo trabalhado e a data de entrega. A faxina
-- quinzenal com DELETE zeraria o painel de produtividade.
alter table cards add column if not exists archived_at timestamptz;
create index if not exists cards_ativos_idx on cards (list_id, position) where archived_at is null;

create table if not exists card_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles on delete cascade,
  name text not null,
  payload jsonb not null,
  created_at timestamptz default now()
);
alter table card_templates enable row level security;
create policy "templates: todos leem" on card_templates for select to authenticated using (true);
create policy "templates: crio o meu"  on card_templates for insert to authenticated with check (owner_id = auth.uid());
create policy "templates: apago o meu" on card_templates for delete to authenticated using (owner_id = auth.uid());

-- Cores. Tudo NULL por padrão = cor automática pelo hash do id, então nada
-- muda de aparência até alguém escolher.
alter table lists  add column if not exists color text;
alter table boards add column if not exists color text;
alter table boards add column if not exists theme text;
```

**Arquivar contra excluir, com as palavras certas:**
- No cartão: **🗄 Arquivar tarefa** e, separado, **🗑 Excluir de vez…** que só depois de um clique vira "🗑 Confirmar, apaga o histórico junto".
- Na coluna marcada como Concluído: **🗄 Arquivar os N concluídos**, com a confirmação "Somem do quadro. Tempo e entrega continuam contando."
- Nas configurações do quadro: a lista dos arquivados com "desarquivar".

> ⚠️ Um botão que diz "Arquivar" e apaga é pior que não ter botão. Essa era a versão antiga, e o texto mentia. Se o seu botão destrói histórico, ele precisa dizer isso na própria etiqueta.

**Templates:** "💾 Salvar como template" guarda título, descrição e as checklists com os itens num `jsonb`. No formulário de adicionar cartão, os templates aparecem como chips: um clique cria o cartão inteiro, com as checklists montadas.

**Cores:** paleta fixa de 10. A cor efetiva é `cor escolhida || cor automática pelo hash do id`. Uma bolinha no cabeçalho da coluna abre o seletor com as 10 amostras mais "↺ voltar ao automático".

**Temas:** 5 fundos para o quadro (Grafite padrão, Azul-noite, Verde-mata, Vinho, Ardósia). O tema troca **só quatro variáveis CSS** de fundo na raiz da página. A cor de destaque da marca continua a mesma em todos os temas: trocar o destaque descola o produto da identidade, e o quadro passa a parecer outro software a cada tema.

**Aceite da Fase 9:** arquive os concluídos, confirme que sumiram do quadro, e confirme que o painel de produtividade continua contando as mesmas entregas.

---

## 16. FASE 10 (opcional): e-mail

**Objetivo:** o que acontece dentro do software chegar em quem não está com ele aberto.

Não é um sistema novo. A tabela `notifications` já existe desde a Fase 4, com caixa de entrada e badge. E-mail é só um **canal de entrega em cima dela**: a fila de envio é a própria tabela.

**SQL**

```sql
-- ============================================================
-- Tarefas · F10: e-mail
-- ============================================================

alter table notifications add column if not exists emailed_at timestamptz;
create index if not exists notif_pendentes_idx on notifications (created_at) where emailed_at is null;

-- O que já existe NÃO vira e-mail retroativo.
update notifications set emailed_at = now() where emailed_at is null;

-- Preferência por pessoa. Linha ausente = ligado.
-- Tipo novo no futuro é só passar a gravar outra `kind`, sem migração.
create table if not exists notification_prefs (
  user_id uuid references profiles on delete cascade,
  kind text not null,
  enabled boolean not null default true,
  primary key (user_id, kind)
);
alter table notification_prefs enable row level security;
create policy "prefs: as minhas" on notification_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- "Você foi incluído numa tarefa". Quem age não se notifica.
create or replace function public.notify_on_assign() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_board uuid; v_actor uuid;
begin
  v_actor := auth.uid();
  if new.user_id is not distinct from v_actor then return new; end if;
  select l.board_id into v_board from cards c join lists l on l.id = c.list_id where c.id = new.card_id;
  insert into notifications (user_id, actor_id, type, board_id, card_id)
  values (new.user_id, v_actor, 'assigned', v_board, new.card_id);
  return new;
end $$;
drop trigger if exists on_card_member_added on card_members;
create trigger on_card_member_added after insert on card_members
  for each row execute function public.notify_on_assign();
```

**Três tipos, e só três:**

| kind | Quando | Formato |
|---|---|---|
| `assigned` | Você foi incluído numa tarefa | Na hora |
| `mention` | Alguém te citou num comentário | Na hora, com o trecho |
| `due_today` | Suas tarefas de hoje | Um e-mail só, às 8h, e nada quando não há nada |

> ⚠️ **O tipo que foi cortado, e por quê.** A ideia original incluía "qualquer tarefa criada no quadro". Fizemos a conta antes de construir: 5,6 cartões por dia × 15 pessoas = **84 e-mails por dia**. O time criaria um filtro no Gmail em uma semana, e perderia junto os e-mails que importam. Além disso, criar tarefa já põe você como responsável, então era o mesmo evento que `assigned`.
>
> **Notificação demais não é excesso de zelo: é a forma mais eficiente de matar todas as notificações.**

**Regras de envio**

- **Ninguém é notificado do que ele mesmo fez.** Vale para menção e para atribuição.
- **É no-reply**, e o rodapé diz isso com todas as letras, mandando a pessoa comentar no cartão. Assim a conversa fica junto do trabalho e todo mundo do cartão enxerga, em vez de virar uma thread privada com um robô.
- **Remetente em subdomínio próprio** (`tarefas.suaempresa.com.br`), nunca o domínio raiz onde está o e-mail que as pessoas usam de verdade. Reputação de envio é por domínio, e disparo automático não pode arrastar a caixa de ninguém.
- **Envio que falha não carimba `emailed_at`.** A linha continua pendente e a próxima rodada tenta de novo. E-mail não se perde por causa de um erro momentâneo do provedor.
- **Pular não é falhar:** destinatário sem e-mail, preferência desligada, cartão arquivado, tudo isso **carimba** e sai da fila, senão a fila tenta para sempre.

**As duas rotas**, protegidas por `Bearer CRON_SECRET`, agendadas no `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/notificacoes/enviar", "schedule": "*/5 * * * *" },
    { "path": "/api/notificacoes/resumo", "schedule": "0 11 * * *" }
  ]
}
```

`0 11 * * *` em UTC é 08:00 no horário de Brasília. Ajuste ao seu fuso.

**A tela "E-mails do Tarefas"** (`/tarefas/notificacoes`) é uma **lista**, não um formulário fixo: cada linha é um tipo, com um botão de liga e desliga. Tipo novo é acrescentar uma entrada no array e passar a gravar a mesma `kind`. Sem migração, sem mexer no banco.

**Buraco conhecido e aceito:** se o provedor recusar sempre, a notificação tenta para sempre em silêncio; o erro aparece só no log da rodada. O sintoma é a fila crescendo em vez de zerar. Se isso virar rotina, grave um `last_error` na notificação.

**Aceite da Fase 10:** atribua uma tarefa a um colega e veja o e-mail chegar. Desligue o tipo na tela de preferências e confirme que o próximo não chega.

---

## 17. FASE 11: publicar

1. Repositório no GitHub, projeto na Vercel, variáveis de ambiente coladas lá
2. No Supabase, em Authentication > URL Configuration, acrescente a URL de produção nas Redirect URLs (o curinga `/**` cobre as rotas internas)
3. No Google Cloud, acrescente a URL de callback do Supabase nas origens autorizadas
4. Deploy

**Como conferir se o que está no ar é o que você escreveu** (essa sequência nasceu de um diagnóstico errado que custou horas):

```bash
npx vercel ls <projeto> --yes                       # idade do último deploy
git log --format="%h %ad %s" --date=format:"%d/%m %H:%M" -3
gh api repos/<user>/<repo>/deployments --jq '.[0:3]|.[]|{sha:.sha[0:7],created_at}'
```

Compare os três. "O botão não aparece" quase sempre é "o código não está no ar", não "o botão está errado". E não tente ler o bundle em produção por `curl`: a proteção da hospedagem bloqueia, e a ausência de resposta não é prova de nada.

> ⚠️ **Ordem de deploy: se o seu `select` nomeia uma coluna nova, o SQL vai ANTES do deploy.** O PostgREST derruba a consulta inteira quando um campo não existe, e a tela quebra por completo em vez de degradar. Fora esse caso, código novo com banco velho costuma sobreviver; esse caso não.

---

## 18. AS REGRAS DE PRODUTO, EM UMA LISTA

Estas são as decisões que fazem o software parecer pensado. Todas custaram discussão ou erro.

1. Quadro nasce **privado**, com 3 colunas e 6 etiquetas.
2. **Só o dono** cria quadro, cria coluna, exclui quadro, vê tempo, vê produtividade e gerencia acessos.
3. Quem **cria** a tarefa vira **responsável** dela.
4. Clique abre a tarefa; arrastar acima de 5 pixels move. Arraste feito na mão, nunca HTML5.
5. Coluna com largura e altura **fixas**, com rolagem interna. Nunca cresce.
6. `Q` = só minhas tarefas. `Espaço` no modal = me atribuo. `Esc` fecha. `Cmd+Enter` salva e comenta.
7. Filtro: **OU dentro da categoria, E entre categorias**.
8. Etiqueta é do **quadro**. Excluir uma tira ela de todos os cartões, então pede confirmação.
9. Tempo só conta na coluna Trabalhando. Escrito por gatilho, com o relógio do servidor, lido só pelo dono.
10. **Arquivar nunca é excluir.** Excluir avisa que leva o histórico junto.
11. Rotina não dispara no dia em que é criada, e a tela mostra quando o primeiro cartão nasce.
12. Rotina nasce na coluna que você escolhe, não na coluna do cartão modelo.
13. Ninguém é notificado do que ele mesmo fez.
14. Quem comenta passa a seguir o cartão.
15. Descrição guarda HTML saneado; colagem entra como texto puro.
16. Não existe anexo. Link do Google vira cartão de preview.
17. Acesso mora no time: entrar concede na hora, sair revoga na hora.
18. Quem entra por time não tem botão de remoção individual.
19. Quem tem acesso ao quadro **lê** quem mais tem acesso a ele.
20. Login é travado no **banco**, não na tela.
21. Nenhum `alert()`, `confirm()` ou `prompt()` do navegador. Confirmação é um passo dentro da própria interface, com o texto dizendo a consequência.
22. Toda tela tem um estado vazio que **ensina o próximo passo**, nunca um "nada aqui" seco.

---

## 19. SISTEMA VISUAL

O contraste é o ponto: **o fundo do quadro é escuro, e os cartões são claros**. A área de trabalho fica com peso de aplicativo, e o cartão continua sendo papel.

**Tokens** (CSS custom properties na raiz):

```css
:root{
  --ink:#141414; --panel:#1b1a18; --panel-2:#232120; --panel-3:#2b2926;
  --line:rgba(255,255,255,.08); --line-2:rgba(255,255,255,.16);
  --text:#ECECEA; --muted:#9a9488; --faint:#6b665d;
  --gold:#FEC212; --gold-2:#E07C0A;        /* TROQUE AQUI pela sua cor de marca */
  --good:#5FD08A; --info:#6aa8ff; --crit:#ef6a5a; --warn:#f0a83c;
  --grad:linear-gradient(135deg,#FEC212,#E07C0A);
  --display:"Helvetica Neue",system-ui,sans-serif;
  --body:system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:"SF Mono","JetBrains Mono",ui-monospace,monospace;
  /* trocadas pelo tema do quadro */
  --board-bg:linear-gradient(140deg,#2c2113,#161412 60%,#0f0e0c);
  --board-tint:#100f0d; --board-pill:#221c12; --board-deep:#0c0b09;
}
```

**Medidas que importam**

| Elemento | Valor |
|---|---|
| Largura da coluna | 259px, fixa |
| Fundo da coluna | `#f1f2f4`, raio 13px |
| Faixa de cor no topo da coluna | 6px, `border-radius: 13px 13px 0 0` |
| Cartão | branco, raio 9px, `padding: 10px 12px`, sombra sutil |
| Selo de etiqueta no cartão | barra de 34×8px |
| Avatar | círculo de 22px com a sigla |
| Barra inferior | 56px, fixa no rodapé |
| Texto do cartão | 14px, peso 500, cor `#172b4d` |

**Sigla do avatar:** inicial do nome mais inicial do sobrenome ("Ana Paula" vira AP). Sem sobrenome, as duas primeiras letras. Sem nome, cai no e-mail. Escreva isso **numa função só**, em `lib/people.ts`: no original, esse cálculo estava copiado em nove lugares e cada um mostrava uma coisa.

**Estados do selo de data e de tempo:** atrasado em vermelho, vence em breve em âmbar, concluído em verde, rodando em âmbar. O mesmo par de cores em toda a interface.

**Layout do quadro:** `grid-template-rows: auto auto 1fr` (barra do app, cabeçalho do quadro, tela do quadro). Com apenas duas faixas, as colunas escorregam para o rodapé e a barra flutua. Foi bug real.

---

## 20. AS ARMADILHAS, REUNIDAS

A parte mais valiosa deste documento. Cada item aqui é uma noite de trabalho que você não vai precisar ter.

1. **Regra que só existe na interface não é regra.** O tempo "privado" era lido e escrito por qualquer um pela API enquanto morava em `cards`.
2. **RLS: blindar a escrita e esquecer a leitura cega a tela.** A lista de membros voltava com um nome só, e parecia falta de recurso.
3. **RLS pode recursar.** Policy que consulta uma tabela cuja RLS consulta a primeira trava. Resolva com função `security definer`.
4. **Policy `restrictive` combina com E.** Ela deixa você acrescentar uma trava sem conhecer nem derrubar a policy original, o que é ouro quando o SQL inicial não está versionado.
5. **Cascade destrói histórico.** `on delete cascade` no tracking transforma qualquer faxina por `DELETE` em apagamento de métrica. Arquive.
6. **Migração antes do deploy** quando o `select` nomeia coluna nova. O PostgREST não degrada, derruba.
7. **HTML5 drag and drop mata o clique** no Firefox. Faça o arraste na mão, com limiar.
8. **`contentEditable` e React não se dão bem.** Semeie uma vez e nunca re-renderize o conteúdo enquanto digita.
9. **Atalho de formatação deixado para o navegador gera `<span style>`**, que o sanitizador apaga. Trate na mão e produza `<b>`.
10. **Embed ambíguo no PostgREST** (`PGRST201`) quando duas relações ligam as mesmas tabelas. Sempre nomeie a chave estrangeira.
11. **Fuso:** data sem hora salva ao meio-dia; `datetime-local` converte nos dois sentidos; cron compara no fuso local, não em UTC.
12. **Regra invisível vira bug na cabeça de quem usa.** Se o comportamento correto surpreende, ele tem que aparecer escrito na tela.
13. **Notificação demais mata a notificação.** Faça a conta de quantos e-mails por dia antes de ligar um tipo novo.
14. **Botão que mente é pior que botão que falta.** "Arquivar" não pode apagar.
15. **`z-index` do fundo escurecido acima da caixa do modal** faz o clique acertar o fundo e fechar a janela, e o insert nunca roda. O modal precisa de `position: relative` e `z-index` acima do véu.
16. **Modal fechado que continua no DOM com `pointer-events: auto`** vira um retângulo invisível no meio da tela bloqueando cliques nas colunas centrais. `pointer-events: none` quando fechado.
17. **Nunca `prompt()`.** Alguns navegadores bloqueiam, e o resultado é um recurso que "não funciona" sem erro nenhum.
18. **"O botão não aparece" quase sempre é "o código não está no ar".** Confira a idade do deploy antes de duvidar do código.
19. **Ao apagar dados em massa, faça o ensaio primeiro:** conte quantas linhas seriam afetadas, guarde um backup do que vai sair, e apague por id explícito, nunca por filtro amplo.

---

## 21. CHECKLIST DE ACEITE FINAL

Antes de convidar o seu time, teste com duas contas abertas lado a lado:

- [ ] Um Gmail de fora não consegue entrar
- [ ] Quem não foi adicionado ao quadro não vê o quadro, nem pela API
- [ ] Arrastar cartão aparece no outro navegador em menos de um segundo
- [ ] Clicar abre o cartão; arrastar não abre
- [ ] Criar tarefa já coloca você como responsável
- [ ] Etiqueta criada, nomeada e aplicada aparece como selo no cartão
- [ ] Descrição em negrito sobrevive a recarregar a página
- [ ] Link de Google Docs colado vira cartão de preview
- [ ] Menção gera badge na caixa de entrada do outro na hora
- [ ] Clicar na notificação abre o cartão certo, já aberto
- [ ] `Q` filtra só as suas, e o contador mostra "X de Y"
- [ ] Mover para Trabalhando e para Concluído registra tempo e entrega
- [ ] A conta comum não vê tempo nenhum
- [ ] Entrar num time concede acesso ao quadro na hora
- [ ] O modal de Membros mostra o time inteiro, não só você
- [ ] Rotina criada hoje não nasce hoje, e a tela avisa disso
- [ ] Rotina nasce na coluna escolhida
- [ ] Arquivar tira do quadro e mantém o número no painel de produtividade
- [ ] Nenhuma tela usa `alert`, `confirm` ou `prompt`

---

## 22. O QUE VEM DEPOIS (fase 2 da sua vida)

Não construa agora. Mas o software já nasce pronto para isso, porque desde o dia um ele emite os eventos certos.

- **Motor de automação:** "quando o cartão entra na coluna X, faça Y". Os gatilhos que você já tem (cartão mudou de coluna, responsável adicionado, comentário criado) são exatamente os eventos que uma automação escuta.
- **Título real do documento do Google:** hoje o cartão de preview mostra o tipo ("Planilha Google"). Mostrar o nome real exige a Drive API com OAuth, o que casa com o login Google que você já tem.
- **Excluir coluna** pela interface, avisando quantos cartões vão junto (`cards.list_id` tem cascade).
- **Exportar CSV** do painel de produtividade.
- **Gargalo por coluna:** quanto tempo os cartões ficam parados em cada etapa.

---

**Última coisa.** O valor deste software não está em nenhuma linha de código: está nas vinte e poucas decisões pequenas que fazem o time usar em vez de abandonar. Quando bater a dúvida entre duas formas de fazer, escolha a que precisa de menos explicação para quem vai usar amanhã de manhã.
