# 0013 — Configurações por barbearia em `tenant_settings` (chave → JSON)

- **Data**: 2026-10-04
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0013`
- **Task relacionada**: `TASK-0039`

## Contexto

A [SPEC-0008](../specs/SPEC-0008.md) (RF-2) pede modelos de mensagem de WhatsApp editáveis por barbearia. É a primeira configuração por tenant do sistema, mas não a única prevista: o [plano de melhorias](../PLANO_MELHORIAS_BENCHMARK.md) (item 2.4) já previa uma tabela única de configurações para as políticas de agendamento (Bloco B), os eventos de notificação (Bloco E) e as regras por vertical. A SPEC não diz como guardar.

## Decisão

- Tabela **`tenant_settings`** (`TenantSetting`): `tenant_id`, `key` (até 100 caracteres), `value` (JSONB), único por `(tenant_id, key)`, com cascade na exclusão do tenant. Ela é modelo direto no isolamento por tenant ([ADR-0005](0005-isolamento-por-tenant-prisma-extension.md)).
- **Chave ausente = valor padrão do código.** Cada módulo define o próprio padrão e grava só o que o admin mudou. Os modelos de WhatsApp ficam na chave `whatsapp.templates`, como objeto `{ <modelo>: texto }` com só os textos diferentes do padrão (`src/server/settings/message-templates.ts`). Assim, um modelo novo ou um texto padrão melhorado chegam a todas as barbearias que não o personalizaram.
- Cada chave tem um módulo dono, com validação Zod própria. Não há endpoint genérico de "salvar qualquer chave".

## Alternativas consideradas

- **Tabela específica (`message_templates`)**: mais rígida e explícita, mas cada configuração futura exigiria uma tabela e uma migration nova. O plano de melhorias já apontava para a tabela única.
- **Coluna JSON em `tenants`**: uma escrita concorrente de duas configurações diferentes sobrescreveria a outra (o JSON inteiro é gravado), e a tabela de tenants cresceria com dados de módulos.
- **Gravar todos os modelos, inclusive os padrões**: congelaria os textos padrão em cada barbearia, e um modelo adicionado depois não apareceria para ninguém sem migration de dados.

## Consequências

- As configurações futuras (políticas de agendamento, notificações) usam a mesma tabela, com uma chave e um módulo dono cada.
- Como o valor é JSONB sem schema no banco, a validação fica no código, e a leitura deve tolerar chaves antigas ou parciais (o merge com o padrão já faz isso para os modelos).
