# 0005 — Isolamento por tenant com extension do Prisma + AsyncLocalStorage

- **Data**: 2026-10-03
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0005`
- **Task relacionada**: `TASK-0005`

## Contexto

O legado isola os dados de cada barbearia com `CurrentTenant` (singleton por requisição), `ResolveTenant` (resolve por slug de rota ou pelo usuário) e `BelongsToTenant` + `TenantScope`. Esse escopo global filtra por `tenant_id`, preenche `tenant_id` no create e **falha fechado**: sem tenant resolvido, lança exceção. A `TASK-0005` precisava escolher o mecanismo equivalente no `web/`.

Na análise do legado apareceu uma brecha: `horarios_trabalho` não tem `tenant_id` nem escopo, e as rotas "shallow" `PUT`/`DELETE /api/horarios-trabalho/{id}` resolvem o registro sem filtro. Como a `HorarioTrabalhoPolicy` libera qualquer `admin`, o admin de um tenant provavelmente consegue editar ou excluir horários de outro. Isso foi constatado lendo o código, não executando; o teste do legado só cobre a criação aninhada. Ver o ⚠️ em `backend/AGENTS.md`.

## Decisão

- **Contexto**: `web/src/lib/tenancy/context.ts` usa `AsyncLocalStorage` (`runWithTenant(tenantId, fn)`, `currentTenantId()`, `requireTenantId()` e `TenantContextMissingError`). Cada cadeia assíncrona tem seu próprio tenant, então requisições concorrentes não se misturam. O `runWithTenant` **aguarda o callback dentro do contexto**, porque as queries do Prisma são *lazy* e, sem isso, rodariam depois de o contexto acabar. Esse bug apareceu nos testes durante a implementação.
- **Escopo**: `web/src/lib/tenancy/scope.ts` é uma *query extension* do Prisma (`$allModels.$allOperations`). O client padrão `db` (`web/src/lib/db.ts`) já sai estendido. Para os modelos com tenant:
  - Diretos (com `tenant_id`): `Customer`, `Professional`, `Service`, `Product`, `ScheduleBlock`, `Appointment`, `Order`, `FinancialEntry`.
  - Indiretos (escopados pelo pai): `WorkingHour` → `professional`, `ProfessionalService` → `professional`, `AppointmentService` → `appointment`, `OrderItem` → `order`. **Isso fecha a brecha do legado.**
  - Leitura, update, delete, upsert e agregações recebem o filtro de tenant **dentro de um `AND`**, de modo que as condições do chamador e os campos únicos do `findUnique`/`update`/`delete` são preservados.
  - `create`/`createMany`/`upsert` em modelo direto preenchem `tenantId`. Gravar com `tenantId` de outro tenant, mudar o `tenantId` num update ou escrever pela relação `tenant` lança erro.
  - Escrita em modelo indireto com chave do pai (`professionalId`, `orderId`...) verifica se o pai pertence ao tenant atual. Escrever pela relação (`connect`) é recusado.
  - **Falha fechada**: qualquer operação em modelo com tenant fora de contexto lança `TenantContextMissingError`.
  - Registro de outro tenant buscado por ID → `null`, ou erro "não encontrado" no `update`/`delete`. A camada HTTP traduz isso em **404**, como no legado.
- **Saída explícita**: `unscopedDb` (o client base, sem extension), para trabalho intencionalmente cross-tenant: adapter do Better Auth, seed, setup de testes e futuras features de super_admin. É o equivalente ao `withoutGlobalScope(TenantScope::class)`.
- **Resolução**: `web/src/lib/tenancy/resolve.ts`, com `resolveTenantId({ slug, user })` (o slug tem prioridade sobre o tenant do usuário, como no `ResolveTenant`) e `withRequestTenant(fn, { slug? })` (usa `getCurrentUser()` e roda `fn` no contexto). Sem tenant resolvido (sem sessão, slug desconhecido, super_admin), `fn` roda fora de contexto e as queries com tenant falham fechado. Quem chama decide a resposta (401/404).

## Alternativas consideradas

- **Row Level Security no Postgres**: é a defesa mais forte, porque vale até para SQL cru. Mas o usuário do banco local é `postgres` (superusuário, que **ignora RLS**), então seria preciso criar um role dedicado, e cada query precisaria rodar numa transação com `set_config('app.tenant_id', ...)`, o que é caro e intrusivo com o pool do adapter `pg`. Pode entrar depois como segunda camada.
- **Passar `tenantId` manualmente em cada query**: frágil. Um esquecimento vaza dados e nada falha fechado.
- **Client por requisição (`forTenant(id)`)**: funciona, mas exige propagar o client por toda a pilha. Com `AsyncLocalStorage`, o `db` padrão já é seguro em qualquer ponto da requisição.

## Consequências e limitações

- Código de app usa **sempre `db`**. Importar `unscopedDb` em código que atende requisição de tenant é erro de revisão.
- **A extension não valida chaves estrangeiras de modelos diretos.** Criar um `Appointment` no tenant A com `customerId` de um cliente do tenant B passaria. No legado, isso era coberto pelo `existsInTenant()` dos Form Requests; aqui, pelo helper de validação de FK da `TASK-0007`, que é obrigatório em toda FK recebida do cliente.
- Escritas aninhadas (`order.create({ data: { items: { create } } })`) e `include`/`select` de relações não passam pelo hook dos modelos filhos. Elas herdam o escopo da raiz, que é filtrada, desde que as FKs sejam válidas (ver o item anterior).
- `$queryRaw`/`$executeRaw` **não** são filtrados. Evite SQL cru em código de tenant; se for inevitável, filtre `tenant_id` explicitamente.
- O contexto vale para o runtime Node.js (padrão das rotas do Next). O Edge runtime não é suportado por este mecanismo.
