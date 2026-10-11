# Prospecção: o organizador de clientes

É um Kanban de prospecção no estilo do Trello, mas enxuto. Ele foi construído a partir do
[manual do Tarefas](docs/TAREFAS-MANUAL-DE-CONSTRUCAO.md), fases 0 a 5, e adaptado para encontrar,
abordar e fechar clientes.

## O que ele faz

**O funil.** Todo quadro novo já nasce com estas etapas:
`Leads novos → Pesquisando → 1º contato feito → Follow-up → Reunião / Proposta → Fechado ✅ → Perdido`.
Também vem com as etiquetas **Quente**, **Morno**, **Frio**, **Anuncia no Google**, **Sem site** e **Instagram fraco**.

**Cada lead guarda:**
- WhatsApp ou telefone, que vira um botão "Chamar no WhatsApp"
- Instagram, site, link do anúncio e Google Maps, cada um com botão de abrir
- cidade, nicho, origem e valor estimado
- 📞 **próximo contato** (data e hora), que leva o lead para a Agenda
- anotações em texto formatado (link do Google Docs ou Planilhas colado ali vira um cartão de preview)
- checklist com o **roteiro de prospecção** (ver o anúncio, analisar o Instagram, analisar o site,
  1ª mensagem, follow-up em 2 e em 7 dias)
- **histórico de comentários**, para registrar cada contato, com @menção para quem trabalha com você

**Colocar leads lá dentro (botão "📋 Colar / importar leads"):**
- **Colar**: cole o que você achou no Google (nome, texto do anúncio, links do site, do Instagram,
  do WhatsApp e do Maps). O sistema separa cada coisa no campo certo. Deixe uma linha em branco
  entre um lead e outro para colar vários de uma vez. Quando ele vê "Patrocinado" ou "Anúncio",
  aplica a etiqueta **Anuncia no Google**. Quando não há site, aplica **Sem site**.
- **Planilha (CSV)**: exporte a sua planilha do Google Planilhas ou do Excel em CSV e escolha o arquivo.
  Ele reconhece colunas como Nome, Empresa, Telefone, WhatsApp, Instagram, Site, Anúncio, Cidade,
  Nicho, Status/Etapa, Observações e Próximo contato.
- **Trello (JSON)**: no Trello, abra *Menu → Imprimir, exportar e compartilhar → Exportar como JSON*.
  Vêm junto as etapas, descrições, datas, etiquetas e checklists.
- **Atalho**: no "+ Adicionar lead" de qualquer etapa, cole direto o link do Instagram ou do site.
- O sistema **não duplica**: se o mesmo Instagram ou o mesmo site já estiver no quadro, o lead é pulado.

**Para o dia a dia:**
- arrastar o lead entre etapas (feito na mão, com limiar de 5px: clicar abre, arrastar move)
- filtros por busca (nome, cidade, nicho, @, site), responsável, etiqueta e próximo contato
- **Q**: mostra só os meus leads · **Espaço**, com o lead aberto: me coloca como responsável · **Esc**: fecha
- **Agenda**: contatos atrasados, de hoje e os próximos, com botão de WhatsApp
- **Caixa de entrada**: menções e comentários nos leads que você segue
- **⬇ Planilha**: baixa os leads (com os filtros aplicados) em CSV para abrir no Excel ou no Google Planilhas
- **Arquivar**: o lead perdido some do quadro, mas fica guardado. Há também "arquivar todos os leads
  da etapa", pelo menu ⋯ da coluna.
- **Tempo real**: se alguém mexer no quadro, a sua tela atualiza sozinha.

## Como colocar no ar (cerca de 30 minutos, uma vez só)

Você precisa de três contas gratuitas: **Supabase** (banco e login), **Google Cloud** (o botão
"Entrar com Google") e **Vercel** (hospedagem).

### 1. Supabase
1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor** e rode os arquivos da pasta `supabase/` **nesta ordem**: `f00.sql`, `f01.sql`,
   `f02.sql`, `f04.sql`, `f05_prospeccao.sql`.
   > ⚠️ Antes de rodar o `f00.sql`, troque `seu.email@gmail.com` pelo **seu e-mail** nas duas linhas
   > marcadas com `TROQUE AQUI`. É esse e-mail que vira o **dono** do sistema (o dono cria quadros e
   > etapas). Só entra quem estiver na tabela `acesso_permitido`. Para liberar outras pessoas, use o
   > botão **👥 Acesso** dentro do quadro.
3. Em **Project Settings → API**, copie a `Project URL` e a chave `anon public`.

### 2. Google (login)
1. No [Google Cloud Console](https://console.cloud.google.com), vá em *APIs e serviços → Credenciais →
   Criar credenciais → ID do cliente OAuth* (tipo "Aplicativo da Web").
2. Em "URIs de redirecionamento autorizados", cole a URL de callback que o Supabase mostra em
   **Authentication → Providers → Google**.
3. Cole o *Client ID* e o *Client Secret* no Supabase, nessa mesma tela, e ative o Google.

### 3. Rodar no computador (opcional)
```bash
cp .env.example .env.local   # preencha com a URL, a chave anon e o seu e-mail
npm install
npm run dev                  # abre em http://localhost:3000
```

### 4. Vercel
1. Importe este repositório em [vercel.com](https://vercel.com).
2. Em *Environment Variables*, cole as mesmas variáveis do `.env.example`.
3. Faça o deploy. Depois, no Supabase, em **Authentication → URL Configuration**, adicione a URL da
   Vercel em *Site URL* e em *Redirect URLs* (com `/**` no final).

## Estrutura

```
app/
  login/                         entrar com Google
  prospeccao/
    page.tsx                     seus quadros
    board/[id]/page.tsx          O QUADRO (arrastar, filtros, tempo real)
    board/[id]/CardModal.tsx     o lead aberto
    board/[id]/ImportModal.tsx   colar / planilha / Trello
    board/[id]/RichEditor.tsx    editor de anotações (sem biblioteca)
    board/[id]/Comments.tsx      histórico com @menção
    agenda/  inbox/              agenda de contatos e caixa de entrada
lib/
  leads.ts                       leitor de texto colado, CSV e Trello
  leadsDb.ts                     gravação em lote e exportação CSV
  config.ts                      nome do app, etapas e etiquetas padrão (TROQUE AQUI)
supabase/                        uma migração por fase; nunca edite uma que já rodou
docs/TAREFAS-MANUAL-DE-CONSTRUCAO.md   o manual original
```

**Única dependência de código:** `@supabase/supabase-js`, além de Next e React, como pede o manual.

## Diferenças em relação ao manual

- **Vocabulário**: o cartão aqui se chama *lead* e a coluna se chama *etapa*. A data de entrega
  virou **próximo contato**.
- **Lição 2 do manual já aplicada na Fase 1**: quem tem acesso ao quadro *lê* quem mais tem acesso.
  Sem isso, o popover de Responsáveis mostraria só você.
- **Arquivar** (que no manual é da Fase 9) veio junto com o `f05_prospeccao.sql`, porque a Agenda já
  precisa ignorar os leads arquivados.
- O dono é definido **por e-mail**, não por domínio, porque liberar `gmail.com` inteiro deixaria
  qualquer pessoa entrar.

## Próximas fases (no manual)

- **F06**: tempo em cada etapa e painel de produtividade
- **F07**: times
- **F08**: tarefas rotineiras (ex.: "toda segunda, revisar follow-ups")
- **F09**: templates, cores e temas
- **F10**: e-mail
- **F11**: publicar

O SQL de cada uma está no manual. Rode uma de cada vez e numere a partir de `f06`.
