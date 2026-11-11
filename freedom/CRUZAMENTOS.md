# Cruzamentos

Aqui fica a inteligência: o que o Freedom passa a saber ou fazer quando dois recursos conversam.
A cada recurso novo, o Claude passa ele contra todos os anteriores.

## A matriz

Cada casa mostra o cruzamento entre os dois recursos. Vazio quer dizer que ainda não há nada útil ali.

| | R00a Prospecção | R00b Painel de cliente | R00c Base comum | R01 Tarefas |
|---|---|---|---|---|
| **R00a Prospecção** | | C07 | | C01, C08 |
| **R00b Painel de cliente** | C07 | | | C02 |
| **R00c Base comum** | | | | C05, C06 |
| **R01 Tarefas** | C01, C08 | C02 | C05, C06 | C03, C04, C09 |

## Os cruzamentos

### C01 · Tarefas × Prospecção: cliente fechado já nasce trabalhando
Quando o lead cai em **Fechado**, o Freedom cria sozinho o quadro do cliente com as tarefas de
onboarding (coletar acessos, briefing, reunião de kickoff, primeiro mês de conteúdo). E os follow-ups da
prospecção entram **na mesma agenda** das tarefas: você abre um lugar só de manhã.
**Inteligência:** quanto tempo passa entre o "sim" do cliente e a primeira entrega.

### C02 · Tarefas × Painel de cliente: o cliente vê o que está sendo feito
O painel do cliente mostra as tarefas dele (só as dele): o que está em produção, o que está esperando
aprovação, o que foi entregue no mês. O cliente aprova direto no painel e a tarefa anda sozinha.
**Inteligência:** quais clientes demoram para aprovar e quanto isso atrasa a agência.

### C03 · Tarefas × Tempo trabalhado: quanto cada cliente custa de verdade
O cronômetro (manual, F06) soma horas por tarefa. Somando por cliente e cruzando com o valor que ele paga
(quando existir o recurso financeiro), aparece a **margem real por cliente**.
**Inteligência:** "o cliente X paga R$ 2.000 e consome 40 horas por mês: está dando prejuízo."

### C04 · Tarefas × Rotinas: o contrato vira tarefa sozinho
Entrega recorrente ("12 posts por mês", "relatório todo dia 5") vira rotina (manual, F08) e as tarefas
nascem sozinhas no começo do mês.
**Inteligência:** entregue × contratado. Se o mês acabou com 9 de 12 posts, o Freedom avisa antes do
cliente perceber. E o contrário: se a equipe está entregando mais do que o contrato, isso é escopo
crescendo sem cobrar.

### C05 · Tarefas × Base comum (pessoas): a IA como membro da equipe
O Freedom entra na lista de pessoas como um responsável a mais. Pega as tarefas que pode fazer sozinho,
faz, e devolve para um humano aprovar quando a tarefa exige.
**Inteligência:** que parte do trabalho da agência já é feita pela IA, e quantas horas humanas isso libera.

### C06 · Tarefas × Eventos: o histórico vira cérebro
Todo movimento (mudou de coluna, ganhou responsável, recebeu comentário, foi aprovado) fica registrado.
É esse registro que alimenta as automações ("quando entrar em X, faça Y") e os alertas.
**Inteligência:** gargalo por coluna (onde as tarefas ficam paradas) e previsão de atraso.

### C07 · Prospecção × Painel de cliente (já existe)
O painel da Cris Márcia já é isso: a agência faz a pesquisa e a análise de leads **para o cliente**.
No Freedom, o mesmo motor da prospecção da agência vira um serviço vendido.

### C08 · Prospecção × Tarefas (tempo): quanto custa conquistar um cliente
Se as tarefas de prospecção também forem cronometradas, aparece o **custo de aquisição** de cada cliente
em horas, e qual origem de lead (Google, Instagram, indicação) fecha mais rápido.

### C09 · Tarefas × Tarefas: tipos e templates
Cada tipo de tarefa de agência (post, vídeo, campanha, relatório) nasce de um template com checklist.
**Inteligência:** quanto tempo, em média, leva cada tipo. Com isso o Freedom passa a estimar prazo e a
dizer se cabe mais um cliente na equipe.

## Cruzamentos esperando recurso

Recursos que ainda não foram desabafados, mas que as Tarefas já estão esperando. Quando você falar de
algum deles, o cruzamento já está meio pensado:

| Quando você desabafar sobre... | As Tarefas vão... |
|---|---|
| **Financeiro / contratos** | fechar a conta da margem por cliente (C03) e gerar as entregas do contrato (C04) |
| **Calendário de conteúdo** | virar cada post agendado numa tarefa com prazo |
| **Tráfego pago / anúncios** | criar tarefa quando uma campanha cair de desempenho |
| **Relatórios para cliente** | mostrar o que foi entregue no mês, puxado direto das tarefas concluídas |
| **Atendimento / WhatsApp** | transformar pedido do cliente no WhatsApp em tarefa |
| **Equipe / freelancers** | medir carga de cada pessoa e sugerir para quem vai a próxima tarefa |
