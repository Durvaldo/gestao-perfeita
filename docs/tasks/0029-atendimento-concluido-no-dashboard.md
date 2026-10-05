---
status: backlog
modulo: web
owner:
criado-em: 2026-10-04
---

# 0029 — Agendamento concluído conta como atendimento no dashboard

**Task ID**: `TASK-0029`

## Objetivo

Corrigir o RF-2 da [SPEC-0003](../specs/SPEC-0003.md). O widget de clientes mais frequentes (`topCustomers` em `dashboard.ts`) conta só comandas pagas, então um agendamento concluído sem comanda não aparece. A contagem nova é:

- agendamentos `completed`;
- mais as comandas pagas **sem** agendamento;
- sem contar duas vezes o agendamento que também tem comanda.

Os widgets de faturamento continuam usando só comandas pagas.

## Dependências

- Nenhuma. Coordenar com a `TASK-0025` (mesmo arquivo).

## Critérios de conclusão

- [ ] Teste: agendamento concluído sem comanda, mais agendamento concluído com comanda paga, mais comanda avulsa paga, do mesmo cliente → 3 atendimentos.
- [ ] Isolamento por tenant mantido (o teste existente continua passando).
- [ ] O texto do widget na UI reflete "atendimentos"; `npm test` e `npm run lint` passando.

## Referências

- [SPEC-0003](../specs/SPEC-0003.md) (RF-2, Q2)
- `web/src/server/dashboard/dashboard.ts`, `web/src/server/__tests__/dashboard.test.ts`

## Notas de progresso
