# Freedom · Caderno de desabafos

**Freedom** é a IA que vai virar uma agência de marketing automatizada e cuidar de 100% da agência.

Por enquanto não é software, é este caderno. Durante 1 a 2 semanas você desabafa tudo o que quer que o
Freedom faça, do jeito que vier (falando, de preferência). O Claude anota, entende o recurso, pensa nas
integrações e nos riscos de segurança, e cruza cada ideia nova com as anteriores.

**Nada é descartado nesta fase.**

| Resumo | |
|---|---|
| Desabafos | 1 |
| Recursos anotados | 1 (+ 3 peças que já existem) |
| Cruzamentos | 9 |
| Integrações | 7 |
| Alertas de segurança | 8 |
| Perguntas para você | 8 |

**Índice:** [1. Desabafos](#1-desabafos) · [2. Recursos](#2-recursos) · [3. Cruzamentos](#3-cruzamentos) ·
[4. Integrações](#4-integrações) · [5. Alertas de segurança](#5-alertas-de-segurança) ·
[6. Perguntas para você](#6-perguntas-para-você)

---

## 1. Desabafos

Cada desabafo fica aqui do jeito que você disse, com data. O mais novo fica em cima.

### Desabafo 001 · 11/11/2026 · A visão do Freedom e a ferramenta de tarefas

**O que você disse:**

> Eu quero criar um grande sistema que vai gerenciar 100% da minha agencia de marketing para mim, como eu
> ainda não tenho a visão do todo, toda vez que eu pensar em algum recurso, eu vou vir aqui e soltar como
> um desabafo. O seu papel é anotar tudo que eu quero construir e a cada novo recurso entender quais
> cruzamentos você pode fazer para que eu ganhe inteligencia nesse grande sistema.
>
> Eu quero construir uma ferramenta de tarefas
>
> "Eu quero construir uma IA chamada Freedom que vai ser uma agência de marketing automatizada. Por
> enquanto, o nosso trabalho é criar um caderno de desabafos. Eu vou passar de 1 a 2 semanas desabafando
> aqui sobre todos os recursos que eu quero que o sistema tenha. O seu trabalho é, basicamente, anotar
> todo desabafo e entender o que é o recurso, e já ir pensando sobre possíveis integrações que a gente vai
> precisar ter e, inclusive, alertas de segurança."

**O que o Claude entendeu:**
- O nome é **Freedom**: uma IA que funciona como uma agência de marketing automatizada.
- O método: 1 a 2 semanas só de desabafos, sem construir nada ainda.
- Primeiro recurso: uma **ferramenta de tarefas** (R01).
- Descoberta: este repositório já tem o manual completo de um software de tarefas e um quadro de
  prospecção feito com ele. A ferramenta de tarefas não começa do zero.

---

## 2. Recursos

**Situação:** 💭 só desabafado · 📐 já tem plano · 🛠 sendo construído · ✅ pronto e em uso

| # | Recurso | Situação |
|---|---|---|
| R00a | Prospecção (quadro de leads) | ✅ |
| R00b | Painel de cliente | ✅ (um cliente) |
| R00c | Base comum (login, pessoas, acessos, histórico) | ✅ em parte |
| R01 | Ferramenta de tarefas | 💭 + 📐 (o manual já existe) |

### R01 · Ferramenta de tarefas 💭

**O que é:** o lugar onde mora todo o trabalho da agência: o que precisa ser feito, para qual cliente,
por quem, até quando, e em que pé está. Quase todo recurso futuro vai criar tarefa ou ler tarefa.

**A grande diferença para um Trello:** no Freedom, **quem faz a tarefa pode ser uma pessoa ou a própria
IA.** O Freedom pega tarefas para ele (escrever a legenda, montar o relatório, pesquisar o concorrente) e
devolve para um humano quando precisar de aprovação. Então cada tarefa precisa dizer:
- **a IA faz sozinha**, ou
- **a IA faz e um humano aprova**, ou
- **só humano faz**.

**O que já vem pronto do manual** (`docs/TAREFAS-MANUAL-DE-CONSTRUCAO.md`): quadros, colunas e cartões
de arrastar, filtros, etiquetas, responsáveis, checklist, prazo com hora, comentários com @menção, caixa
de entrada, agenda (atrasadas, hoje, próximas), cronômetro por tarefa, equipe e acessos, tarefas que se
repetem sozinhas (diária, semanal, mensal), modelos de tarefa e e-mail de aviso.

**O que uma agência precisa e o manual não tem** (a confirmar com você):
- **Cliente como dono do quadro** (ver P4)
- **Tipos de tarefa de agência:** post, carrossel, vídeo, campanha, relatório, reunião, aprovação.
  Cada tipo nasce com a sua lista de passos.
- **Aprovação do cliente:** a tarefa vai para o cliente aprovar e volta.
- **Entregas do contrato:** "12 posts por mês" vira 12 tarefas sozinho todo mês.
- **Arquivo dentro da tarefa** (ver P6)

**O que guarda:** quadro, coluna, tarefa, cliente, responsável (pessoa ou IA), quem pode fazer, prazos,
lista de passos, comentários, tempo trabalhado e o histórico de tudo que aconteceu.

### R00a · Prospecção ✅
Já construído (`app/prospeccao` e a página `organizador/novos-clientes.html`). Quadro do funil de vendas:
Leads novos → Pesquisando → 1º contato → Follow-up → Reunião / Proposta → Fechado → Perdido. Cada lead
guarda WhatsApp, Instagram, site, anúncio, cidade, nicho e a data do próximo contato.
**No Freedom:** é a porta de entrada do dinheiro. Todo cliente começa aqui.

### R00b · Painel de cliente ✅
Já construído para uma cliente (`painel/painel-cris-marcia.html`): lista de contatos, meta de mensagens
por dia, mensagens prontas e 107 escritórios pesquisados pelo Claude, com análise e mensagem para cada um.
**No Freedom:** é o primeiro exemplo de serviço que a agência vende e a IA executa.

### R00c · Base comum ✅ em parte
O chão que todos os recursos pisam: entrar com a conta Google, lista de quem pode entrar, o dono do
sistema, quem vê cada quadro, avisos e o **histórico de tudo que acontece** (tarefa mudou de coluna,
ganhou responsável, recebeu comentário). É desse histórico que vai sair a inteligência do Freedom (C06).

---

## 3. Cruzamentos

A inteligência do Freedom: o que ele passa a saber ou fazer quando dois recursos conversam.

| | Prospecção | Painel de cliente | Base comum | Tarefas |
|---|---|---|---|---|
| **Prospecção** | | C07 | | C01, C08 |
| **Painel de cliente** | C07 | | | C02 |
| **Base comum** | | | | C05, C06 |
| **Tarefas** | C01, C08 | C02 | C05, C06 | C03, C04, C09 |

**C01 · Tarefas × Prospecção: cliente fechado já nasce trabalhando.**
Quando o lead cai em "Fechado", o Freedom cria sozinho o quadro do cliente com as tarefas de início
(pegar acessos, briefing, reunião de início, primeiro mês de conteúdo). E os retornos da prospecção
entram na mesma agenda das tarefas: um lugar só para olhar de manhã.
*Inteligência:* quanto tempo passa entre o "sim" do cliente e a primeira entrega.

**C02 · Tarefas × Painel de cliente: o cliente vê o que está sendo feito.**
O cliente vê só as tarefas dele: o que está em produção, o que espera aprovação, o que foi entregue no
mês. Ele aprova ali mesmo e a tarefa anda sozinha.
*Inteligência:* quais clientes demoram para aprovar e quanto isso atrasa a agência.

**C03 · Tarefas × Tempo: quanto cada cliente custa de verdade.**
Somando as horas por cliente e comparando com o que ele paga, aparece o lucro real de cada cliente.
*Inteligência:* "o cliente X paga R$ 2.000 e consome 40 horas por mês: está dando prejuízo."

**C04 · Tarefas × Tarefas que se repetem: o contrato vira tarefa sozinho.**
"12 posts por mês" ou "relatório todo dia 5" nascem sozinhos no começo do mês.
*Inteligência:* entregue × contratado. Se o mês acabou com 9 de 12 posts, o Freedom avisa antes do
cliente perceber. E se a equipe entrega mais do que o contrato, é trabalho de graça.

**C05 · Tarefas × Equipe: a IA como membro da equipe.**
O Freedom entra na equipe como mais um responsável. Pega o que pode fazer sozinho e devolve o resto.
*Inteligência:* que parte do trabalho a IA já faz e quantas horas de gente isso libera.

**C06 · Tarefas × Histórico: o histórico vira cérebro.**
Todo movimento fica registrado. É isso que permite "quando acontecer X, faça Y" e os alertas.
*Inteligência:* onde as tarefas ficam paradas e quais vão atrasar.

**C07 · Prospecção × Painel de cliente (já existe).**
O painel da Cris Márcia já é isso: a agência faz a pesquisa de clientes **para o cliente**. No Freedom,
a mesma prospecção da agência vira um serviço vendido.

**C08 · Prospecção × Tempo: quanto custa conquistar um cliente.**
Contando as horas gastas na prospecção, aparece quanto custa cada cliente novo e de onde vêm os leads
que fecham mais rápido (Google, Instagram, indicação).

**C09 · Tarefas × Modelos: quanto tempo leva cada tipo de trabalho.**
Cada tipo de tarefa (post, vídeo, campanha, relatório) nasce de um modelo.
*Inteligência:* tempo médio de cada tipo. Com isso o Freedom estima prazo e diz se cabe mais um cliente.

### Cruzamentos esperando recurso
Quando você desabafar sobre estes assuntos, o cruzamento com as tarefas já está meio pensado:

| Quando você falar de... | As tarefas vão... |
|---|---|
| Financeiro / contratos | fechar a conta do lucro por cliente (C03) e gerar as entregas do contrato (C04) |
| Calendário de conteúdo | virar cada post agendado numa tarefa com prazo |
| Anúncios / tráfego pago | criar tarefa quando uma campanha piorar |
| Relatório para cliente | mostrar o que foi entregue no mês |
| Atendimento / WhatsApp | transformar pedido do cliente no WhatsApp em tarefa |
| Equipe / freelancers | medir a carga de cada pessoa e sugerir quem pega a próxima tarefa |

---

## 4. Integrações

Serviços de fora que o Freedom vai precisar.
✅ já em uso · 🔜 vai precisar · 💡 provável no futuro

| # | Serviço | Para quê | Situação |
|---|---|---|---|
| I01 | Supabase | Banco de dados, login e atualizar a tela sozinho | ✅ |
| I02 | Google (login) | Entrar com a conta Google | ✅ |
| I03 | Google Drive | Mostrar arquivos dentro das tarefas | 🔜 |
| I04 | Vercel | Deixar o sistema no ar na internet | ✅ (falta configurar) |
| I05 | Resend (e-mail) | Avisar "você ganhou uma tarefa", "te citaram", resumo do dia | 🔜 |
| I06 | WhatsApp | Hoje: botão que abre a conversa. Amanhã: avisos automáticos | ✅ botão / 💡 automático |
| I07 | Claude (IA) | O Freedom fazer as tarefas: escrever, pesquisar, analisar | ✅ no painel / 🔜 no sistema |

**Observação sobre WhatsApp:** o botão que abre a conversa é grátis. Mandar mensagem sozinho exige a
versão oficial da Meta para empresas, que cobra por conversa e tem regras rígidas contra spam.

---

## 5. Alertas de segurança

🔴 resolver antes de usar com clientes · 🟠 resolver antes de crescer · 🟡 ficar de olho

**S01 · O que a IA pode fazer sozinha 🔴**
A IA precisa de limites. Proposta: **faz sozinha** (pesquisar, rascunhar, organizar), **faz e um humano
aprova** (publicar, mandar mensagem para cliente) e **nunca sozinha** (gastar dinheiro em anúncio,
apagar coisas, mudar acessos, falar de preço ou contrato). Tudo que a IA fizer fica anotado com
"feito pelo Freedom". Cuidado extra: texto que vem de fora (comentário de cliente, site, e-mail) nunca
pode virar ordem para a IA.

**S02 · Um cliente nunca vê o dado de outro 🔴**
Quando o cliente entrar no painel, a trava tem que estar no banco de dados, não só na tela.

**S03 · Senhas dos clientes 🔴**
Senha de Instagram, Meta Ads e Google **nunca** vai escrita em tarefa ou comentário: todo mundo do quadro
lê e fica guardado para sempre. Melhor pedir acesso de parceiro (a Meta e o Google têm isso) em vez da senha.

**S04 · Chaves secretas 🔴**
As chaves que dão acesso total ao banco, à IA, ao e-mail e ao WhatsApp ficam só no servidor, nunca no
navegador e nunca salvas no GitHub.

**S05 · Regra só na tela não é regra 🟠**
Se "só o dono vê", isso tem que ser travado no banco. Esconder na tela não protege.

**S06 · LGPD: dados de leads 🟠**
A prospecção guarda nome e WhatsApp de pessoas que não pediram para estar lá. Precisa de um jeito de
apagar a pessoa quando ela pedir e de não guardar mais do que o necessário.

**S07 · Apagar destrói o histórico 🟠**
Arquivar em vez de apagar. O histórico é a matéria-prima da inteligência do Freedom.

**S08 · WhatsApp bloqueado 🟡**
Muita mensagem igual para quem não te conhece gera denúncia e bloqueio do número. Se o Freedom um dia
mandar sozinho, o limite por dia tem que ser regra do sistema.

---

## 6. Perguntas para você

Responda quando quiser, no meio de qualquer desabafo. Quando uma for respondida, ela sai daqui e a
resposta vai para o recurso.

**Sobre o Freedom**
- **P1.** Quem vai usar o Freedom? Só você, você e uma equipe, ou os clientes também?
- **P2.** Para você, "automatizada" quer dizer o quê? A IA faz e você aprova, ou a IA toca sozinha e
  você só olha os números?
- **P3.** Que serviços a agência vende hoje? (redes sociais, anúncios, site, prospecção para cliente...)

**Sobre a ferramenta de tarefas**
- **P4.** Um quadro por cliente, ou um quadro por área com o nome do cliente na tarefa?
- **P5.** A IA pode ser responsável por tarefa?
- **P6.** Arte e vídeo: basta colocar o link do Google Drive na tarefa, ou precisa subir o arquivo?
- **P7.** Você usa alguma ferramenta de tarefas hoje (Trello, ClickUp, Notion, planilha)? O que funciona
  e o que irrita?
- **P8.** A prospecção e as tarefas podem ficar no mesmo sistema, com tudo numa agenda só?
