# Freedom · instruções para o Claude

O dono desta pasta está desenhando o **Freedom**, uma IA que vai ser uma agência de marketing 100%
automatizada. Durante 1 a 2 semanas ele vai "desabafar" recursos soltos. Tudo fica num arquivo só:
`Freedom/CADERNO-DE-DESABAFOS.md`.

O dono não é técnico. Escreva em português simples, sem jargão, e explique qualquer termo técnico.

## Quando chegar um desabafo novo

(Desabafo é qualquer mensagem descrevendo algo que o Freedom deve fazer.)

1. **Seção 1 (Desabafos):** cole o texto **como ele disse**, sem reescrever, no topo da seção, com
   número seguido, data e tema. Embaixo, "O que o Claude entendeu".
2. **Seção 2 (Recursos):** crie ou atualize a ficha do recurso (próximo número R0x) e a tabela.
3. **Seção 3 (Cruzamentos):** cruze o recurso novo com **todos** os anteriores. Atualize a matriz,
   escreva cada cruzamento com a inteligência que ele gera, e confira a tabela "Cruzamentos esperando
   recurso".
4. **Seções 4 e 5:** anote integrações e alertas de segurança.
5. **Seção 6:** o que ficou em aberto vira pergunta. Se o desabafo responder uma pergunta antiga, tire
   ela de lá e leve a resposta para a ficha do recurso.
6. Atualize a tabela "Resumo" do topo.
7. Salve no Git e envie (commit + push) para o branch da sessão.
8. Atualize a página de leitura no Claude: publique de novo, no mesmo endereço, a página
   https://claude.ai/artifact/XC8zKiFRmBBsgZhuDuHFUp com o conteúdo novo. Rode
   `python3 Freedom/.pagina/gerar.py` e publique `Freedom/.pagina/caderno.html` passando esse endereço em `url`
   (leia a página antes com a ferramenta Artifact, ação "read").
9. Responda ao dono em poucas linhas: o que entrou, os cruzamentos novos mais interessantes e as
   perguntas novas.

Nada é descartado nesta fase. Não comece a construir o Freedom até o dono pedir.
