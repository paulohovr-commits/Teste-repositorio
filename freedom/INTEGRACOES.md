# Integrações

Serviços de fora que o Freedom vai precisar. Cada um diz qual recurso pede, o que faz, e o estado.

**Estado:** ✅ já em uso · 🔜 necessária para um recurso anotado · 💡 provável no futuro

| # | Integração | Para quê | Pedida por | Estado |
|---|---|---|---|---|
| I01 | **Supabase** (banco, login, tempo real, cron) | Guardar tudo, travar acesso no banco, quadro atualizar sozinho, rotinas | R00a, R00c, R01 | ✅ |
| I02 | **Google: login** | Entrar com a conta Google | R00c | ✅ |
| I03 | **Google Drive** | Preview de arquivos nas tarefas; nome real do documento (manual, cap. 22) | R01 | 🔜 |
| I04 | **Vercel** | Hospedagem e cron dos e-mails | R00a, R01 | ✅ (a configurar) |
| I05 | **Resend** (e-mail) | Avisar "você foi incluído", "te citaram", resumo do dia | R01 (manual, F10) | 🔜 |
| I06 | **WhatsApp** | Hoje: botão que abre a conversa (link `wa.me`, sem custo). Amanhã: avisar responsável e cliente pelo WhatsApp | R00a, R00b, R01 | ✅ link / 💡 API |
| I07 | **API de IA** (Claude) | O Freedom executar tarefas: escrever, pesquisar, analisar, resumir | R00b, R01 | ✅ no painel / 🔜 no sistema |

## Notas

- **WhatsApp por link × WhatsApp por API.** O link `wa.me` só abre a conversa e você manda. Mandar
  mensagem sozinho exige a API oficial da Meta (WhatsApp Business Platform), que tem custo por conversa,
  aprovação de modelos de mensagem e regras rígidas contra spam. Decidir quando chegar a hora.
- **Google Calendar** (💡): é provável que a agenda das tarefas queira aparecer no calendário de cada
  pessoa. Não foi pedido ainda.
- **Integrações que a Prospecção já lê sem API:** Trello (arquivo JSON exportado) e planilhas (CSV).
