# Política de segurança

## Versões cobertas

A versão estável mais recente recebe correções de segurança. Atualize antes de relatar um problema já corrigido em release posterior.

## Dados e credenciais

O CRM gerado pode conter dados de leads, rascunhos e histórico comercial. Mantenha `index.html`, `.env`, `leads_final.json`, `outreach_campaign.json` e `outreach_drafts.json` fora de repositórios e URLs públicas. Use credenciais locais com o menor privilégio necessário e proteja qualquer implantação com controle de acesso.

## Como relatar uma vulnerabilidade

Use o botão **Report a vulnerability** na aba **Security** do repositório. Inclua:

- versão ou commit afetado;
- impacto observado;
- passos mínimos para reprodução;
- evidência sanitizada, sem dados de clientes ou credenciais;
- correção sugerida, quando houver.

Se o canal privado não estiver disponível, abra uma issue com o título `[security-contact]` e peça um canal privado. Não publique detalhes de exploração, segredos ou dados pessoais na issue.

O mantenedor confirmará o recebimento e combinará a divulgação depois que a correção estiver disponível. Relatos incompletos podem exigir informações adicionais antes da triagem.

## Escopo

São relevantes falhas nos scripts, no CRM gerado, na validação de entradas, no tratamento de credenciais e nas integrações opcionais mantidas por este projeto. Problemas exclusivos de serviços de terceiros ou de uma implantação configurada fora das recomendações devem ser reportados ao fornecedor ou operador responsável.
