---
status: concluida
modulo: web
owner: Durvaldo
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

- [x] Teste: agendamento concluído sem comanda, mais agendamento concluído com comanda paga, mais comanda avulsa paga, do mesmo cliente → 3 atendimentos.
- [x] Isolamento por tenant mantido (o teste existente continua passando).
- [x] O texto do widget na UI reflete "atendimentos"; `npm test` e `npm run lint` passando.

## Referências

- [SPEC-0003](../specs/SPEC-0003.md) (RF-2, Q2)
- `web/src/server/dashboard/dashboard.ts`, `web/src/server/__tests__/dashboard.test.ts`

## Notas de progresso
- 2026-10-04 — Implementado. `topCustomers` soma os agendamentos `completed` e as comandas pagas que não foram contadas por um agendamento concluído: as avulsas e, além do que a spec pedia, as de agendamento que deixou de estar `completed` (sem isso, essa comanda deixaria de contar, o que seria uma regressão). O agendamento fechado pela comanda conta uma vez só. Empates ficam ordenados pelo id do cliente, para a ordem ser estável. Os widgets de faturamento não mudaram. Card: "Atendimentos concluídos na agenda ou em comanda (top 5)" e vazio "Nenhum atendimento ainda.". Teste novo do cenário de aceite: (a) concluído sem comanda, (b) concluído com comanda paga, (c) comanda avulsa → 3, com confirmado e cancelado de outro cliente fora da contagem (no código antigo daria 2). Verificado: `npm test` (218), `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (6). A `TASK-0025` (filtro do dashboard para o profissional) mexe no mesmo arquivo; não houve conflito, porque ela continua bloqueada.
