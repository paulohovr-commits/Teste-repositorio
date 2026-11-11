# Recursos do Freedom

Uma ficha por recurso. Cada ficha diz o que é, o que guarda, com quem conversa e o que falta decidir.

**Status:** 💭 desabafado · 📐 especificado · 🛠 em construção · ✅ pronto e em uso

| # | Recurso | Status | Nasceu em |
|---|---|---|---|
| R00a | Prospecção (funil de leads) | ✅ | antes do caderno |
| R00b | Painel de cliente | ✅ (um cliente, página avulsa) | antes do caderno |
| R00c | Base comum (login, pessoas, acesso, eventos) | ✅ parcial | antes do caderno |
| R01 | Ferramenta de tarefas | 💭 + 📐 (o manual já existe) | Desabafo 001 |

---

## R01 · Ferramenta de tarefas

**Status:** 💭 desabafado. Mas metade do caminho já está andada: o manual do Tarefas
(`docs/TAREFAS-MANUAL-DE-CONSTRUCAO.md`) especifica um Kanban de equipe completo em 11 fases, e a
Prospecção já roda as fases 0 a 5 dele. O mesmo motor serve para as duas coisas.

**O que é (o que o Claude entendeu):** o lugar onde mora todo trabalho da agência: o que precisa ser
feito, para qual cliente, por quem, até quando, e em que pé está. É o "sistema nervoso" do Freedom: quase
todo recurso futuro vai criar tarefa ou ler tarefa.

**A grande diferença para um Trello:** no Freedom, **o responsável por uma tarefa pode ser uma pessoa ou
a própria IA.** O Freedom vai pegar tarefas para si (escrever a legenda, montar o relatório, pesquisar
o concorrente) e devolver para um humano quando precisar de aprovação. Isso muda o desenho desde o começo:

- cada tarefa precisa dizer se **a IA pode fazer sozinha**, **a IA faz e um humano aprova**, ou **só humano**
- toda ação da IA fica registrada no histórico, igual à de uma pessoa
- a coluna "Aguardando aprovação" vira peça central, não detalhe

**O que já vem pronto do manual:**
- quadros, colunas, cartões, arrastar, filtros, tecla Q ("só as minhas")
- etiquetas, responsáveis, checklist, data de início e de entrega com hora
- descrição com editor rico e preview de link do Google Drive
- comentários com @menção, seguir cartão, caixa de entrada
- agenda (atrasadas, hoje, próximas)
- F06: cronômetro por tarefa (só o dono vê o tempo)
- F07: pessoas, times e acesso
- F08: tarefas rotineiras (diária, semanal, mensal)
- F09: arquivar, templates, cores
- F10: e-mail (incluído numa tarefa, citado, resumo do dia)

**O que uma agência precisa e o manual não tem** (a confirmar com você):
- **Cliente como dono do quadro.** Um quadro por cliente? Ou um quadro por tipo de trabalho com etiqueta
  de cliente? (ver P4)
- **Tipos de tarefa de agência:** post, carrossel, vídeo, campanha de anúncio, relatório, reunião,
  aprovação do cliente. Cada tipo pode nascer com o seu checklist.
- **Aprovação do cliente:** a tarefa sai da equipe, vai para o cliente aprovar e volta.
- **Entregas do contrato:** "12 posts por mês" vira 12 tarefas sozinho todo mês (rotina ligada ao contrato).
- **Anexo de arquivo:** o manual corta de propósito (tudo mora no Drive). Agência mexe com imagem e vídeo
  o tempo todo. Precisa decidir (ver P6).

**O que essa ferramenta guarda (dados):** quadro, coluna, tarefa, cliente, responsável (pessoa ou IA),
modo de execução, datas, checklist, comentários, tempo trabalhado, histórico de eventos.

**Com quem conversa:** ver `CRUZAMENTOS.md` (C01 a C06 e C09).

---

## R00a · Prospecção (funil de leads)

**Status:** ✅ construído (`app/prospeccao`, `supabase/f00` a `f05`). Também existe uma versão em página
avulsa (`organizador/novos-clientes.html`).

**O que é:** Kanban do funil comercial: `Leads novos → Pesquisando → 1º contato → Follow-up → Reunião /
Proposta → Fechado → Perdido`. Cada lead guarda WhatsApp, Instagram, site, anúncio, Maps, cidade, nicho,
origem, valor estimado e próximo contato. Importa lead colado do Google, CSV e Trello, sem duplicar.

**Papel no Freedom:** a porta de entrada do dinheiro. Todo cliente do Freedom começa aqui.

---

## R00b · Painel de cliente

**Status:** ✅ um painel, para uma cliente (`painel/painel-cris-marcia.html`).

**O que é:** um painel feito para a cliente trabalhar a própria prospecção: contatos, meta de mensagens por
dia, mensagens prontas com `{nome}`, retornos do dia, e uma aba com 107 escritórios pesquisados pelo
Claude, com análise e mensagem personalizada para cada um.

**Papel no Freedom:** é o primeiro exemplo de **serviço que a agência vende e a IA executa** (pesquisa,
análise e texto feitos pelo Claude). Hoje é uma página avulsa por cliente; no Freedom vira um módulo
que nasce para qualquer cliente.

---

## R00c · Base comum

**Status:** ✅ parcial (vem do manual, fases 0 a 5).

**O que é:** o chão que todos os recursos pisam:
- login com Google e lista de quem pode entrar (`acesso_permitido`)
- o dono do sistema, definido por e-mail
- pessoas e acesso por quadro, com Row Level Security no banco
- notificações e caixa de entrada
- **eventos**: o manual já manda o sistema registrar "cartão mudou de coluna", "responsável adicionado",
  "comentário criado". É desse registro que vai sair a inteligência do Freedom (ver C06).
