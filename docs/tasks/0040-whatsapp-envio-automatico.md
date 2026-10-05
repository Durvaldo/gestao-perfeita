---
status: bloqueada
modulo: web
owner:
criado-em: 2026-10-04
---

# 0040 — WhatsApp nível 2: envio automático com provedor

**Task ID**: `TASK-0040`

## Objetivo

Implementar o RF-3, o RF-4 e o RF-5 da [SPEC-0008](../specs/SPEC-0008.md):

- interface de canal de notificação, com o WhatsApp como primeira implementação;
- envio fora da requisição, com log de envios;
- eventos automáticos ligáveis por barbearia: confirmação, lembrete, cancelamento/remarcação, aniversário;
- consentimento do cliente.

Provavelmente será dividida em tasks menores quando for desbloqueada: canal e log, eventos, lembrete agendado, consentimento.

## Dependências

- `TASK-0039`.
- **Decisões do responsável sobre as questões Q1 (provedor), Q2 (número de quem), Q3 (plano de assinatura) e Q4 (consentimento padrão) da SPEC-0008.**
- **Human gate**: conta e credenciais do provedor escolhido.

## Critérios de conclusão

- [ ] Decisões registradas na SPEC-0008; ADR do provedor e do mecanismo de fila/agendamento.
- [ ] Em ambiente de teste do provedor: criar um agendamento envia a confirmação e grava o log; o lembrete sai no horário configurado (testado com data simulada); um cliente que recusou não recebe nada.
- [ ] Uma falha no envio não desfaz a operação que o disparou (teste).

## Referências

- [SPEC-0008](../specs/SPEC-0008.md) (RF-3 a RF-5, Q1 a Q4)
- [`ROADMAP_IMPLEMENTACAO.md`](../ROADMAP_IMPLEMENTACAO.md), Passo 13; [`PLANO_MELHORIAS_BENCHMARK.md`](../PLANO_MELHORIAS_BENCHMARK.md), Bloco E

## Notas de progresso

- 2026-10-04 — Criada bloqueada: depende de decisões de produto e contrato (provedor, número, plano, consentimento) e de credenciais externas.
