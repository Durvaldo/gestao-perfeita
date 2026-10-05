---
status: concluida
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0023 — Profissional abre comanda só para si mesmo

**Task ID**: `TASK-0023`

## Objetivo

Implementar o RF-3 e o RF-4 da [SPEC-0001](../specs/SPEC-0001.md):

- na comanda avulsa aberta por um profissional, o barbeiro é sempre ele;
- a UI não oferece outro barbeiro, e o servidor recusa o `professionalId` de um colega;
- o admin continua escolhendo qualquer barbeiro;
- as ADRs 0006 e 0011 ganham uma anotação de que o ponto "o profissional cria comanda para qualquer colega" foi superado pela SPEC-0001.

## Dependências

- Nenhuma.

## Critérios de conclusão

- [x] `POST /api/orders` feito por profissional: sem `professionalId` → 201, com ele como barbeiro; com o `professionalId` de um colega → recusado (403 ou 422, mensagem em pt-BR).
- [x] Comanda criada a partir de um agendamento continua herdando o profissional do agendamento.
- [x] Tela de comandas: para o profissional, o campo "Barbeiro" fica oculto ou fixo; abrir a comanda leva ao detalhe sem erro.
- [x] `policies.ts` e a matriz de testes atualizadas; ADR-0006 e ADR-0011 com a nota apontando para a SPEC-0001.
- [x] Testes de API; `npm test`, `npm run lint` e `npx tsc --noEmit` passando; o E2E da visão do profissional (`npm run test:e2e`) passando.

## Referências

- [SPEC-0001](../specs/SPEC-0001.md) (RF-3, RF-4)
- [ADR-0006](../decisions/0006-autorizacao-policies-funcoes-puras.md), [ADR-0011](../decisions/0011-comandas-estoque-e-duplicidade.md)
- `web/src/server/orders/orders.ts`, `web/src/app/(app)/comandas/orders-screen.tsx`

## Notas de progresso
- 2026-10-04 — Implementado. Política nova `order.createFor` (admin ou dono), checada com o profissional da comanda: na avulsa, `professionalId` vazio vira o do profissional logado (via `z.preprocess`, então o admin continua obrigado a informar) e um colega → 403; a partir de agendamento, só se o agendamento for dele (antes era permitido pela paridade com o legado). Na tela, o campo "Barbeiro" não aparece para o profissional. Notas de superação nas ADR-0006 e ADR-0011. Testes novos: 2 de API em `orders.test.ts`, a matriz de policies e um passo no E2E da visão do profissional. Verificado: `npm test` (203), `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (4).
