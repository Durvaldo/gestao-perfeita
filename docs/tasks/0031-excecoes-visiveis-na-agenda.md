---
status: concluida
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0031 — Tela de exceções e faixas bloqueadas na agenda

**Task ID**: `TASK-0031`

## Objetivo

Construir a interface do RF-1 e do RF-4 da [SPEC-0004](../specs/SPEC-0004.md):

- uma tela para registrar, listar, editar e excluir exceções, com alvo, dia inteiro ou período, e motivo com sugestões rápidas;
- no calendário da agenda, os períodos de exceção aparecem como faixas cinza/hachuradas com o motivo e não são clicáveis.

## Dependências

- `TASK-0030`

## Critérios de conclusão

- [x] Tela de exceções seguindo o padrão das telas de cadastro (`web/AGENTS.md`), com as ações conforme o papel.
- [x] Uma exceção de amanhã das 14h às 16h aparece no calendário do profissional (e no de todos, se for da barbearia), e os horários dentro dela não abrem o formulário.
- [x] Item no menu; `npm test` e `npm run lint` passando; verificado no navegador.

## Referências

- [SPEC-0004](../specs/SPEC-0004.md) (RF-1, RF-4)
- `web/src/app/(app)/agenda/`

## Notas de progresso
- 2026-10-04 — Implementado. Tela `/excecoes` (menu "Exceções"; para o barbeiro, "Minhas folgas"): lista de hoje em diante, criar, editar e excluir; formulário com alvo (só o admin escolhe: barbearia inteira ou um barbeiro), dia inteiro (de/até) ou período do dia (dia, das, até) e motivo com sugestões (Feriado, Folga, Férias, Atestado, Compromisso, Manutenção). Ao salvar, avisa quantos agendamentos no período precisam de ação; a resolução deles é a `TASK-0032`. Agenda: carrega `/api/schedule-blocks` do profissional e da barbearia e desenha faixas hachuradas com o motivo; os horários dentro delas ficam desabilitados (`rangeOnDay` em `src/lib/calendar.ts`, com testes). Funções puras do formulário em `exception-form.ts`, com testes. E2E novo: o barbeiro registra um compromisso das 14h às 16h; na agenda aparece a faixa, 14:30 fica desabilitado e 16:00 continua livre. Verificado: `npm test`, `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (8).
