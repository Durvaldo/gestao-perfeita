---
status: bloqueada
modulo: web
owner:
criado-em: 2026-10-04
---

# 0030 — Exceções da agenda: API e regra de disponibilidade

**Task ID**: `TASK-0030`

## Objetivo

Implementar o RF-1 e o RF-2 da [SPEC-0004](../specs/SPEC-0004.md):

- CRUD de exceções sobre a tabela `schedule_blocks`, que já existe: barbearia inteira ou profissional, dia inteiro ou faixa de horário, motivo com sugestões;
- uma checagem única de disponibilidade (expediente, exceção e conflito), usada na criação e na remarcação de agendamentos, que recusa com "Agenda fechada neste período: {motivo}.".

## Dependências

- `TASK-0028` (a checagem de disponibilidade inclui a regra de não agendar no passado).
- **Decisão do responsável sobre a Q2 da SPEC-0004** (o profissional registra a própria exceção?), que define a policy.

## Critérios de conclusão

- [ ] Rotas `/api/schedule-blocks` (listar por período e profissional, criar, editar, excluir), com policy (só o admin cria exceção da barbearia inteira) e validação de fim depois do início.
- [ ] Checagem de disponibilidade centralizada em `web/src/server/appointments/`; criar dentro de uma exceção do profissional ou da barbearia → 422, inclusive para o admin.
- [ ] Testes: CRUD, permissões por papel, isolamento por tenant e os três motivos de recusa; `npm test` e `npm run lint` passando.
- [ ] ADR, se a forma da checagem de disponibilidade envolver uma escolha real entre alternativas.

## Referências

- [SPEC-0004](../specs/SPEC-0004.md) (RF-1, RF-2, Q2)
- [`PLANO_MELHORIAS_BENCHMARK.md`](../PLANO_MELHORIAS_BENCHMARK.md), Bloco A (passos A1 e A2)
- [ADR-0005](../decisions/0005-isolamento-por-tenant-prisma-extension.md), [ADR-0009](../decisions/0009-agendamento-fuso-por-tenant-e-regras.md)

## Notas de progresso

- 2026-10-04 — Criada bloqueada: a SPEC-0004 precisa de refinamento, e a policy depende da Q2.
