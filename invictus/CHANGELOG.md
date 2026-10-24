# Changelog

Todas as mudanças notáveis deste projeto são registradas aqui. O formato
segue [Keep a Changelog](https://keepachangelog.com/) e o projeto adere
ao [SemVer](https://semver.org/).

## [1.2.1] — 2026-09-17

### Corrigido
- Workflow legado de lint volta a ficar verde. A dívida anterior à v1.2 fica
  registrada por arquivo, enquanto o módulo novo permanece sem exceções.
- Assinatura do adapter ajustada para atender ao flake8 sem alterar o contrato.

## [1.2.0] — 2026-09-17

### Adicionado
- Bancada opcional de primeira abordagem assistida por IA.
- Três variantes por lead: direta, gancho real e diagnóstica.
- Saída estruturada pela Responses API e evidências rastreáveis por frase factual.
- Guardrails determinísticos para links, múltiplas perguntas, garantias, emojis,
  travessões, termos bloqueados, tamanho e evidências inexistentes.
- Aba Mensagens IA no CRM, com edição, aprovação humana, cópia e abertura manual
  do WhatsApp. Não existe envio automático.
- Regeneração incremental por hash de contexto e modo `--dry-run` sem chamada de API.
- Testes unitários e CI para Python e JavaScript do template.

### Segurança
- A chave OpenAI é usada apenas no script local e nunca é embutida no HTML.
- Arquivos de campanha, leads, rascunhos e HTML gerado permanecem ignorados pelo Git.
- README agora alerta explicitamente contra publicar dados reais sem controle de acesso.

## [1.1.0] — 2026-09-17

Esta versão transforma o acompanhamento pós-abordagem em um fluxo
operacional dentro do próprio CRM. A implementação passou mais tempo em
uso real antes de voltar ao template público, para que a cadência fosse
publicada com comportamento previsível e migração sem perda do histórico.

### Adicionado
- Cadência sugerida de sete dias, com follow-ups em D+1, D+3 e D+5.
- Agenda editável de próximo passo por lead.
- Badges de follow-up planejado, para hoje e atrasado.
- Filtro "Follow-ups do dia", incluindo pendências vencidas.
- Status "Sem resposta" após o terceiro follow-up.
- Motivo de perda estruturado no dossiê e na exportação CSV.
- Novos campos equivalentes no Supabase, com migração idempotente.

### Alterado
- O estado antigo do localStorage é normalizado automaticamente, sem apagar
  status, notas ou atividade existentes.
- O reset do pipeline também limpa agenda, cadência e motivo de perda.
- A exportação CSV agora inclui follow-ups, próximo passo e motivo de perda.

## [1.0.1] — 2026-04-24

Patch após o primeiro smoke test end-to-end com PostgREST.

### Corrigido
- `schema.sql`: adicionadas colunas `maps_avaliacoes` e `maps_fotos`
  (ausentes faziam o sync incremental falhar com HTTP 400 PGRST204).
- `fase_sync_supabase.py`: troca de `datetime.utcnow()` (deprecated em
  Python 3.12+) por `datetime.now(timezone.utc)`. Inclui agora os campos
  Maps adicionais no upsert de novos leads.
- `fase_sync_supabase.py`: `--dry-run` não modifica mais o
  `leads_final.json` local. Antes regravava o arquivo mesmo em
  simulação.
- `template_crm.html`: aba "Atividade" no dossiê não voltava para "Visão
  Geral" após adicionar uma nota. `renderDossierBody` agora respeita
  `activeTab` ao re-renderizar os panels.
- `setup_supabase.py`: instruções do modo manual não geram mais URL
  inválida quando o `SUPABASE_URL` não é supabase.com (instâncias
  self-hosted ou compatíveis).

### Adicionado
- `migrate_localstorage_to_supabase.py`: migra estado standalone
  (localStorage do CRM) para o Supabase, preservando status, notas e
  atividade entre versões.

## [1.0.0] — 2026-04-24

Primeira versão pública. Pipeline completo de prospecção B2B local com
Claude Code, modo incremental e CRM kanban.

### Adicionado
- Pipeline em nove fases: Google Places, dedup, scraping CNPJ, BrasilAPI,
  rapport humano via IA, validação WhatsApp, checagem Meta Ad Library,
  consolidação, CRM kanban estático.
- Modo incremental real via Supabase: a partir da segunda execução,
  apenas leads novos entram; status, notas e atividade dos antigos são
  preservados.
- Sync multi-device opcional: cada usuário cria o próprio projeto
  Supabase grátis, sem multi-tenancy nem servidor compartilhado.
- CRM com kanban de seis colunas, drag-drop, dossiê quatro abas, command
  palette (`Cmd+K`/`Ctrl+K`), filtros chips, export CSV, badges "Novo",
  histórico de execuções, indicador de sync no header e fallback
  localStorage para uso offline.
- Schema SQL completo com RLS, índices únicos por `(cnpj, agencia)` e
  `(whatsapp, agencia)`, trigger de `updated_at`, view de stats por
  status.
- Setup automatizado em três comandos (`git clone`, `./setup.sh`,
  `claude < PROMPT.md`) para macOS, Linux e Windows.
- Documentação completa: README, arquitetura, COMO_RODAR e PROMPT.

### Limitações conhecidas
- Google Ads Transparency Center: a API só verifica anunciantes
  políticos no Brasil. Anunciantes comerciais não aparecem como "ativo"
  pelo método público.
- Validação de WhatsApp depende da Evolution API (auto-hospedada).
  Sem ela, o pipeline registra apenas "provável" baseado no DDD.
- Playwright para Meta Ad Library exige Chromium instalado localmente.
