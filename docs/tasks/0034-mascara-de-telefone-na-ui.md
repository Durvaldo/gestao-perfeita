---
status: em-andamento
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0034 — Máscara de telefone nos inputs e nas tabelas

**Task ID**: `TASK-0034`

## Objetivo

Implementar o RF-2 da [SPEC-0005](../specs/SPEC-0005.md):

- um helper de formatação em `web/src/lib/format.ts`: `(11) 98765-4321` e `(11) 3333-4444`, incluindo valores parciais durante a digitação;
- um input de telefone com máscara, reaproveitável;
- todas as telas que mostram ou editam telefone passam a usá-los.

## Dependências

- `TASK-0033`

## Critérios de conclusão

- [ ] Teste unitário do helper (10 e 11 dígitos e valor parcial).
- [ ] Clientes, e qualquer outra tela com telefone: máscara no formulário e na tabela; o envio para a API funciona.
- [ ] `npm test` e `npm run lint` passando; verificado no navegador.

## Referências

- [SPEC-0005](../specs/SPEC-0005.md) (RF-2)
- `web/src/lib/format.ts`, `web/src/app/(app)/clientes/customers-screen.tsx`

## Notas de progresso
