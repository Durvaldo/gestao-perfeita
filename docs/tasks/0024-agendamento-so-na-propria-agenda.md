---
status: em-andamento
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0024 — Profissional agenda só na própria agenda

**Task ID**: `TASK-0024`

## Objetivo

Resolver a questão Q1 da [SPEC-0001](../specs/SPEC-0001.md). Hoje o profissional pode criar agendamento para um colega e depois não enxerga o que criou ([ADR-0006](../decisions/0006-autorizacao-policies-funcoes-puras.md) e [ADR-0009](../decisions/0009-agendamento-fuso-por-tenant-e-regras.md)). Se o responsável confirmar, aplicar ao agendamento a mesma regra da `TASK-0023`: o profissional cria e remarca só na própria agenda, e o admin em qualquer uma.

## Dependências

- `TASK-0023` (mesmo padrão de implementação).
- **Decisão do responsável sobre a Q1 da SPEC-0001.** Recomendação da SPEC: aplicar a regra.

## Critérios de conclusão

- [ ] Decisão registrada na SPEC-0001 (Q1 vira requisito, ou é descartada; neste caso a task é `cancelada`).
- [ ] `POST`/`PUT /api/appointments` feito por profissional: o próprio → aceito; o de um colega → recusado (pt-BR).
- [ ] Formulário da agenda: para o profissional, o campo "Barbeiro" fica oculto ou fixo.
- [ ] Matriz de policies e notas nas ADRs 0006 e 0009 atualizadas; testes; `npm test` e `npm run lint` passando.

## Referências

- [SPEC-0001](../specs/SPEC-0001.md) (Q1)
- `web/src/server/appointments/appointments.ts`, `web/src/app/(app)/agenda/`

## Notas de progresso

- 2026-10-04 — Criada bloqueada: depende de uma decisão de produto (Q1 da SPEC-0001) ainda não tomada.
- 2026-10-04 — Desbloqueada: o responsável respondeu às questões pendentes (ver "Decisões do responsável" na SPEC de origem).
