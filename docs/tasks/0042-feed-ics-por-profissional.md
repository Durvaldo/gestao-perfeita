---
status: backlog
modulo: web
owner:
criado-em: 2026-10-05
---

# 0042 — Feed de calendário (ICS) por profissional

**Task ID**: `TASK-0042`

## Objetivo

Implementar a RF-2b da [SPEC-0006](../specs/SPEC-0006.md):
- cada profissional tem uma URL secreta e revogável com os agendamentos não cancelados dele, no formato iCalendar (ICS), para assinar no Google Agenda, Apple Calendar ou Outlook;
- uma tela permite copiar o link e gerar um novo, o que revoga o anterior;
- a tela avisa que no Google Agenda a atualização pode levar horas.

## Dependências

- Nenhuma.

## Critérios de conclusão

- [ ] Token secreto por profissional (aleatório, guardado como hash), gerado e revogado pelo próprio profissional (ou pelo admin).
- [ ] `GET /api/calendar/{token}.ics` público: ICS válido (RFC 5545) com os agendamentos não cancelados (de 30 dias atrás em diante), horários em UTC, sem dados privados além de cliente e serviços; token inválido ou revogado → 404.
- [ ] Tela para o profissional copiar o link, com o aviso sobre o atraso do Google, e gerar um novo.
- [ ] Testes (geração do ICS, token, revogação, isolamento); `npm test`, `npm run lint` e `npx tsc --noEmit` passando.

## Referências

- [SPEC-0006](../specs/SPEC-0006.md) (RF-2b), [`DISCOVERY_CALENDARIOS_EXTERNOS.md`](../DISCOVERY_CALENDARIOS_EXTERNOS.md)

## Notas de progresso
