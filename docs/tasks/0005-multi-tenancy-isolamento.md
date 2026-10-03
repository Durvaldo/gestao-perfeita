---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0005 — Multi-tenancy: contexto de tenant e isolamento obrigatório

**Task ID**: `TASK-0005`

## Objetivo

Reproduzir no `web/` a garantia central do sistema: os dados de cada barbearia ficam isolados. No Laravel, isso é feito por:

- `App\Tenancy\CurrentTenant`: o tenant da requisição (singleton).
- `ResolveTenant`: resolve o tenant pelo parâmetro de rota `{tenant}` (slug, previsto para a página pública) ou pelo `tenant_id` do usuário autenticado. Precisa rodar **antes** do model binding (ver `bootstrap/app.php`; já houve bug real por isso).
- `BelongsToTenant` + `TenantScope`: filtro global por `tenant_id` em todo model com tenant, preenchimento automático de `tenant_id` no create e **falha fechada**: sem tenant resolvido, a query lança `TenantContextMissingException` em vez de retornar dados de todos.
- `horarios_trabalho` não tem `tenant_id`; o escopo vem indiretamente via `barbeiro`.
- Acesso cross-tenant a um registro por ID retorna **404** (não 403).

O mecanismo no `web/` é decisão desta task, com ADR: extensão/wrapper do ORM, Row Level Security do Postgres ou uma combinação.

## Dependências

- `TASK-0002`
- `TASK-0004`

## Critérios de conclusão

- [x] ADR do mecanismo de isolamento.
- [x] Impossível consultar uma entidade com tenant sem contexto de tenant, a não ser por uma saída explícita e nomeada para casos cross-tenant (super_admin, seeds).
- [x] `tenant_id` preenchido automaticamente na criação.
- [x] Testes portando o comportamento de `backend/tests/Feature/Tenancy/{TenantScopeTest,ResolveTenantMiddlewareTest,CadastroModelsTenantScopeTest}.php`.

## Referências

- `backend/app/Tenancy/*`, `backend/app/Http/Middleware/ResolveTenant.php`, `backend/bootstrap/app.php`
- [`docs/ESPECIFICACAO.md`](../ESPECIFICACAO.md) §3

## Notas de progresso
- 2026-10-03 — Mecanismo escolhido e registrado em [ADR-0005](../decisions/0005-isolamento-por-tenant-prisma-extension.md): `AsyncLocalStorage` (`src/lib/tenancy/context.ts`) + query extension do Prisma (`src/lib/tenancy/scope.ts`) aplicada ao `db` padrão, com `unscopedDb` como saída explícita. RLS foi descartado por ora, porque o usuário `postgres` é superusuário e ignora RLS. Além dos modelos diretos, os indiretos (`WorkingHour`, `ProfessionalService`, `AppointmentService`, `OrderItem`) também são escopados pelo pai, o que fecha uma provável brecha do legado (horários editáveis por ID entre tenants; ver ⚠️ em `backend/AGENTS.md`, constatada lendo o código e não corrigida no legado). Bug encontrado nos testes e corrigido: as queries do Prisma são lazy, então o `runWithTenant` passou a aguardar o callback dentro do contexto. Auth, seed e setup de testes passaram a usar `unscopedDb`. Limitação documentada: a extension não valida FKs de modelos diretos (fica com o helper da `TASK-0007`; nota adicionada lá). Verificado: `npm test` (32 testes; 16 novos em `src/lib/tenancy/__tests__/`, cobrindo os 3 testes de tenancy do legado e mais: falha fechada em leitura/escrita, escrita e movimentação cross-tenant recusadas, registro de outro tenant invisível por ID com update/delete falhando, condições do chamador preservadas, horários e itens de comanda escopados pelo pai, concorrência entre tenants, resolução por usuário/slug/nenhum); `npx tsc --noEmit`, `npm run lint`, `npm run build`; login + `/api/user` no dev server seguem funcionando. Sem commit (nenhum solicitado).
