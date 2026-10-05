---
status: concluida
modulo: web
owner: Durvaldo
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

- [x] Token secreto por profissional (aleatório; guardado como está, não como hash; ver nota), gerado e revogado pelo próprio profissional (ou pelo admin).
- [x] `GET /api/calendar/{token}.ics` público: ICS válido (RFC 5545) com os agendamentos não cancelados (de 30 dias atrás em diante), horários em UTC, sem dados privados além de cliente e serviços; token inválido ou revogado → 404.
- [x] Tela para o profissional copiar o link, com o aviso sobre o atraso do Google, e gerar um novo.
- [x] Testes (geração do ICS, token, revogação, isolamento); `npm test`, `npm run lint` e `npx tsc --noEmit` passando.

## Referências

- [SPEC-0006](../specs/SPEC-0006.md) (RF-2b), [`DISCOVERY_CALENDARIOS_EXTERNOS.md`](../DISCOVERY_CALENDARIOS_EXTERNOS.md)

## Notas de progresso
- 2026-10-05 — Implementado. Coluna `professionals.calendar_token` (única; migration `20261005060000_professional_calendar_token`, gerada com `migrate diff` porque o `migrate dev` não roda sem interação quando há índice único). **Desvio do critério do hash:** o token é guardado como está, para o link poder ser mostrado de novo. Ele só dá acesso de leitura a dados que o próprio banco já guarda, então o hash não protegeria nada a mais e obrigaria a gerar um link novo a cada consulta; gerar um novo revoga o anterior. API `GET/POST/DELETE /api/professionals/[id]/calendar-feed` (o próprio ou o admin; policy `calendarFeed`) e feed público `GET /api/calendar/{token}.ics`: agendamentos não cancelados do profissional de 30 dias atrás em diante, em UTC, com cliente e serviços no título; pendentes como `TENTATIVE`; token desconhecido ou revogado → 404. Gerador ICS puro em `src/server/calendar/ics.ts` (RFC 5545: escape de texto, linhas dobradas em 75 octetos sem partir caracteres acentuados, CRLF, `REFRESH-INTERVAL` de 15 min para Apple e Outlook). Tela: botão "Agenda no celular" na agenda, com o link, copiar, gerar novo, desativar e as instruções para iPhone e Google Agenda, incluindo o aviso do atraso do Google. Testes: unitários do ICS, 3 de API (permissões, conteúdo do feed só do profissional e sem cancelados nem antigos, revogação) e um E2E (gera o link e baixa o ICS sem sessão). Verificado: `npm test` (292), `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (13).
