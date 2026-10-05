---
status: concluida
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

- [x] `nav-items.ts` esconde os três itens para quem não é admin, e as três páginas não exibem dados ao profissional (a mesma resposta nas três: redirecionar ou 404).
- [x] Como profissional: `GET /api/professionals` lista só ele; `GET /api/professionals/{colega}` → 404 ou 403; `GET /api/services` e `GET /api/products` → 200.
- [x] `policies.ts` e a matriz de `policies.test.ts` atualizadas.
- [x] Testes de API cobrindo os casos acima; `npm test`, `npm run lint` e `npx tsc --noEmit` passando.
- [x] Verificado no navegador com `carlos@barbearia-centro.com`.

## Referências

- [SPEC-0001](../specs/SPEC-0001.md) (RF-1, RF-2, RF-4)
- [ADR-0006](../decisions/0006-autorizacao-policies-funcoes-puras.md)

## Notas de progresso
- 2026-10-04 — Implementado. **Ajuste no RF-1, registrado na SPEC-0001:** `/barbeiros` continua acessível ao profissional, como "Meus horários" e só com o registro dele, porque é ali que ele edita os próprios horários (capacidade que já existia). Serviços e Produtos ficaram só para o admin (menu e página → 404). Além da spec, também ficou recusada (403) a leitura dos horários de um colega pela API. Mudanças: `visibleProfessionals()` e as regras `professional.view` e `workingHour.viewAny`/`view` como admin-ou-dono em `policies.ts`; `visibleNavItems()` em `nav-items.ts`. Testes novos: matriz de policies, listagem e detalhe de profissionais, horários de colega, menu por papel e E2E da visão do profissional. Verificado: `npm test` (200), `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (4). Efeito colateral esperado: na agenda e na comanda avulsa, o select de barbeiro do profissional passa a listar só ele, o que já vai na direção da `TASK-0023` e da Q1 da SPEC-0001 (a API de agendamento continua aceitando um colega até a `TASK-0024` ser decidida).
