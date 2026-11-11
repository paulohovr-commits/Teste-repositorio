# Freedom: caderno de desabafos

**Freedom** vai ser uma IA que funciona como uma agência de marketing automatizada.

Nesta fase a gente ainda não constrói nada. Durante 1 a 2 semanas, você desabafa aqui sobre tudo o que
quer que o sistema faça. O meu trabalho é anotar cada desabafo, entender qual recurso está por trás dele
e já ir pensando nas integrações que vamos precisar e nos riscos de segurança.

## Como o caderno está organizado

| Arquivo | O que tem lá |
|---|---|
| [DESABAFOS.md](DESABAFOS.md) | Diário, em ordem de data. Cada desabafo fica registrado com as suas palavras, mais um resumo do que eu entendi. Nada é apagado. |
| [RECURSOS.md](RECURSOS.md) | O catálogo de recursos. Cada recurso tem um código (`R-001`), uma descrição, de qual desabafo ele veio, as integrações, os alertas e as dúvidas em aberto. |
| [INTEGRACOES.md](INTEGRACOES.md) | Todas as ferramentas e APIs externas que vão aparecendo, e quais recursos dependem de cada uma. |
| [SEGURANCA.md](SEGURANCA.md) | Os alertas de segurança, privacidade (LGPD) e risco de negócio, cada um com a gravidade e uma proposta de proteção. |
| [PERGUNTAS.md](PERGUNTAS.md) | As dúvidas que eu preciso que você responda quando puder. Sem pressa. |

## Como funciona

1. Você desabafa do jeito que vier: áudio transcrito, texto corrido, lista, reclamação, ideia solta.
2. Eu registro o desabafo em `DESABAFOS.md` e transformo o que der em recursos, integrações e alertas.
3. Quando um desabafo mudar ou contradisser um anterior, eu atualizo o recurso e anoto a mudança.
   O histórico fica guardado.
4. No fim das 2 semanas, este caderno vira a base do documento de requisitos e do plano de construção.

## Códigos usados

- `D-001`: desabafo
- `R-001`: recurso
- `I-001`: integração
- `S-001`: alerta de segurança
- `P-001`: pergunta em aberto

**Status de um recurso:** 💡 ideia (só citado) · 🧩 entendido (já sei o que faz) · ✅ fechado (você confirmou) · ⏸️ adiado · ❌ descartado

**Gravidade de um alerta:** 🔴 crítico · 🟠 alto · 🟡 médio · 🟢 baixo
