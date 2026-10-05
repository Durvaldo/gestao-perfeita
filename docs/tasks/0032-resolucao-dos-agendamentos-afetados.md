---
status: concluida
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0032 — Resolver os agendamentos afetados por uma exceção

**Task ID**: `TASK-0032`

## Objetivo

Implementar o RF-3 da [SPEC-0004](../specs/SPEC-0004.md). Ao salvar uma exceção, listar os agendamentos não cancelados do período e do alvo e, para cada um, permitir:

- **Remarcar**: novo horário com o mesmo profissional;
- **Transferir**: mesmo horário com outro profissional livre que faça os mesmos serviços, mantendo o `priceAtBooking`;
- **Cancelar**.

Se a `TASK-0039` já estiver concluída, cada ação oferece o botão de avisar o cliente pelo WhatsApp (RF-1 da SPEC-0008).

## Dependências

- `TASK-0030`, `TASK-0031`.
- **Decisões do responsável sobre as questões Q1 (salvar com pendências), Q3 (ação em lote) e Q5 (transferir para quem não faz o serviço) da SPEC-0004.**

## Critérios de conclusão

- [x] Decisões registradas na SPEC-0004.
- [x] Com 3 agendamentos no dia, registrar um atestado lista os 3; remarcar um, transferir outro e cancelar o terceiro deixa a agenda livre no período, respeitando conflito e disponibilidade.
- [x] Testes de API das três ações (incluindo transferência para profissional ocupado → recusada); `npm test` e `npm run lint` passando; verificado no navegador.

## Referências

- [SPEC-0004](../specs/SPEC-0004.md) (RF-3, Q1, Q3, Q5)
- [SPEC-0008](../specs/SPEC-0008.md) (RF-1)

## Notas de progresso

- 2026-10-04 — Criada bloqueada: depende das questões em aberto Q1, Q3 e Q5 da SPEC-0004.
- 2026-10-04 — Questões Q1, Q3 e Q5 decididas pelo responsável (ver SPEC-0004). Continua dependendo da `TASK-0030` e da `TASK-0031`.
- 2026-10-04 — Implementado. Tela de exceções: coluna "Agendamentos" com "N precisa(m) de ação" (`affectedCount` na listagem); o diálogo `affected-appointments-dialog.tsx` abre sozinho quando uma exceção nova pega agendamentos (Q1). Ações por agendamento: **Remarcar** (novo horário, mesmo barbeiro), **Transferir** (mesmo horário, outro barbeiro; só admin, porque o profissional não agenda para colegas) e **Cancelar**; em lote (Q3, admin): "Transferir todos" e "Cancelar todos", com o motivo de cada falha no item. Tudo passa pelo `PUT /api/appointments/[id]`, então valem as mesmas regras (expediente, exceções, conflito, passado), e o preço congelado é mantido. Depois de cada ação, "Avisar no WhatsApp" com o modelo de remarcação, transferência ou cancelamento (`TASK-0039`). Agenda: agendamento dentro de exceção aparece com contorno âmbar e "!". **Correção de segurança:** o detalhe de uma exceção da barbearia inteira devolvia os agendamentos de todos os barbeiros também para um barbeiro; agora `affectedAppointments` filtra por `visibleToActor`. **Q5 não implementada**, porque não há cadastro de serviços por barbeiro para checar (nota na SPEC-0004). Testes: 2 de API (visibilidade dos afetados e as três ações tirando da lista, incluindo transferência para barbeiro ocupado → 422) e um E2E (atestado → diálogo com 2 → transferir e cancelar → 2 botões de WhatsApp). Verificado: `npm test` (262), `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (10).
