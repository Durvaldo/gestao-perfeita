---
status: concluida
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

- [x] Teste unitário do helper (10 e 11 dígitos e valor parcial).
- [x] Clientes, e qualquer outra tela com telefone: máscara no formulário e na tabela; o envio para a API funciona.
- [x] `npm test` e `npm run lint` passando; verificado no navegador.

## Referências

- [SPEC-0005](../specs/SPEC-0005.md) (RF-2)
- `web/src/lib/format.ts`, `web/src/app/(app)/clientes/customers-screen.tsx`

## Notas de progresso
- 2026-10-04 — Implementado. `formatPhone` em `src/lib/format.ts` (celular `(11) 98765-4321`, fixo `(11) 3333-4444`, valores parciais durante a digitação, corta acima de 11 dígitos) e o componente `src/components/phone-input.tsx` (`type="tel"`, máscara ao digitar). Aplicados no formulário e na tabela de clientes e no formulário de cadastro de barbeiro (a tabela de barbeiros não mostra telefone). Testes: unitários do `formatPhone`, do componente, e um E2E (telefone do seed mascarado na tabela; digitar `11987654321` mostra e salva com máscara). Verificado: `npm test`, `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (7). **Produção:** clientes com telefone já formatado (como os do seed) continuam aparecendo certo, porque `formatPhone` aceita valor mascarado. O Durvaldo (`11982129257`) passa a aparecer como `(11) 98212-9257` mesmo antes da migration rodar lá.
