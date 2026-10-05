---
status: backlog
modulo: web
owner:
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

- [ ] `POST /api/orders` feito por profissional: sem `professionalId` → 201, com ele como barbeiro; com o `professionalId` de um colega → recusado (403 ou 422, mensagem em pt-BR).
- [ ] Comanda criada a partir de um agendamento continua herdando o profissional do agendamento.
- [ ] Tela de comandas: para o profissional, o campo "Barbeiro" fica oculto ou fixo; abrir a comanda leva ao detalhe sem erro.
- [ ] `policies.ts` e a matriz de testes atualizadas; ADR-0006 e ADR-0011 com a nota apontando para a SPEC-0001.
- [ ] Testes de API; `npm test`, `npm run lint` e `npx tsc --noEmit` passando; o E2E da visão do profissional (`npm run test:e2e`) passando.

## Referências

- [SPEC-0001](../specs/SPEC-0001.md) (RF-3, RF-4)
- [ADR-0006](../decisions/0006-autorizacao-policies-funcoes-puras.md), [ADR-0011](../decisions/0011-comandas-estoque-e-duplicidade.md)
- `web/src/server/orders/orders.ts`, `web/src/app/(app)/comandas/orders-screen.tsx`

## Notas de progresso
