# 001 — Ferramenta de tarefas

**Data:** 2026-11-11

## O que foi dito
> "Eu quero construir uma ferramenta de tarefas."
> Contexto geral: o Freedom é uma IA que será uma agência de marketing automatizada e vai gerenciar 100% da agência.

## Recurso entendido
Um sistema de tarefas que será o **esqueleto operacional** da agência. Pela visão de "gerenciar 100%", ele provavelmente não é só uma lista de afazeres: é onde todo trabalho da agência passa a existir, ser atribuído, acompanhado e entregue.

> Detalhes ainda não informados: quem executa as tarefas (pessoas, IA ou ambos), se há clientes com acesso, se há prazos/aprovações. Vou preencher conforme os próximos desabafos.

## Cruzamentos (onde está a inteligência)
Hipóteses, a confirmar quando outros recursos surgirem:

- **Tarefas × Clientes**: toda tarefa pertence a um cliente, permitindo ver carga de trabalho e rentabilidade por cliente.
- **Tarefas × Tempo**: tempo gasto por tarefa revela o custo real de cada cliente/serviço.
- **Tarefas × Financeiro**: cruzar horas gastas com o valor do contrato mostra quais clientes dão prejuízo.
- **Tarefas × Prazos/Calendário**: alertas de atraso antes de acontecer.
- **Tarefas × Equipe**: distribuição de carga, evitando sobrecarga e ociosidade.
- **Tarefas × IA**: a IA criar tarefas sozinha a partir de um briefing, reunião ou mensagem do cliente; e executar as repetitivas (relatórios, rascunhos de posts).
- **Tarefas × Modelos de serviço**: cada serviço vendido (ex.: gestão de tráfego, social media) gera automaticamente um pacote de tarefas recorrentes.
- **Tarefas × Aprovação do cliente**: tarefa só conclui após aprovação.
- **Tarefas × Histórico**: aprender quanto tempo cada tipo de tarefa realmente leva para estimar melhor futuras entregas.

## Integrações prováveis
- Calendário (Google Calendar / Outlook)
- Comunicação (WhatsApp, e-mail, Slack)
- Armazenamento de arquivos (Google Drive)
- Plataformas de anúncios (Meta Ads, Google Ads), para tarefas ligadas a campanhas
- Financeiro/cobrança (a definir)

## Alertas de segurança
- **Permissões por cliente**: um membro da equipe (ou cliente) só deve ver tarefas e arquivos dos clientes que lhe cabem. Definir isso desde o início é muito mais fácil que consertar depois.
- **Dados pessoais (LGPD)**: tarefas costumam conter nomes, contatos e dados de campanhas dos clientes.
- **Log de auditoria**: registrar quem criou, alterou ou apagou tarefas.
- **Se a IA agir sozinha**: limitar o que ela pode fazer sem aprovação humana (ex.: nunca publicar ou gastar verba sem confirmação).

## Perguntas em aberto
1. Quem usa o sistema: só você, sua equipe, os clientes também?
2. As tarefas serão executadas por pessoas, pela IA, ou ambos?
3. Tarefas recorrentes por cliente (ex.: "post semanal") são importantes?
4. Hoje você usa alguma ferramenta de tarefas (Trello, Notion, Asana)? O que te incomoda nela?
