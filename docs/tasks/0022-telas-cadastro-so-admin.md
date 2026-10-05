---
status: em-andamento
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0022 — Telas de cadastro só para o admin e API de profissionais restrita

**Task ID**: `TASK-0022`

## Objetivo

Implementar o RF-1 e o RF-2 da [SPEC-0001](../specs/SPEC-0001.md):

- o profissional deixa de ver no menu, e de conseguir abrir pela URL, as telas **Barbeiros**, **Serviços** e **Produtos**;
- `/api/services` e `/api/products` continuam legíveis para ele, porque os formulários de agendamento e de comanda precisam deles;
- `/api/professionals` passa a devolver ao profissional só o próprio registro.

## Dependências

- Nenhuma.

## Critérios de conclusão

- [ ] `nav-items.ts` esconde os três itens para quem não é admin, e as três páginas não exibem dados ao profissional (a mesma resposta nas três: redirecionar ou 404).
- [ ] Como profissional: `GET /api/professionals` lista só ele; `GET /api/professionals/{colega}` → 404 ou 403; `GET /api/services` e `GET /api/products` → 200.
- [ ] `policies.ts` e a matriz de `policies.test.ts` atualizadas.
- [ ] Testes de API cobrindo os casos acima; `npm test`, `npm run lint` e `npx tsc --noEmit` passando.
- [ ] Verificado no navegador com `carlos@barbearia-centro.com`.

## Referências

- [SPEC-0001](../specs/SPEC-0001.md) (RF-1, RF-2, RF-4)
- [ADR-0006](../decisions/0006-autorizacao-policies-funcoes-puras.md)

## Notas de progresso
