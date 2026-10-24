# Rodada Cris Márcia: advogados no estado de SP

Versão do `PROMPT.md` já preenchida para a Cris Márcia. Numa sessão do Claude Code com a
chave do Google e a internet liberadas, basta pedir: **"rode o PROMPT_CRIS_MARCIA.md da pasta invictus"**.

O recorte (marca, nicho, estado, cidades, buscas e filtros) fica em `recorte.py`. Os valores
podem ser trocados pelo `.env`, sem editar código.

## O que precisa estar pronto antes

- Variável `GOOGLE_PLACES_API_KEY` no ambiente, com a "Places API (New)" ativada no Google Cloud.
- Acesso de rede completo. O pipeline visita o Google, os sites dos escritórios, a BrasilAPI e a Meta Ad Library.
- Python 3.10 ou superior, com `pip install -r requirements.txt` e `python -m playwright install chromium`.
  Nos ambientes em nuvem do Claude Code, o Chromium já vem instalado.

---

## Prompt

Você vai executar o pipeline de prospecção do Invictus Prospect Template, adaptado.

- Agência: **Cris Márcia**
- Segmento alvo: **escritórios de advocacia e advogados**
- Região: **todo o estado de São Paulo**, nas cidades listadas em `recorte.py`
- Meta: até 100 leads (`LEADS_ALVO`), no máximo 12 por cidade (`MAX_POR_CIDADE`)

Trabalhe dentro da pasta `invictus/`. Entre as fases, mostre um resumo curto. Se algo falhar,
investigue antes de seguir. Nunca invente dados: campo não encontrado fica vazio ou "nao_encontrado".

1. **Fase 01, extração:** `python extrator.py --estado`. Ele faz duas buscas por cidade e salva
   tudo em `prospects/`. Se a chave der erro 403, pare e explique qual configuração do Google falta.
2. **Fase 02, merge:** `python merge.py`. Confira se há leads de várias regiões do estado.
3. **Fase 03, CNPJ:** `python fase_a_cnpj.py`.
4. **Fase 04, BrasilAPI:** `python fase_b_brasilapi.py`.
5. **Fase 05, contexto via IA:** `python gerar_lotes_v2.py` e depois um subagente
   `general-purpose` por lote em `lotes_v2/`, em paralelo. Cada subagente segue a Fase 05 do
   `PROMPT.md` e salva `lotes_v2/enriched_v2_N.json`, com este contexto do nicho:
   - Escritórios de advocacia seguem o **Provimento 205/2021 da OAB**: publicidade só
     informativa, sem captação ou mercantilização. Anúncio pago é permitido com moderação.
     Por isso, ganchos sobre "anunciar mais" devem falar de presença e autoridade (site,
     Google Meu Negócio, conteúdo jurídico no Instagram, respostas a avaliações), não de promoção.
   - Identifique a área de atuação principal (trabalhista, previdenciário, família, criminal,
     tributário, empresarial, cível) e se é advogado solo ou sociedade.
   - O "dono" é o sócio ou advogado titular. Use o QSA da BrasilAPI ou o nome no site ou no Instagram.
     O número da OAB, quando estiver público no site, pode ir em `rapport_humano`.
6. **Fase 06, WhatsApp:** pule. Não há Evolution API. O CRM mostra "não verificado".
7. **Fase 08, consolidação:** `python consolidate_v2.py`.
8. **Fase 07, anúncios Meta:** `python fase_e_anuncia_real.py`, que lê o `leads_final.json`.
   Depois rode `python consolidate_v2.py` de novo para incorporar o resultado.
9. **Fase 09, build:** `python build_html_v2.py`. Ele gera o `index.html` com as cores da Cris Márcia.
10. **Entrega:** publique o `index.html` como página privada no Claude (Artifact), em vez de usar a Vercel,
    e entregue o link. Não faça commit dos dados de leads: o `.gitignore` já os exclui.

### Opção sem custo (sem chave do Google)

Se não houver `GOOGLE_PLACES_API_KEY`, troque a Fase 01 por pesquisa do próprio Claude:

1. Divida as cidades do `recorte.py` em grupos de 5 a 8 e dispare um subagente `general-purpose`
   por grupo, em paralelo. Cada um usa só busca na web (WebSearch) e leitura de páginas públicas
   (WebFetch): sites dos escritórios, Google Meu Negócio, diretórios jurídicos e a página de
   contato de cada escritório.
2. Cada subagente salva `prospects/<AAAA-MM-DD>_ia_grupoN.csv` com as colunas
   `nome,categoria,endereco,telefone,whatsapp,celular,whatsapp_status,site,score,fonte`.
   - `endereco` no formato do Google: `Rua, número - Bairro, Cidade - SP`.
   - `whatsapp` é preenchido só quando o próprio escritório divulga o número como WhatsApp
     (`55` + DDD + número). Nesse caso, `celular` fica `Sim`; nos outros, `Não`.
   - `score` vai de 0 a 100, conforme a solidez da presença pública (site próprio, avaliações, tempo de mercado).
   - `fonte` traz a URL de onde o dado saiu. Sem fonte, o lead não entra.
   - Use só dados profissionais divulgados pelo próprio escritório ou advogado. Nada de perfis
     pessoais nem de números que não estejam publicados como contato profissional.
3. Continue normalmente pela Fase 02 (`python merge.py`).

### Lista própria de contatos

Para uma lista de WhatsApps que a Cris Márcia já tem: `python importar_contatos.py <arquivo> --montar`.
Isso organiza, remove repetidos, marca a região pelo DDD e gera o CRM. Não pesquise a vida dos
donos de números pessoais. No máximo, confira se o número aparece publicamente como contato
de um escritório.

Regras:
- NUNCA envie mensagens automaticamente. O CRM só abre o WhatsApp para a pessoa revisar e enviar.
- Dados pessoais (nome de sócio, telefone) são só para abordagem comercial B2B, de acordo com a LGPD.
  Quem pedir para não ser contatado vai para "Perdeu", com uma nota.

---

Método aberto do [Invictus Prospect Template](https://github.com/maauricioozy/invictus-prospect-template),
de Maurício Ribeiro (Ethos Growth), licença MIT. Esta é uma adaptação.
