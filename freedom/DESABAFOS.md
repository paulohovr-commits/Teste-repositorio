# Diário de desabafos

Os desabafos ficam em ordem de chegada, do mais antigo para o mais novo. A seção "o que você disse"
guarda as suas palavras. A seção "o que eu entendi" é a minha leitura, e você pode corrigir.

---

## D-001 · 11/11/2026 · A ideia

**O que você disse**
> Eu quero construir uma IA chamada Freedom que vai ser uma agência de marketing automatizada.
> Por enquanto, o nosso trabalho é criar um caderno de desabafos. Eu vou passar de 1 a 2 semanas
> desabafando aqui sobre todos os recursos que eu quero que o sistema tenha.

**O que eu entendi**
- O produto se chama **Freedom**. A ideia é que ele faça o trabalho de uma agência de marketing sem
  precisar de uma equipe humana para cada tarefa.
- Ainda não sei quem é o cliente: a própria agência de quem usa (você), os clientes finais dela, ou os dois.
  Isso está na pergunta [P-001](PERGUNTAS.md).
- Este repositório já tem um organizador de prospecção (Kanban com leads, WhatsApp, Instagram e Supabase).
  Pode ser que ele vire uma peça do Freedom. Isso está na pergunta [P-003](PERGUNTAS.md).

**O que saiu daqui:** [R-000](RECURSOS.md#r-000--visão-geral-agência-de-marketing-automatizada) · alertas de base [S-001 a S-006](SEGURANCA.md)

---

## D-002 · 11/11/2026 · Integrações sem senha no chat

**O que você disse**
> No Freedom eu não quero que nenhuma senha ou token seja feita via Claude no chat, via software.
> Eu quero criar campo de integrações onde você vai criar um card de cada ferramenta com os dados
> que a API dela pede. Exemplo na foto.

**A foto de referência** é a tela "Integrações" de outro sistema, chamado Jarvis. O subtítulo diz:
"Conecte as fontes que abastecem o BI. Suas chaves ficam no Cofre, no servidor, nunca no navegador."
A tela tem um card para cada ferramenta: Hotmart, Data Crazy, ActiveCampaign, Curseduca, Circle,
Resend, WhatsApp oficial e Search Console. Cada card mostra:
- o logo, o nome e para que a ferramenta serve (ex.: "Vendas · assinaturas", "CRM · negócios · closers")
- o status ("Conectado"), com a hora da última sincronização
- o que a integração alimenta, ou o aviso "Só conectado, ainda não alimenta nenhuma tela"
- um número da base (ex.: 32.532 vendas, 37.814 contatos, 6.391 alunos ativos)
- a cota de uso do plano, quando existe (Circle: 5.000 chamadas por mês)
- de onde vêm os dados (Circle: "movida a evento da Hotmart, pelas rotas em Conexões")
- no Resend, a lista de remetentes (Financeiro, Tarefas do Kanban, Secretária), com um botão "Trocar"
- os botões "Sincronizar agora" e "Reconfigurar"

Na foto também aparecem nomes e e-mails de pessoas. Eles não foram copiados para este caderno.

**O que eu entendi**
- **Regra de ouro:** senhas, tokens e chaves **nunca passam pelo chat** com a IA, nem com o Claude,
  nem com a própria IA do Freedom. Elas só entram por um formulário do sistema e ficam guardadas num cofre
  no servidor.
- O Freedom precisa de uma tela **Central de Integrações**, com um card por ferramenta. Cada card pede
  exatamente os campos que a API daquela ferramenta exige e mostra a saúde da conexão.
- A tela do Jarvis é o modelo de visual e de informação.

**O que saiu daqui:** [R-001](RECURSOS.md#r-001--central-de-integrações-com-cofre) ·
[S-007](SEGURANCA.md) · [S-008](SEGURANCA.md) · [S-009](SEGURANCA.md) · fichas de campos em
[INTEGRACOES.md](INTEGRACOES.md) · perguntas P-005 a P-008
