---
status: concluida
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0028 — Recusar agendamento no passado

**Task ID**: `TASK-0028`

## Objetivo

Implementar o RF-1 da [SPEC-0003](../specs/SPEC-0003.md):

- criar ou remarcar agendamento com início antes do momento atual (fuso da barbearia) → 422 em `startsAt`: "Não é possível agendar em um horário que já passou.", para todos os papéis;
- atualizar só o status de um agendamento passado continua permitido;
- na agenda, horários passados não abrem o formulário, e o campo de data/hora não oferece datas anteriores a hoje.

A Q1 da SPEC (tolerância para registro tardio) segue a recomendação: sem tolerância. Se o responsável decidir diferente, a regra muda num só lugar (`rules.ts`).

## Dependências

- Nenhuma.

## Critérios de conclusão

- [x] Regra em `web/src/server/appointments/rules.ts`, com o "agora" injetável para teste.
- [x] Testes de API: criar no passado → 422; remarcar para o passado → 422; concluir um agendamento de ontem → 200.
- [x] Agenda: horários passados não clicáveis e `min` no campo de data/hora.
- [x] Os testes e o seed do E2E que criam agendamentos usam datas futuras; `npm test`, `npm run lint` e `npm run test:e2e` passando.

## Referências

- [SPEC-0003](../specs/SPEC-0003.md) (RF-1, Q1)
- [ADR-0009](../decisions/0009-agendamento-fuso-por-tenant-e-regras.md)

## Notas de progresso
- 2026-10-04 — Implementado. `startsInThePast(start, now)` em `rules.ts` (o "agora" é um parâmetro, com teste unitário). `resolveSchedule` ganhou `checkPast`: sempre na criação; na edição, só quando o início muda. Assim, concluir ou cancelar um agendamento passado continua funcionando. Mensagem: "Não é possível agendar em um horário que já passou." (422 em `startsAt`). Na agenda, `isPastSlot` (em `src/lib/calendar.ts`, com testes) desabilita os horários passados, e o `datetime-local` ganhou `min` (o formulário só cria, nunca edita, então o `min` não atrapalha). Os testes de API e o seed do E2E já usavam datas futuras. Testes novos: 3 de API, unitários de `startsInThePast` e de `isPastSlot`, e um E2E (horário da semana passada desabilitado, da próxima habilitado). **Ajuste no E2E:** com os testes novos, o E2E passou de 5 logins, o limite do build de produção (5 por minuto), e o teste de senha errada recebia 429. O helper `login()` agora entra pelo formulário só na primeira vez de cada usuário e reaproveita os cookies depois. O limite não foi afrouxado. Verificado: `npm test` (217), `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (6).
