# Alertas de segurança

Uma agência guarda dado de cliente, senha de rede social e dinheiro de anúncio. Uma IA que age sozinha
multiplica o estrago de qualquer erro. Cada alerta diz o risco, de onde vem e o que fazer.

**Gravidade:** 🔴 resolver antes de ir para produção · 🟠 resolver antes de escalar · 🟡 ficar de olho

| # | Alerta | Gravidade | Recurso |
|---|---|---|---|
| S01 | O que a IA pode fazer sozinha | 🔴 | R01 |
| S02 | Um cliente nunca vê o dado de outro | 🔴 | R01, R00b |
| S03 | Senhas e acessos dos clientes | 🔴 | R01 |
| S04 | A chave `service_role` e as chaves de API | 🔴 | R00c |
| S05 | Regra só na tela não é regra | 🟠 | todos |
| S06 | LGPD: dado pessoal de lead | 🟠 | R00a, R00b |
| S07 | Apagar destrói histórico | 🟠 | R01 |
| S08 | WhatsApp: número banido | 🟡 | R00a, R00b |

## S01 · O que a IA pode fazer sozinha 🔴
Se o Freedom pega tarefas, ele precisa de um limite claro. Proposta de três níveis por tipo de tarefa:
**faz sozinho** (pesquisar, rascunhar, organizar), **faz e um humano aprova** (publicar, mandar mensagem
para cliente) e **nunca sozinho** (gastar dinheiro em anúncio, apagar, mudar acesso, falar em nome da
agência sobre preço ou contrato). Toda ação da IA fica no histórico com "feito pelo Freedom".
Cuidado extra: texto vindo de fora (comentário do cliente, site de lead, e-mail) nunca pode virar ordem
para a IA. É o golpe de "injeção de instrução".

## S02 · Um cliente nunca vê o dado de outro 🔴
Quando o cliente entrar no painel (C02), a trava tem que estar **no banco** (Row Level Security), não
só na tela. A Base comum já faz isso por quadro; o Freedom precisa fazer também por cliente.

## S03 · Senhas e acessos dos clientes 🔴
Agência vive pedindo senha de Instagram, Meta Ads e Google. Isso **nunca** vai em descrição de tarefa,
comentário ou checklist (todo mundo do quadro lê e fica no histórico para sempre). Precisa de um cofre
separado, ou melhor ainda: pedir acesso de parceiro (Business Manager da Meta, acesso de gerente no
Google) em vez de senha.

## S04 · A chave `service_role` e as chaves de API 🔴
A `service_role` do Supabase ignora todas as travas. Ela e a chave da IA, do Resend e do WhatsApp só
existem no servidor, nunca com prefixo `NEXT_PUBLIC_` e nunca no repositório.

## S05 · Regra só na tela não é regra 🟠
Lição 1 do manual: o tempo "privado" podia ser lido pela API enquanto morava na mesma tabela das tarefas.
Toda regra de "só o dono vê" ou "só o cliente X vê" tem que ter tabela e policy próprias.

## S06 · LGPD: dado pessoal de lead 🟠
A Prospecção e o painel guardam nome, WhatsApp e informações de pessoas que não pediram para estar
lá. Precisa: base legal (legítimo interesse, com cuidado), um jeito de apagar a pessoa quando ela pedir,
e não guardar mais do que o necessário.

## S07 · Apagar destrói histórico 🟠
`on delete cascade` no tempo trabalhado apaga métrica junto com a tarefa (manual, armadilha 5). Arquivar,
não apagar. Vale em dobro para o Freedom: o histórico é a matéria-prima da inteligência (C06).

## S08 · WhatsApp: número banido 🟡
Mandar muita mensagem igual para quem não te conhece gera denúncia e bloqueio do número. O painel da
Cris Márcia já tem meta diária baixa por isso. Se o Freedom um dia mandar sozinho, o limite tem que ser
regra do sistema.
