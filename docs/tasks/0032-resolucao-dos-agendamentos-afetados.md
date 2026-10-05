---
status: bloqueada
modulo: web
owner:
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

- [ ] Decisões registradas na SPEC-0004.
- [ ] Com 3 agendamentos no dia, registrar um atestado lista os 3; remarcar um, transferir outro e cancelar o terceiro deixa a agenda livre no período, respeitando conflito e disponibilidade.
- [ ] Testes de API das três ações (incluindo transferência para profissional ocupado → recusada); `npm test` e `npm run lint` passando; verificado no navegador.

## Referências

- [SPEC-0004](../specs/SPEC-0004.md) (RF-3, Q1, Q3, Q5)
- [SPEC-0008](../specs/SPEC-0008.md) (RF-1)

## Notas de progresso

- 2026-10-04 — Criada bloqueada: depende das questões em aberto Q1, Q3 e Q5 da SPEC-0004.
