---
status: concluida
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0039 — WhatsApp nível 1: modelos de mensagem e botões `wa.me`

**Task ID**: `TASK-0039`

## Objetivo

Implementar o RF-1 e o RF-2 da [SPEC-0008](../specs/SPEC-0008.md), sem nenhum provedor externo:

- modelos de mensagem editáveis por barbearia, com variáveis (`{cliente}`, `{barbearia}`, `{profissional}`, `{data}`, `{hora}`, `{servicos}`) e textos padrão em pt-BR;
- botões que abrem `https://wa.me/55{telefone}?text=...`: na lista e no detalhe de clientes (conversa livre) e no agendamento ("confirmar" e "lembrar").

O botão para os agendamentos afetados por uma exceção entra na `TASK-0032`.

## Dependências

- `TASK-0034` (telefone normalizado e formatado).

## Critérios de conclusão

- [x] Teste unitário da interpolação, com datas no fuso da barbearia, e da montagem da URL (telefone e texto codificado).
- [x] Tela de modelos (só admin), com persistência por tenant e testes de API.
- [x] Botões nas telas de clientes e de agenda; cliente sem telefone válido não mostra o botão.
- [x] `npm test` e `npm run lint` passando; verificado no navegador.

## Referências

- [SPEC-0008](../specs/SPEC-0008.md) (RF-1, RF-2)
- [ADR-0009](../decisions/0009-agendamento-fuso-por-tenant-e-regras.md)

## Notas de progresso
- 2026-10-04 — Implementado ([ADR-0013](../decisions/0013-configuracoes-por-tenant-chave-valor.md)). Tabela nova `tenant_settings` (migration `20261005031739_tenant_settings`); os modelos ficam na chave `whatsapp.templates`, e só os textos alterados são gravados. `src/lib/whatsapp.ts`: 6 modelos padrão (conversa, confirmação, lembrete, remarcação, transferência, cancelamento; os 3 últimos para a `TASK-0032`), `renderTemplate`, `appointmentVariables` (data e hora no fuso da barbearia, primeiros nomes) e `whatsappUrl` (acrescenta o `55` e retorna null sem telefone válido). API `GET/PUT /api/message-templates` (lê a equipe, edita o admin). UI: `WhatsAppLink` + `useMessageTemplates`; botão em cada cliente (inclusive para o barbeiro, que só lê clientes), "Confirmar" e "Lembrar no WhatsApp" no detalhe do agendamento pendente ou confirmado, e tela `/mensagens` (só admin) com prévia e "voltar ao texto padrão". Testes: unitários de `whatsapp.ts`, API dos modelos (padrão, edição parcial, isolamento por tenant, permissão, vazio), matriz de policies, menu e um E2E (edita o modelo → link do cliente com o texto novo e o `55`). Verificado: `npm test` (260), `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (9). **Produção:** a migration nova precisa de `prisma migrate deploy`.
