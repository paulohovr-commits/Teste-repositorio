# Catálogo de recursos

Cada recurso aponta para o desabafo de onde veio. Quando você mudar de ideia, o recurso é atualizado
e a mudança fica anotada no fim dele, em "Histórico".

## Resumo

| Código | Recurso | Status | Veio de |
|---|---|---|---|
| R-000 | Visão geral: agência de marketing automatizada | 💡 ideia | D-001 |
| R-001 | Central de Integrações com cofre | 🧩 entendido | D-002 |

---

## R-000 · Visão geral: agência de marketing automatizada

- **Status:** 💡 ideia
- **Veio de:** D-001
- **O que é:** o Freedom faz, de forma automática, o trabalho que uma agência de marketing faz.
  Os recursos concretos vão aparecer nos próximos desabafos.
- **Integrações prováveis:** ainda nenhuma confirmada. As hipóteses estão em [INTEGRACOES.md](INTEGRACOES.md).
- **Alertas:** S-001 a S-006 valem para o sistema inteiro.
- **Dúvidas:** P-001, P-002, P-003, P-004.
- **Recursos ligados:** R-001 (Central de Integrações).

---

## R-001 · Central de Integrações com cofre

- **Status:** 🧩 entendido
- **Veio de:** D-002 (com a foto da tela de integrações do Jarvis como modelo)
- **O que é:** uma tela do Freedom com um card para cada ferramenta externa. Pelo card, a pessoa
  conecta a ferramenta, preenchendo os campos que a API dela pede. Depois, o card acompanha a saúde
  da conexão. As chaves vão direto do formulário para um cofre no servidor e nunca passam pelo chat.

### Como é um card

| Parte | O que mostra | Exemplo da foto |
|---|---|---|
| Cabeçalho | Logo, nome e para que serve | Hotmart · Vendas · assinaturas |
| Status | Conectado, desconectado ou com erro, e a hora da última sincronização | "Conectado · sync há 16 min" |
| Uso | Quais telas ou automações a integração alimenta. Se não alimenta nenhuma, avisa. | "Só conectado, ainda não alimenta nenhuma tela" |
| Número da base | Um contador que prova que os dados chegaram | 37.814 contatos na base |
| Cota | O limite do plano da ferramenta e quanto já foi usado | Circle: 5.000 chamadas por mês |
| Origem | Se a integração é puxada pelo Freedom ou movida por evento de outra ferramenta | Circle movida a evento da Hotmart |
| Itens configuráveis | Sub-itens da ferramenta | Remetentes do Resend: Financeiro, Tarefas do Kanban, Secretária |
| Ações | Conectar, Testar conexão, Sincronizar agora, Reconfigurar, Desconectar | |

### Como funciona o formulário de conexão

1. A pessoa clica em **Conectar** (ou **Reconfigurar**) e abre um formulário com os campos daquela
   ferramenta. Os campos de cada uma estão em [INTEGRACOES.md](INTEGRACOES.md#campos-que-cada-api-pede).
2. Os campos secretos (token, chave, senha de app) são do tipo "só escrita": depois de salvos, nunca
   mais aparecem. O card mostra só o final, por exemplo `••••a91f`, e a data em que a chave foi trocada.
3. Os campos que não são secretos (ID da conta, URL, domínio) ficam visíveis e podem ser editados.
4. Antes de salvar, o sistema **testa a conexão** com a API e só marca "Conectado" se o teste passar.
5. Quando a ferramenta aceita login oficial (OAuth, por exemplo "Entrar com Google" ou "Entrar com Facebook"),
   o card mostra esse botão em vez de pedir token. É o caminho mais seguro.

- **Integrações:** todas. Esta tela é a porta de entrada de cada integração do sistema.
- **Alertas:** S-001, S-006, S-007, S-008, S-009.
- **Dúvidas:** P-005, P-006, P-007, P-008.
