---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0007 — Convenções da camada de servidor: validação, erros e paginação

**Task ID**: `TASK-0007`

## Objetivo

Antes de portar os módulos de domínio, fixar como o `web/` expõe operações de servidor, para que as tasks 0008 em diante sigam um padrão único. Decidir com ADR:

- Route Handlers (`app/api/**`) × Server Actions × combinação (ex.: Server Actions para as mutações das telas e Route Handlers onde for preciso uma API HTTP).
- Biblioteca de validação (ex.: Zod) e formato do erro de validação. O frontend atual espera o 422 do Laravel (`{ message, errors: { campo: [msg] } }`), com mensagens em pt-BR (ver `backend/lang/pt_BR/validation.php`).
- Paginação: o Laravel usa `paginate()` com 15 itens por página por padrão (`?page=`). Defina o equivalente.
- FKs vindas do cliente validadas **dentro do tenant**: no Laravel, `existsInTenant()` (duplicado em `AgendamentoRequest` e `ComandaItemRequest`) faz `Model::find()` com o escopo de tenant e falha com `O valor selecionado é inválido.`. Isso impede referenciar cliente, barbeiro ou serviço de outra barbearia. O equivalente precisa ser um helper reutilizável, aplicado em toda FK recebida.
- Transações: um padrão para operações compostas (agendamento + serviços; comanda + estoque + financeiro).

## Dependências

- `TASK-0006`

## Critérios de conclusão

- [x] ADR com as escolhas acima.
- [x] Helpers prontos e testados: validação → erro padronizado, paginação e wrapper de transação.
- [x] Uma operação de exemplo usando a pilha completa: auth → tenant → autorização → validação → resposta.

## Referências

- [ADR-0006](../decisions/0006-autorizacao-policies-funcoes-puras.md): `requireUser`/`authorize`/`visibleToActor` (`web/src/lib/authz/`) e `errorResponse` (`web/src/lib/http-errors.ts`, já trata 401/403/404 e `P2025`). Estenda o `errorResponse` com o 422 de validação.
- [ADR-0005](../decisions/0005-isolamento-por-tenant-prisma-extension.md): o `db` já filtra por tenant e responde `null`/"não encontrado" para registro de outro tenant (→ 404). A extension **não** valida chaves estrangeiras de modelos diretos, então o helper de validação de FK desta task é obrigatório. Use `withRequestTenant()` para abrir o contexto em cada operação.
- `backend/bootstrap/app.php`, `backend/lang/pt_BR/validation.php`
- `frontend/src/api/*.js` (contrato que as telas consomem hoje)

## Notas de progresso
- 2026-10-03 — Decisões em [ADR-0007](../decisions/0007-convencoes-camada-servidor.md): Route Handlers como API do painel (serviços em `src/server/<domínio>/`); `apiRoute` (sessão 401 → tenant 403 → contexto → serialização → erros); Zod 4 com mensagens pt-BR do legado geradas a partir das issues (o locale pt-BR do Zod não cita o campo) e normalização trim/`""`→`null` (paridade com o `ConvertEmptyStringsToNull`); `ValidationError` 422 `{ message, errors }`, com `message` = primeiro erro + "(e mais N erros)", porque as telas só mostram o `message`; `assertReferencesInTenant` para FKs (fecha a limitação da ADR-0005); `paginate` com 15 por página; JSON em camelCase com `Decimal` → "0.00"; `db.$transaction` (o `tx` herda o escopo de tenant, testado); `tenantId: requireTenantId()` explícito nos creates. Zod 4.6.5 instalado. Verificado: `npm test` (99 testes; 19 novos: mensagens e formato do 422, normalização, paginação, serialização e uma operação de exemplo pela pilha completa com sessão real, cobrindo 401, 403 sem tenant, 403 por policy, 422 por campo, 422 por FK de outro tenant, 201 com tenant preenchido, listagem paginada escopada com decimais como string, 404 cross-tenant e rollback de transação escopada); `npx tsc --noEmit`, `npm run lint`, `npm run build`. Sem commit (nenhum solicitado).
