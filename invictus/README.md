# Invictus Prospect Template

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Powered by Claude Code](https://img.shields.io/badge/powered%20by-Claude%20Code-D97757)](https://claude.ai/code)
[![Supabase](https://img.shields.io/badge/sync-Supabase-3ECF8E)](https://supabase.com)
[![Playwright](https://img.shields.io/badge/playwright-Chromium-2EAD33)](https://playwright.dev/python/)

Pipeline de prospecção B2B local, executado pelo Claude Code. Você
descreve um segmento e uma cidade. O pipeline roda nove fases encadeadas
(Google Places, dedup, scraping CNPJ, BrasilAPI, rapport via IA,
validação real de WhatsApp, checagem Meta Ad Library, consolidação) e
entrega um CRM kanban estático com sync opcional via Supabase.

> **Demo pública (LP)**: https://invictus-prospect-template.vercel.app

## Por que este projeto existe

Prospecção B2B local boa exige juntar dados de quatro ou cinco fontes
diferentes, validar sinais (WhatsApp ativo? anuncia? quem é o dono?) e
ainda manter um pipeline humano de follow-up. Fazer isso na mão consome
horas. Plataformas de prospecção que prometem automatizar tudo cobram
caro e travam você no formato delas.

Este template é o caminho do meio: você roda no Claude Code, em qualquer
nicho, com seus próprios dados, e fica dono de tudo. Sem mensalidade,
sem trava, sem multi-tenancy. Open source MIT.

## Quickstart

```bash
git clone https://github.com/maauricioozy/invictus-prospect-template
cd invictus-prospect-template
./setup.sh                 # Windows: powershell -ExecutionPolicy Bypass -File .\setup.ps1
# Edite o .env recém-criado com sua chave Google Places (e opcional Supabase)
claude < PROMPT.md
```

O `setup.sh` cria a venv, instala dependências, baixa Chromium do
Playwright e prepara o `.env`. Em cinco minutos você está pronto para
rodar a primeira execução.

## Como funciona

```
   Google Places API
          ↓
       merge.py            (dedup + filtro regional)
          ↓
    fase_a_cnpj.py         (CNPJ via scraping de rodapé)
          ↓
   fase_b_brasilapi.py     (razão social, sócios, porte)
          ↓
   subagentes Claude Code  (rapport humano + gancho comercial)
          ↓
  fase_d_wa_validar.py     (Evolution API — opcional)
          ↓
  fase_e_anuncia_real.py   (Playwright + Meta Ad Library)
          ↓
   consolidate_v2.py       → leads_final.json
          ↓
   fase_sync_supabase.py   (incremental — opcional)
          ↓
    build_html_v2.py       → index.html (CRM Kanban)
          ↓
        vercel deploy      → URL privada do CRM
```

Cada fase é um script Python independente. Você pode rodar sozinhos para
debugar, ou deixar o Claude Code orquestrar tudo via `PROMPT.md`.

## Mensagens assistidas por IA, opcional

A bancada de mensagens cria três rascunhos por lead: direta, gancho real
e diagnóstica. Ela usa apenas fatos enumerados pelo pipeline, registra as
evidências usadas e aplica validações determinísticas antes de mostrar o
texto no CRM. A saída é sempre `draft_only`: não há envio automático nem
condução autônoma de conversa.

```bash
cp outreach_campaign.example.json outreach_campaign.json
# personalize a campanha e configure OPENAI_API_KEY no .env
python generate_outreach.py --dry-run
python generate_outreach.py --limit 10
python build_html_v2.py
```

Por padrão, o adapter usa `gpt-5.6-luna`, adequado a uma etapa repetitiva
e sensível a custo. Troque `OPENAI_MODEL` no `.env` para usar outro modelo
compatível com [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
Consulte o [catálogo de modelos](https://developers.openai.com/api/docs/models)
antes de fixar o modelo em produção. Contextos inalterados são preservados;
use `--force` somente quando quiser regenerar tudo.

No CRM, cada rascunho mostra as evidências, bloqueios e estado de revisão.
O botão do WhatsApp só é liberado depois da aprovação humana. Abrir o link
apenas preenche a mensagem no WhatsApp, sem confirmar ou executar o envio.

## Modo incremental (Supabase)

Na primeira execução, todos os leads entram com `status = "novo"`.
Da segunda em diante, o pipeline:

- Identifica leads já existentes via CNPJ ou WhatsApp
- Atualiza apenas campos voláteis (nota Maps, contagem de anúncios Meta)
- **Preserva** seu trabalho: status, notas, atividade, rapport
- Marca leads novos com badge vermelho "Novo" no CRM
- Registra cada rodada em `execucoes` (consultável no header do CRM)

Sem Supabase configurado, o CRM funciona local via localStorage. Com
Supabase, ganha sync entre dispositivos: rode o pipeline no laptop,
acompanhe o pipeline pelo celular.

Cada usuário cria o próprio projeto Supabase grátis. **Sem multi-tenancy
e sem servidor compartilhado.** Veja o passo a passo em
[`supabase/README.md`](supabase/README.md).

## CRM incluso

Quando o pipeline termina, o `build_html_v2.py` gera um `index.html`
único e autocontido com todos os seus leads embutidos. Recursos:

- Kanban de oito colunas, incluindo Proposta enviada e Sem resposta
- Drag-and-drop entre colunas com persistência automática
- Dossiê slide-in com cinco abas (Geral, Rapport, Ganchos, Mensagens IA, Atividade)
- Aba Mensagens IA com edição, aprovação, cópia e abertura manual do WhatsApp
- Cadência sugerida de sete dias: abordagem, follow-up em D+1, D+3 e D+5
- Próximo passo com badges de planejado, hoje e atrasado
- Filtro "Follow-ups do dia" e registro de motivo de perda
- Command palette `Cmd+K` / `Ctrl+K` para busca instantânea
- Filtros chips (com Instagram, WhatsApp validado, dono identificado, CNPJ, anuncia Meta, prioridade alta)
- Filtro "Apenas não contactados" ativo por padrão em modo cloud
- Export CSV com status e notas
- Mobile responsivo
- Tema dark/light alternável

A LP pública mostra o CRM em ação; os dados que você gera nunca saem
da sua máquina e do seu Supabase.

> **Segurança:** `index.html` contém os dados dos leads e, quando a bancada
> opcional é usada, também contém os rascunhos. Não publique um CRM real em
> URL pública. Use controle de acesso e nunca versione `leads_final.json`,
> `outreach_campaign.json`, `outreach_drafts.json`, `.env` ou `index.html`.
> Consulte a [política de segurança](SECURITY.md) para reportar vulnerabilidades
> sem expor credenciais, dados pessoais ou detalhes de exploração.

## Stack

- **Python 3.10+** para o pipeline (requests, python-dotenv, Playwright, BeautifulSoup4, opcional psycopg2-binary)
- **Claude Code** como orquestrador, com cinco subagentes paralelos para enriquecimento
- **OpenAI Responses API** opcional para rascunhos estruturados e auditáveis
- **HTML estático autocontido** para o CRM, sem build step
- **Tailwind via CDN**, **Sortable.js via CDN**, **supabase-js via CDN**
- **Plus Jakarta Sans + Inter** via Google Fonts
- **Supabase** opcional para sync e modo incremental
- **Evolution API** opcional para validação real de WhatsApp
- **Vercel** opcional para hospedagem do CRM gerado

## Customização

O `PROMPT.md` tem três variáveis parametrizáveis:

```
[AGENCIA]   — sua marca, aparece no header e no CSV exportado
[SEGMENTO]  — academias, clínicas, escolas, advocacia, restaurantes...
[CIDADE]    — qualquer cidade do Brasil que esteja no Google Maps
```

Funciona para qualquer nicho local presente no Google Maps. O autor já
testou em certificadoras digitais e oftalmologia; outros segmentos
viáveis: clínicas odontológicas e veterinárias, autoescolas, estúdios de
pilates, restaurantes, buffets, advogados, contadores, oficinas, salões
de beleza.

Para mudar a paleta visual, edite `template_crm.html` (Tailwind config
no topo). Para mudar o conjunto de fases, ajuste o `PROMPT.md` e os
scripts correspondentes.

## Limitações conhecidas

- **Google Ads Transparency Center**: a verificação pública é opcional
  para anunciantes não políticos no Brasil, então `anuncia_google` será
  `nao` na maioria dos casos. Não é falso negativo: a fonte é incompleta.
- **Validação WhatsApp**: depende de uma instância Evolution API
  auto-hospedada. Sem ela, a Fase D registra apenas "provável" baseado
  no DDD.
- **Playwright**: requer Chromium instalado localmente (cerca de 200 MB).
  O `setup.sh` faz isso automaticamente.
- **Custo Google Places**: cada query consome quota. Comece com cidades
  pequenas e nichos específicos para calibrar o gasto.

## Roadmap

- v1.3 — busca SERP via Playwright como complemento ao Google Places
- v1.4 — modo "campanha" com cohorts de leads e métricas de conversão
- v1.5 — exportação direta para CRMs externos (Pipedrive, HubSpot, Notion)

Sugestões? Abra uma issue.

## Contribuir

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o guia completo. Em resumo:

- Issue antes de PR grande, PR direto para fix óbvio.
- PT-BR com acentuação, sem emoji, sem travessão.
- Lint passa (`flake8`).
- Não commit dados de cliente nem `.env`.

## Licença

[MIT](LICENSE). Use, adapte, cobre pela execução para seus clientes se
quiser. Pede-se apenas manter o crédito ao autor em algum lugar do
entregável.

---

Método aberto por **Maurício Ribeiro**, sócio da Ethos Growth.
[ethosgrowth.com.br](https://ethosgrowth.com.br) ·
[LinkedIn](https://www.linkedin.com/in/maumarketingdigital/)
