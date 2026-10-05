---
status: concluida
modulo: web
owner: Durvaldo
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

- [x] Rotas `/api/schedule-blocks` (listar por período e profissional, criar, editar, excluir), com policy (só o admin cria exceção da barbearia inteira) e validação de fim depois do início.
- [x] Checagem de disponibilidade centralizada em `web/src/server/appointments/`; criar dentro de uma exceção do profissional ou da barbearia → 422, inclusive para o admin.
- [x] Testes: CRUD, permissões por papel, isolamento por tenant e os três motivos de recusa; `npm test` e `npm run lint` passando.
- [x] ADR, se a forma da checagem de disponibilidade envolver uma escolha real entre alternativas.

## Referências

- [SPEC-0004](../specs/SPEC-0004.md) (RF-1, RF-2, Q2)
- [`PLANO_MELHORIAS_BENCHMARK.md`](../PLANO_MELHORIAS_BENCHMARK.md), Bloco A (passos A1 e A2)
- [ADR-0005](../decisions/0005-isolamento-por-tenant-prisma-extension.md), [ADR-0009](../decisions/0009-agendamento-fuso-por-tenant-e-regras.md)

## Notas de progresso

- 2026-10-04 — Criada bloqueada: a SPEC-0004 precisa de refinamento, e a policy depende da Q2.
- 2026-10-04 — Desbloqueada: o responsável respondeu às questões pendentes (ver "Decisões do responsável" na SPEC de origem).
- 2026-10-04 — Implementado ([ADR-0012](../decisions/0012-excecoes-da-agenda-representacao-e-checagem.md)). `src/server/schedule-blocks/schedule-blocks.ts` + rotas `/api/schedule-blocks` e `/api/schedule-blocks/[id]`: criar (dia inteiro com `startDate`/`endDate` inclusivos, ou período no mesmo dia com `startsAt`/`endsAt`), listar por período e profissional (o profissional vê as dele e as da barbearia), ver, editar e excluir. As respostas trazem `affectedAppointments`, os agendamentos que agora "precisam de ação" (Q1, calculado pela sobreposição). Policy `scheduleBlock`: o profissional gerencia só as dele, sem aprovação (Q2); exceção da barbearia é só do admin. Disponibilidade: `findBlockingException` em `rules.ts`, chamada em `resolveSchedule` depois do expediente; recusa criar e remarcar, inclusive o admin, com "Agenda fechada neste período: {motivo}."; atualização só de status continua livre. Sem migration: o schema já tinha a tabela. Testes: 10 novos de API e de disponibilidade, a matriz de policies e um teste das exceções da barbearia. Verificado: `npm test` (244), `npm run lint` e `npx tsc --noEmit`.
