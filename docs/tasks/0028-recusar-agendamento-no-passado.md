---
status: backlog
modulo: web
owner:
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

- [ ] Regra em `web/src/server/appointments/rules.ts`, com o "agora" injetável para teste.
- [ ] Testes de API: criar no passado → 422; remarcar para o passado → 422; concluir um agendamento de ontem → 200.
- [ ] Agenda: horários passados não clicáveis e `min` no campo de data/hora.
- [ ] Os testes e o seed do E2E que criam agendamentos usam datas futuras; `npm test`, `npm run lint` e `npm run test:e2e` passando.

## Referências

- [SPEC-0003](../specs/SPEC-0003.md) (RF-1, Q1)
- [ADR-0009](../decisions/0009-agendamento-fuso-por-tenant-e-regras.md)

## Notas de progresso
