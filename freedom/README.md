# Freedom: o caderno de desabafos

**Freedom** é a IA que vai virar uma agência de marketing automatizada e gerenciar 100% da agência.

Por enquanto não é software. É **um caderno**: por 1 a 2 semanas você desabafa tudo o que quer que o
sistema faça, e o Claude anota, organiza e cruza. Só depois disso, com a visão do todo, a construção começa.

## Como funciona

1. **Você desabafa.** Do jeito que vier: áudio transcrito, frase solta, ideia pela metade. Não precisa organizar.
2. **O Claude guarda o desabafo do jeito que você disse** em `desabafos/`, com data, sem reescrever.
3. **O Claude extrai o recurso** e cria ou atualiza a ficha dele em `RECURSOS.md`.
4. **O Claude cruza o recurso novo com todos os que já existem** e registra em `CRUZAMENTOS.md` a
   inteligência que surge quando os dois conversam.
5. **Integrações e alertas de segurança** de cada recurso entram em `INTEGRACOES.md` e `SEGURANCA.md`.
6. **O que ficou em aberto** vira pergunta em `PERGUNTAS.md`. Você responde quando quiser, no próximo desabafo.

Regra do caderno: **nada é descartado nesta fase.** Ideia repetida reforça a outra; ideia contraditória
vira pergunta.

## Os arquivos

| Arquivo | O que tem |
|---|---|
| [`desabafos/`](desabafos/) | Cada desabafo, com data, nas suas palavras |
| [`RECURSOS.md`](RECURSOS.md) | Uma ficha por recurso: o que é, o que guarda, com quem conversa |
| [`CRUZAMENTOS.md`](CRUZAMENTOS.md) | A matriz de quem conversa com quem e a inteligência de cada cruzamento |
| [`INTEGRACOES.md`](INTEGRACOES.md) | Serviços de fora que o sistema vai precisar (Meta, Google, WhatsApp...) |
| [`SEGURANCA.md`](SEGURANCA.md) | Os alertas: dado de cliente, senhas, LGPD, o que a IA pode e não pode fazer sozinha |
| [`PERGUNTAS.md`](PERGUNTAS.md) | Decisões que só você pode tomar |

## Placar

| | |
|---|---|
| Desabafos | 1 |
| Recursos anotados | 1 (+ 3 que já existem no repositório) |
| Cruzamentos mapeados | 9 |
| Integrações | 7 |
| Alertas de segurança | 8 |
| Perguntas em aberto | 8 |

## O que já existe neste repositório (e entra no Freedom)

Antes do caderno começar, já foram construídas três peças. Elas são os primeiros "órgãos" do Freedom:

- **Prospecção** (`app/`, `lib/`, `supabase/`): Kanban de leads em Next.js + Supabase, com funil, agenda de
  contato, importação de leads e WhatsApp.
- **Manual do Tarefas** (`docs/TAREFAS-MANUAL-DE-CONSTRUCAO.md`): a especificação, em 11 fases, de um
  Kanban de equipe já testado em produção. A Prospecção foi construída das fases 0 a 5 dele.
- **Painel de cliente** (`painel/`, `organizador/`): o painel da Cris Márcia, com fila de contatos, metas
  diárias, mensagens prontas e os escritórios pesquisados pelo Claude.
