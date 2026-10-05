---
status: backlog
modulo: web
owner:
criado-em: 2026-10-05
---

# 0041 — Link "Adicionar ao Google Agenda" no agendamento

**Task ID**: `TASK-0041`

## Objetivo

Implementar a RF-2a da [SPEC-0006](../specs/SPEC-0006.md): no detalhe do agendamento, um botão que abre o Google Agenda com o evento já preenchido (título com o cliente e os serviços, horário certo e a barbearia como local), via `calendar.google.com/calendar/render?action=TEMPLATE`. Não há integração: é manual, um agendamento de cada vez.

## Dependências

- Nenhuma.

## Critérios de conclusão

- [ ] Função pura que monta a URL (datas em UTC no formato do Google, texto codificado), com testes.
- [ ] Botão no detalhe do agendamento não cancelado, abrindo em nova aba.
- [ ] `npm test`, `npm run lint` e `npx tsc --noEmit` passando; E2E conferindo o link.

## Referências

- [SPEC-0006](../specs/SPEC-0006.md) (RF-2a), [`DISCOVERY_CALENDARIOS_EXTERNOS.md`](../DISCOVERY_CALENDARIOS_EXTERNOS.md)

## Notas de progresso
