# Mapa de integrações

## Confirmadas

Integrações que algum desabafo já pediu de forma clara.

| Código | Ferramenta / API | Para quê | Recursos | Observações |
|---|---|---|---|---|
| | *(nenhuma ainda)* | | | |

## Vistas na foto de referência (D-002)

Estas ferramentas estão na tela de integrações do Jarvis. Elas entram na lista de confirmadas quando você
responder a [P-005](PERGUNTAS.md).

| Ferramenta | Para quê (como aparece na foto) |
|---|---|
| Hotmart | Vendas e assinaturas |
| Data Crazy | CRM: negócios e closers |
| ActiveCampaign | E-mail, contatos e tags |
| Curseduca | Plataforma de cursos: acesso e engajamento |
| Circle | Comunidade: acesso liberado e cortado |
| Resend | E-mail que o sistema manda (com remetentes separados) |
| WhatsApp oficial | Mensagens da secretária pela API da Meta |
| Google Search Console | Orgânico: consultas e páginas |

## Hipóteses

São integrações que uma agência de marketing automatizada costuma precisar. **Ainda não foram pedidas.**
Elas só passam para "Confirmadas" quando um desabafo pedir.

| Área | Candidatas | Comentário |
|---|---|---|
| Cérebro da IA | API do Claude (Anthropic) | Escrever textos, analisar contas e conversar com clientes. |
| Redes sociais | Meta Graph API (Instagram e Facebook), TikTok, LinkedIn | Publicar, agendar, ler métricas e responder comentários. A Meta exige um app aprovado em revisão. |
| Anúncios | Meta Ads, Google Ads | Criar e acompanhar campanhas. Mexe com dinheiro do cliente (ver S-003). |
| Mensagens | WhatsApp Business Platform (API oficial da Meta) | Atendimento e follow-up. Use a API oficial: soluções não oficiais podem fazer o número ser banido. |
| Presença local | Google Business Profile | Posts, avaliações e respostas no perfil do Google. |
| Imagem e vídeo | Geradores de imagem e vídeo, Canva | Criativos. Atenção a direitos de uso e de imagem. |
| Dados e banco | Supabase (já usado neste repositório) | Pode ser a base do Freedom e aproveitar o que já existe. |
| Cobrança | Stripe, Asaas, Mercado Pago | Só se o Freedom for vendido a clientes. |
| Relatórios | Google Analytics 4, Looker Studio | Relatórios automáticos para o cliente. |

## Campos que cada API pede

Estes são os campos que o card de cada ferramenta vai pedir na Central de Integrações (R-001).
🔒 marca um campo secreto: ele é só escrita, vai para o cofre e nunca volta para a tela nem para a IA.
Os itens marcados "confirmar" precisam ser checados na documentação oficial da ferramenta antes de construir.

| Ferramenta | Como conecta | Campos do card | Observações |
|---|---|---|---|
| Hotmart | Credenciais de desenvolvedor | Client ID · 🔒 Client Secret · 🔒 Basic Token · 🔒 Hottok (do webhook) | O Hottok serve para conferir que o aviso de venda veio mesmo da Hotmart (S-008). |
| Data Crazy | Token de API | 🔒 Token de API | Confirmar na documentação. |
| ActiveCampaign | Chave de API | URL da API da conta (ex.: `https://suaconta.api-us1.com`) · 🔒 API Key | As duas ficam em Configurações → Desenvolvedor, no ActiveCampaign. |
| Curseduca | Chave de API | 🔒 Chave de API · endereço da plataforma | Confirmar na documentação. |
| Circle | Token da API de administrador | 🔒 Token da Admin API · ID ou domínio da comunidade | A API depende do plano (a foto mostra o Business com 5.000 chamadas por mês). O card precisa mostrar o consumo da cota. |
| Resend | Chave de API | 🔒 API Key · domínio verificado · lista de remetentes (nome e e-mail de cada um) | O domínio precisa estar verificado (SPF/DKIM) para os e-mails não caírem em spam. |
| WhatsApp oficial (Cloud API da Meta) | App da Meta + usuário do sistema | 🔒 Token de acesso permanente · Phone Number ID · WhatsApp Business Account ID · 🔒 App Secret · 🔒 Token de verificação do webhook | Use só a API oficial. O App Secret confere a assinatura dos avisos (S-008). |
| Google Search Console | Login com Google (OAuth) | Botão "Entrar com Google" · escolha da propriedade (site) | Não pede token na mão. Só leitura. |
| Meta Ads / Instagram (hipótese) | Login com Facebook (OAuth) | Botão "Entrar com Facebook" · escolha da conta de anúncio e da página | Exige app aprovado na revisão da Meta. |
| Google Ads (hipótese) | OAuth + token de desenvolvedor | Botão "Entrar com Google" · ID da conta (Customer ID) · 🔒 Developer Token | O Developer Token é aprovado pelo Google. |
| Claude (hipótese) | Chave de API | 🔒 API Key | É o cérebro da IA. Esta chave também nunca vai para o chat. |

## Notas por integração

Cada integração confirmada ganha aqui uma ficha: autenticação, limites de uso, custo, exigências de revisão
e o que acontece se ela cair.
