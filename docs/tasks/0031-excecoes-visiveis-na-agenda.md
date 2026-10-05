---
status: em-andamento
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

- [ ] Tela de exceções seguindo o padrão das telas de cadastro (`web/AGENTS.md`), com as ações conforme o papel.
- [ ] Uma exceção de amanhã das 14h às 16h aparece no calendário do profissional (e no de todos, se for da barbearia), e os horários dentro dela não abrem o formulário.
- [ ] Item no menu; `npm test` e `npm run lint` passando; verificado no navegador.

## Referências

- [SPEC-0004](../specs/SPEC-0004.md) (RF-1, RF-4)
- `web/src/app/(app)/agenda/`

## Notas de progresso
