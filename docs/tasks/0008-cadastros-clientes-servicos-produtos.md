---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0008 — Cadastros no servidor: clientes, serviços e produtos

**Task ID**: `TASK-0008`

## Objetivo

Portar o CRUD de `clientes`, `servicos` e `produtos` (listar paginado, criar, ler, atualizar e excluir), com as mesmas validações dos Form Requests e as permissões de `TASK-0006`.

## Dependências

- `TASK-0007`

## Critérios de conclusão

- [x] CRUD dos três recursos, com isolamento por tenant e autorização.
- [x] Validações equivalentes a `ClienteRequest`, `ServicoRequest` e `ProdutoRequest`, incluindo nullability (ex.: `produtos.estoque_qtd` nulo = sem controle de estoque).
- [x] Testes portando os casos de `backend/tests/Feature/Cadastro/CadastroApiTest.php`.

## Referências

- [ADR-0007](../decisions/0007-convencoes-camada-servidor.md): siga `apiRoute` + `parseBody` + `authorize` + `assertReferencesInTenant` + `paginate` (exemplo em `web/src/server/http/__tests__/api-stack.test.ts`); serviços em `web/src/server/<domínio>/`.
- `backend/app/Http/Controllers/{Cliente,Servico,Produto}Controller.php`, `backend/app/Http/Requests/{Cliente,Servico,Produto}Request.php`

## Notas de progresso
- 2026-10-03 — Implementados `/api/customers`, `/api/services` e `/api/products` (index paginado com os mais recentes primeiro, store 201, show, update via `PUT`/`PATCH`, destroy 204) com o `crudRoutes` genérico (`web/src/server/http/crud.ts`) e módulos `web/src/server/{customers,services,products}/` (schema Zod + rótulos pt-BR). Validações equivalentes a `ClienteRequest`/`ServicoRequest`/`ProdutoRequest`, com helpers de campo (`web/src/server/http/fields.ts`) que aceitam as mesmas entradas do Laravel. Paridade: ordem 404 → 403 → 422 (o Form Request autoriza antes de validar); no update, campo opcional ausente mantém o valor e `null` limpa. Melhoria sobre o legado: excluir registro em uso (ex.: cliente com comanda) → 409 com mensagem, em vez de 500 (`InUseError`, `P2003`). Refinamentos registrados como atualização da [ADR-0007](../decisions/0007-convencoes-camada-servidor.md). Helpers de teste compartilhados em `web/tests/api.ts`. Verificado: `npm test` (119 testes; 20 novos em `web/src/server/__tests__/catalog-crud.test.ts`, que portam os 3 casos × 3 recursos do `CadastroApiTest` e acrescentam 401, IDs inválidos ou inexistentes, mensagens de validação, entradas soltas, serialização, semântica do update e 409); `npx tsc --noEmit`, `npm run lint`, `npm run build`; teste HTTP no dev server (listar, 422, criar, excluir). Sem commit (nenhum solicitado).
