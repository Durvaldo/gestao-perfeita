# 0007 — Convenções da camada de servidor: Route Handlers, Zod, 422 no formato do legado, paginação e transações

- **Data**: 2026-10-03
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0007`
- **Task relacionada**: `TASK-0007`

## Contexto

Antes de portar os módulos de domínio (`TASK-0008`+), era preciso fixar como o `web/` expõe operações de servidor, para que todas as tasks seguissem o mesmo padrão. Referências do legado:

- validação nos Form Requests, com mensagens pt-BR em `lang/pt_BR/validation.php`;
- 422 no formato `{ message, errors }`, sendo que as telas exibem só o `message`;
- `paginate()` com 15 itens por página;
- `DB::transaction` nas operações compostas;
- `existsInTenant()` para FKs;
- 201 em create e 204 em destroy.

## Decisão

1. **Route Handlers (`src/app/api/**/route.ts`) são a API do painel**, com o mesmo desenho REST do legado. As telas (`TASK-0010`+) os consomem via `fetch`. A lógica de domínio fica em módulos de servidor (`src/server/<domínio>/`: schemas Zod, rótulos e funções de serviço), e os handlers ficam finos. Server Components podem chamar as funções de serviço direto, dentro de `withRequestTenant()`. Server Actions não são o padrão; podem ser adotadas pontualmente depois, reaproveitando os mesmos serviços.
2. **`apiRoute(handler)`** (`src/server/http/route.ts`) envolve todo handler autenticado:
   - exige sessão (401), lida dos headers da própria requisição;
   - exige tenant (403; o `super_admin` não tem tenant para rotas do painel);
   - roda o handler no contexto do tenant;
   - serializa o retorno: `created(data)` → 201, `noContent()` → 204, `Response` passa direto;
   - converte erros via `errorResponse()`.
   A autorização (`authorize(...)`) fica dentro do handler, junto da regra.
3. **Validação com Zod 4** (`src/server/http/validation.ts`: `parseBody`, `parseQuery`, `validate`).
   - As mensagens seguem o `lang/pt_BR/validation.php` do legado, com rótulo por campo (ex.: "O campo nome é obrigatório.", "O valor selecionado para status é inválido."). Elas são geradas a partir das issues do Zod: o locale `pt-BR` do Zod existe, mas não cita o campo.
   - Paridade com o `TrimStrings` + `ConvertEmptyStringsToNull` do Laravel: strings são aparadas e `""` vira `null`, então campo vazio conta como "obrigatório".
4. **422 no formato do legado**: `ValidationError` (`src/lib/http-errors.ts`) → `{ message, errors: { campo: [msgs] } }`. O `message` traz o primeiro erro + "(e mais N erro(s))". `ValidationError.field(campo, msg)` serve para regras de negócio (ex.: conflito de horário).
5. **FKs no tenant**: `assertReferencesInTenant({ campo: { model, id } }, rótulos)` (`src/server/http/references.ts`) consulta pelo `db` escopado e responde 422 "O valor selecionado para <rótulo> é inválido.". **É obrigatório em toda FK recebida do cliente**, porque a extension de tenant não valida FKs (ADR-0005).
6. **Paginação**: `pageFromRequest(request)` (`?page=`, com 422 se for inválido) + `paginate(page, { findMany, count })` (`src/server/http/pagination.ts`), com 15 por página, igual ao Laravel. A resposta é `{ data, currentPage, lastPage, perPage, total, from, to }`.
7. **JSON em camelCase** (nomes do Prisma), e não o snake_case do legado: as telas serão reescritas em React, então não há cliente legado a preservar. `toJsonValue` (`src/server/http/serialize.ts`) converte `Decimal` para string com 2 casas ("45.00", como o legado) e datas para ISO 8601.
8. **Transações**: `db.$transaction(async (tx) => ...)`. O `tx` herda a extension de tenant e o contexto, o que está coberto por teste. Use para toda operação composta (agendamento + serviços; comanda + estoque + financeiro).
9. **`tenantId` explícito nos creates de modelos diretos**: `tenantId: requireTenantId()`. Mantém os tipos do Prisma corretos sem cast, e a extension confere se o valor bate com o contexto.

## Alternativas consideradas

- **Server Actions como padrão**: menos código para formulários, mas sem um contrato HTTP explícito (mais difícil de testar de fora e de comparar com o legado). Os serviços em `src/server/` permitem adotá-las depois sem retrabalho.
- **Locale `pt-BR` do Zod**: as mensagens são genéricas, sem o nome do campo, e as telas mostram só o `message`.
- **Manter o snake_case do legado no JSON**: só faria sentido se o frontend Vue fosse mantido, e ele será reescrito.

## Consequências

- Esqueleto de um handler:
  ```ts
  export const POST = apiRoute(async ({ request, user }) => {
    const input = await parseBody(request, schema, labels);
    authorize(user, "resource", "create");
    await assertReferencesInTenant({ customerId: { model: "customer", id: input.customerId } }, labels);
    return created(await db.$transaction((tx) => tx.model.create({ data: { tenantId: requireTenantId(), ... } })));
  });
  ```
  Um exemplo completo e testado está em `src/server/http/__tests__/api-stack.test.ts`.
- Os testes de módulo podem chamar o handler exportado direto, com um `Request` e o cookie de uma sessão real (`auth.api.signInEmail`), sem subir o servidor.
- Novos modelos referenciáveis por ID precisam entrar no mapa de `references.ts`.

## Atualização — 2026-10-03 (`TASK-0008`)

Refinamentos feitos ao aplicar as convenções nos primeiros módulos:

- **Ordem das checagens = a do legado**: 404 (registro) → 403 (policy) → 422 (validação), quando a regra de autorização não depende do corpo. No Laravel, o `authorize()` do Form Request roda antes das `rules()`, então um profissional que manda dados inválidos num create recebe 403, e não 422. Validar antes só faz sentido quando a policy precisa de um campo do corpo (ex.: o `professionalId` numa regra de dono).
- **Registro em uso**: o `P2003` do Prisma (violação de FK, ex.: excluir um cliente com agendamentos) → **409** `InUseError` ("Este registro não pode ser excluído porque está vinculado a outros registros."). O legado respondia 500.
- **Helpers de campo** (`src/server/http/fields.ts`): `text`, `optionalText`, `integer`, `decimal`, `boolean`, `isoDate`/`formatIsoDate`. Aceitam as mesmas entradas que as regras do Laravel (`"30"` para inteiro; `1`/`"1"`/`"0"` para booleano; número ou string numérica para decimal, devolvido como string para o Prisma gravar `Decimal` sem passar por float).
- **CRUD genérico** (`src/server/http/crud.ts`, `crudRoutes`): reproduz o `apiResource` do legado (listagem paginada com os mais recentes primeiro; store/show/update/destroy; `PUT` e `PATCH` iguais). Campos opcionais ausentes no update mantêm o valor; `null` limpa, como no `validated()` do Laravel. Use para recursos simples; módulos com regra de negócio (agendamento, comanda) escrevem os handlers à mão, com as mesmas peças.
- Helpers de teste de API compartilhados: `tests/api.ts` (`loginCookie`, `call`).
