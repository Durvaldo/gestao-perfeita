---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0013 — Tela de agenda e calendário

**Task ID**: `TASK-0013`

## Objetivo

Portar `AgendaView.vue` e `components/agenda/AgendaCalendar.vue` (com `utils/calendar.js`): visualização por período, criar agendamento, confirmar, cancelar e "criar comanda" a partir de um agendamento. O prestador logado vê só a própria agenda. Hoje isso é decidido por `authState.user.tipo` e pelo `barbeiro` vinculado que vem de `/api/user`.

## Dependências

- `TASK-0010`
- `TASK-0012`

## Critérios de conclusão

- [x] Paridade de funcionalidades com a tela atual, verificada no navegador com `admin` e com `prestador_de_servico`.
- [x] Erros de expediente e de conflito exibidos ao usuário em pt-BR.

## Referências

- API pronta (`TASK-0012`, [ADR-0009](../decisions/0009-agendamento-fuso-por-tenant-e-regras.md)): `/api/appointments` (`?from=&to=` para a visão de calendário). Envie `startsAt` como `datetime-local` sem offset (fuso da barbearia) e exiba os horários com `timeZone: user.tenant.timezone`. Erros 422 de expediente, conflito e profissional inativo já vêm com mensagem pt-BR no `message`.
- `frontend/src/views/negocio/AgendaView.vue`, `frontend/src/components/agenda/AgendaCalendar.vue`, `frontend/src/utils/calendar.js`, `frontend/src/api/negocio.js`

## Notas de progresso
- 2026-10-03 — Tela de agenda em `web/src/app/(app)/agenda/` (`agenda-screen.tsx` + `agenda-calendar.tsx`), portada de `AgendaView.vue`/`AgendaCalendar.vue`: visão semana/dia, navegação e "Hoje", seletor de barbeiro (só admin; o profissional vê sempre a própria agenda), grade com o expediente destacado e o fim de semana/fora do expediente sombreado, blocos coloridos por status, clique num horário livre abre o agendamento já com data e hora, formulário (cliente, barbeiro, `datetime-local`, serviços com duração e preço, observações), detalhe com Confirmar / Marcar atendido / Criar comanda / Cancelar (com confirmação). Os horários são posicionados e exibidos **no fuso da barbearia** (`zonedParts`), não no do navegador (ADR-0009); o `startsAt` sem offset é interpretado pela API no fuso da barbearia. Novos: `web/src/lib/calendar.ts` (helpers de dia, com testes) e `apiAll()` em `web/src/lib/api-client.ts` (carrega todas as páginas para os selects). Verificado no Chrome: admin vê a semana com hoje destacado e o expediente seg–sex; clicar em 05/10 10:00 abre o formulário preenchido; agendar cria o bloco amarelo às 10:00; o conflito mostra "Este barbeiro já tem um agendamento nesse horário."; o detalhe mostra cliente, horário, barbeiro e serviços; Confirmar → azul; Cancelar → confirmação → vermelho; o profissional (rafael) vê "Sua agenda.", sem seletor de barbeiro. O redirecionamento do "Criar comanda" para `/comandas/[id]` é verificado na `TASK-0015`. Dados de teste removidos. `npm test` (196), `tsc`, `lint`. Sem commit (o responsável vai commitar ao final de tudo).
