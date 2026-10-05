---
status: backlog
modulo: web
owner:
criado-em: 2026-10-04
---

# 0025 — Dashboard do profissional restrito

**Task ID**: `TASK-0025`

## Objetivo

Resolver a questão Q2 da [SPEC-0001](../specs/SPEC-0001.md), que estava pendente desde a [`TASK-0017`](0017-dashboard-servidor.md). Hoje o profissional vê o dashboard da barbearia inteira, inclusive o faturamento dos colegas. Alternativas:

- (A) filtrar todos os widgets pelos dados dele (recomendação da SPEC);
- (B) esconder só o ranking de faturamento;
- (C) manter como está.

## Dependências

- **Decisão do responsável sobre a Q2 da SPEC-0001.**
- Coordenar com a `TASK-0029`, que mexe no mesmo arquivo (`dashboard.ts`).

## Critérios de conclusão

- [ ] Decisão registrada na SPEC-0001.
- [ ] `buildDashboard` aplica a regra escolhida para o profissional; o admin continua vendo tudo.
- [ ] Testes do dashboard para os dois papéis; `npm test` passando; nota da `TASK-0017` atualizada.

## Referências

- [SPEC-0001](../specs/SPEC-0001.md) (Q2)
- `web/src/server/dashboard/dashboard.ts`, `web/src/app/(app)/page.tsx`

## Notas de progresso

- 2026-10-04 — Criada bloqueada: depende de uma decisão de produto (Q2 da SPEC-0001) ainda não tomada.
- 2026-10-04 — Desbloqueada: o responsável respondeu às questões pendentes (ver "Decisões do responsável" na SPEC de origem).
