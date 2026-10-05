<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Ver também o [AGENTS.md raiz](../AGENTS.md).

# web — aplicação Next.js full-stack (em construção)

> O bloco acima é gerado pelo Next.js e **reinserido pelo `next dev`**. Mantenha-o como está (em inglês, por ser conteúdo do framework). `CLAUDE.md` neste diretório só faz `@AGENTS.md`.

## Propósito

Aplicação Next.js full-stack do sistema. Ela substituiu `backend/` (Laravel) e `frontend/` (Vue) com paridade funcional ([ADR-0001](../docs/decisions/0001-migracao-full-stack-nextjs.md)). O legado foi removido (`TASK-0019`) e continua no histórico do Git, no commit `7446d48`, para consulta (`git show 7446d48:backend/app/...`). As tasks ficam em [`docs/tasks/`](../docs/tasks/).

Estado atual: scaffold (`TASK-0001`), camada de dados (`TASK-0002`: Prisma, schema completo, migration inicial) e seed de desenvolvimento (`TASK-0003`) autenticação (`TASK-0004`: Better Auth, login/logout/sessão por API) isolamento por tenant (`TASK-0005`) autorização por papel (`TASK-0006`) convenções da camada de servidor (`TASK-0007`) cadastros de clientes, serviços e produtos (`TASK-0008`) de profissionais e horários de trabalho (`TASK-0009`), agendamento (`TASK-0012`), comandas (`TASK-0014`), financeiro (`TASK-0016`) e dashboard (`TASK-0017`) no servidor (toda a API do legado está portada); casca da UI com login, layout e componentes base (`TASK-0010`) e todas as telas do painel: cadastros (`TASK-0011`), agenda (`TASK-0013`), comandas (`TASK-0015`), financeiro e dashboard (`TASK-0018`).

## Tech stack

Fonte: `package.json`.

- `next 16.3.8` (App Router), `react` / `react-dom 19.2.8`, TypeScript 5 (`strict`).
- Tailwind CSS v4 via `@tailwindcss/postcss` (`postcss.config.mjs`). O tema (variáveis do shadcn, primária azul) está em `src/app/globals.css`.
- UI: shadcn/ui 4.21 (Radix, estilo `radix-nova`, `components.json`), `sonner` (toasts), `lucide-react` (ícones), `next-themes` (exigido pelo wrapper do sonner) ([ADR-0010](../docs/decisions/0010-kit-de-ui-shadcn-radix.md)).
- ESLint 9 com `eslint-config-next` (`core-web-vitals` + `typescript`), em `eslint.config.mjs`.
- Validação: Zod 4, com mensagens pt-BR no estilo do legado geradas por `src/server/http/validation.ts`.
- Testes: Vitest 5 + `@testing-library/react` + jsdom ([ADR-0002](../docs/decisions/0002-vitest-como-test-runner-do-web.md)).
- Dados: Prisma 7.10.0 (`prisma`, `@prisma/client`, `@prisma/adapter-pg` + `pg`) sobre PostgreSQL ([ADR-0003](../docs/decisions/0003-camada-de-dados-prisma-schema-em-ingles.md)).
- Auth: `better-auth 1.7.7` (e-mail/senha, sessão no banco, adapter Prisma), senhas com bcrypt via `bcryptjs` ([ADR-0004](../docs/decisions/0004-autenticacao-better-auth.md)).
- `@types/node ^24`, alinhado ao Node 24 usado localmente. O `^20` do scaffold conflitava com o peer do Vitest 5.

## Estrutura

- `src/app/`: App Router. `layout.tsx` (raiz: `lang="pt-BR"`, fontes Geist, `<Toaster />`), `not-found.tsx` (404 em pt-BR), `globals.css`.
  - `(auth)/login/`: tela de login (`login-form.tsx`, campos não controlados + `FormData`, `method="post"`).
  - `(app)/`: painel. O **`layout.tsx` é a guarda de rotas** (sem sessão → `/login`; sem tenant → aviso) e monta o `AppShell`. `page.tsx` = dashboard (Server Component que chama `buildDashboard()` dentro de `runWithTenant`); `agenda/` (calendário semana/dia), `comandas/` e `comandas/[id]/`, `financeiro/` (só admin), `clientes/`, `barbeiros/`, `servicos/`, `produtos/`; e `componentes/` (exemplos dos componentes base, só em dev).
- `src/components/ui/`: componentes shadcn (gerados; podem ser editados).
- `src/components/`: `app-modal.tsx`, `confirm-provider.tsx` (`useConfirm`), `decimal-input.tsx`, `phone-input.tsx` (telefone com máscara, SPEC-0005), `charts/bar-list.tsx` (barras horizontais de série única em HTML puro), `shell/` (`app-shell.tsx` com sidebar, sheet mobile e menu do usuário; `nav-items.ts`; `no-tenant-notice.tsx`; `sign-out-button.tsx`).
- `src/lib/calendar.ts`: helpers de dia (`addDays`, `startOfWeek`, `weekdayIndex`, rótulos) usados pela agenda.
- `src/lib/format.ts` (formatação pt-BR; `formatPhone` aplica a máscara de telefone), `src/lib/toast.ts` (`toastSuccess`, `toastError`, `apiErrorMessage`), `src/lib/auth-client.ts` (Better Auth no browser).
- `src/lib/api-client.ts`: `api<T>(path, { method, body })` → `{ ok, status, data }` ou `{ ok: false, status, message, errors }` (nunca lança em erro HTTP). Tipo `Paginated<T>`.
- `src/components/crud/`: `usePaginated(path)` (lista paginada + `reload`) e `crud-parts.tsx` (`PageHeader`, `FormField` com erros do 422, `FormError`, `TableState`, `PaginationBar`).
- Telas de cadastro: `src/app/(app)/{clientes,servicos,produtos,barbeiros}/`. Cada uma tem um `page.tsx` (servidor: calcula `canManage` com `can()`) e um `*-screen.tsx` (cliente). Barbeiros inclui `working-hours-dialog.tsx`.
- `src/lib/__tests__/`, `src/components/__tests__/`, `src/server/__tests__/` etc.: testes Vitest. Também é permitido colocar os testes ao lado do código.
- `src/lib/db.ts`: exporta **`db`** (client padrão, com isolamento por tenant) e **`unscopedDb`** (client base, sem isolamento, só para trabalho intencionalmente cross-tenant). Usa o adapter `pg` e é reaproveitado entre hot reloads em dev. Nunca instancie `PrismaClient` em outro lugar ([ADR-0005](../docs/decisions/0005-isolamento-por-tenant-prisma-extension.md)).
- `src/lib/tenancy/`: `context.ts` (`runWithTenant`, `currentTenantId`, `requireTenantId`, `TenantContextMissingError`), `scope.ts` (extension do Prisma que filtra e valida por tenant) e `resolve.ts` (`resolveTenantId`, `withRequestTenant`).
- `src/generated/prisma/`: client gerado pelo `prisma generate`. É **gitignored** e regenerado no `postinstall`; nunca edite. Import: `@/generated/prisma/client`.
- `prisma/schema.prisma`: schema (fonte da verdade do banco). `prisma/migrations/`: migrations versionadas. `prisma7.config.ts`: config do Prisma (nome padrão no Prisma 7.10), que carrega o `.env` via `dotenv`.
- `prisma/seed-data.ts`: dados de desenvolvimento (`seed(db)`), idempotentes. `prisma/seed.ts`: entry point do `prisma db seed` (via `tsx`).
- `src/lib/password.ts`: `hashPassword`/`verifyPassword` (bcrypt, custo 12, via `bcryptjs`), usados pelo Better Auth e pelo seed.
- `src/lib/auth.ts`: instância do Better Auth (`auth`). `src/app/api/auth/[...all]/route.ts`: handler HTTP dele.
- `src/lib/current-user.ts`: `getCurrentUser(headers?)` devolve o usuário logado (`id`, `name`, `email`, `role`, `tenantId`, `professional`) ou `null`. **É a forma padrão de saber quem está logado no servidor.**
- `src/lib/account-status.ts`: `isAccessBlocked`/`isUserAccessBlocked` (profissional inativo não acessa; [ADR-0008](../docs/decisions/0008-desativar-profissional-e-usuario-com-tenant.md)).
- `src/lib/auth-messages.ts`: `authErrorMessage()` traduz os códigos de erro do Better Auth para pt-BR.
- `src/lib/authz/`: `policies.ts` (matriz de permissões em funções puras: `can`, `visibleToActor`, `visibleProfessionals`) e `guard.ts` (`requireUser` → 401, `authorize` → 403) ([ADR-0006](../docs/decisions/0006-autorizacao-policies-funcoes-puras.md)).
- `src/lib/http-errors.ts`: `UnauthenticatedError`, `ForbiddenError`, `NotFoundError`, `InUseError` (409; o `P2003` do Prisma também vira 409), `ValidationError` (422 `{ message, errors }`; `ValidationError.field()` para regras de negócio), com as mensagens pt-BR do legado, e `errorResponse(error)`, que converte essas classes e o `P2025` do Prisma em JSON com o status certo.
- `src/server/http/`: infraestrutura da API ([ADR-0007](../docs/decisions/0007-convencoes-camada-servidor.md)): `route.ts` (`apiRoute`, `created`, `noContent`), `validation.ts` (`parseBody`, `parseQuery`, `validate`), `references.ts` (`assertReferencesInTenant`), `pagination.ts` (`pageFromRequest`, `paginate`), `serialize.ts` (`toJsonValue`).
- `src/server/http/fields.ts` (builders de campos Zod compatíveis com as regras do Laravel; `phone()`/`optionalPhone()` gravam telefone só com dígitos, via `src/lib/phone.ts`, [SPEC-0005](../docs/specs/SPEC-0005.md)) e `src/server/http/crud.ts` (`crudRoutes`: o `apiResource` genérico para recursos simples, ver a atualização da ADR-0007).
- `src/server/<domínio>/`: schema Zod, rótulos pt-BR e handlers/serviços de cada módulo (`customers/`, `services/`, `products/`, `professionals/`, `working-hours/`, `appointments/`, `orders/`, `financial/`, `dashboard/`). As regras de agenda (expediente, conflito, trava) ficam em `src/server/appointments/rules.ts`.
- `src/lib/timezone.ts`: `zonedParts`, `zonedToUtc`, `parseDateTimeInput`, `isDateTimeInput` (fuso da barbearia, via `Intl`; [ADR-0009](../docs/decisions/0009-agendamento-fuso-por-tenant-e-regras.md)). Os Route Handlers em `src/app/api/**` só reexportam (`export const { GET, POST } = customerRoutes.collection`).
- `src/app/api/user/route.ts`: `GET /api/user`, equivalente ao legado (usuário + `professional`, ou 401).
- `tests/`: infraestrutura de teste (`global-setup.ts` aplica as migrations no banco de teste; `db.ts` tem o `truncateAll()`).
- Alias de import: `@/*` → `src/*` (`tsconfig.json`). Os testes resolvem o mesmo alias via `resolve.tsconfigPaths` no `vitest.config.mts`.
- `public/`: estáticos (vazio por enquanto).

## Configuração

- `.env.example` → copie para **`.env`** (lido pelo Prisma via `dotenv` e também pelo Next.js):
  - `DATABASE_URL`: banco da app, `agenda_web`.
  - `TEST_DATABASE_URL`: banco da suíte, `agenda_web_test`. **É apagado a cada teste**; precisa ser diferente de `DATABASE_URL`, e o `vitest.config.mts` aborta se não for.
  - `BETTER_AUTH_SECRET` (gere com o comando do `.env.example`) e `BETTER_AUTH_URL` (`http://localhost:3001`).
- Os dois bancos ficam no Postgres local do container `esus-db` (porta 5433), ao lado do `agenda_barbearia` do Laravel, que não é tocado.
- `.gitignore` ignora `.env*`, exceto `.env.example`.
- Porta **3001** em `dev` e `start`, para não colidir com o `frontend` Vue (3000) nem com o `php artisan serve` (8000) durante a convivência.

## Testes

> Regra 3 do [AGENTS.md raiz](../AGENTS.md).

- `npm test` (`vitest run`, execução única) e `npm run test:watch` (modo watch).
- **E2E**: `npm run test:e2e` (Playwright, `e2e/`). O login é limitado a 5 por minuto no build de produção, então o helper `login()` do spec entra pelo formulário só na primeira vez de cada usuário e reaproveita os cookies depois (worker único). Sobe um build de produção na **porta 3002** apontando para o `TEST_DATABASE_URL` (zerado e populado com o seed pelo `e2e/global-setup.ts` → `e2e/reset-test-db.ts` via `tsx`) e usa o **Chrome instalado** (`channel: "chrome"`, sem baixar navegadores). O navegador roda no fuso de Tóquio de propósito, para provar que a UI mostra o horário da barbearia. Cobre o ciclo login → agendar → comanda → produto → fechar → financeiro → dashboard, a visão restrita do profissional e o erro de login. Não toca no servidor de dev (3001) nem no banco de dev. O Vitest ignora a pasta `e2e/`.
- Ambiente `jsdom` (`vitest.config.mts`).
- O Vitest **não suporta Server Components `async`** (guia oficial em `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`). Teste essas telas com E2E; a ferramenta será escolhida em `TASK-0019`. Lógica de servidor (regras de negócio, validação, autorização) deve ficar em funções puras ou módulos testáveis direto pelo Vitest.
- **Testes com banco** exigem o Postgres no ar. O `globalSetup` roda `prisma migrate deploy` no `TEST_DATABASE_URL`. Cada arquivo de teste que usa o banco declara `// @vitest-environment node` e chama `truncateAll()` no `beforeEach`. Os arquivos rodam em sequência (`fileParallelism: false`) porque compartilham o banco.
- Não use `prisma migrate reset` em scripts de teste: o Prisma 7 o bloqueia quando executado por agentes de IA ([ADR-0003](../docs/decisions/0003-camada-de-dados-prisma-schema-em-ingles.md)).

## Build

- `npm install` (já roda `prisma generate`), `npm run dev`, `npm run build`, `npm start`, `npm run lint`.
- Banco:
  - `npm run db:migrate` (`prisma migrate dev`: cria e aplica uma migration a partir do schema, em dev);
  - `npm run db:deploy` (aplica as migrations pendentes);
  - `npm run db:seed` (`prisma db seed` → `tsx prisma/seed.ts`; idempotente, pode rodar quantas vezes quiser);
  - `npm run db:generate`;
  - `npm run db:studio`.
- No Prisma 7, o `migrate dev` **não** roda mais o `generate`: depois de mudar o schema, rode `npm run db:generate`.
- ⚠️ **Depois de mudar o schema e gerar o client, reinicie o `npm run dev`.** O client Prisma fica em `globalThis` entre hot reloads (`src/lib/db.ts`), então o servidor de dev continua usando o client antigo e quebra com `Unknown field ...` nos campos novos. Já aconteceu duas vezes.
- O `migrate dev` recusa rodar em modo não interativo quando a migration perde dados (ex.: remover coluna). Nesse caso, gere o SQL com `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` dentro de uma pasta nova em `prisma/migrations/`, revise e aplique com `npm run db:deploy`.
- Typecheck: `npx tsc --noEmit` (o `next build` também checa tipos).
- ⚠️ O `npm audit` aponta vulnerabilidades *high* em `braces`, vindas de `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` (só ferramenta de lint, em dev). O `npm audit fix --force` sugerido **rebaixaria** o `eslint-config-next` para a 14, então não aplique. Reavalie quando sair uma versão nova do `eslint-config-next`.

## Convenções

- Código (identificadores, comentários, mensagens de log/erro interno) em **inglês** (regra 1). Textos de UI e mensagens ao usuário final em **pt-BR**.
- Valores monetários e percentuais são `Decimal` (decimal.js, vindo do Prisma). Faça as contas com os métodos do `Decimal` (`plus`, `times`, `toFixed`), nunca com `number`.
- O domínio fica **em inglês**, e `Barbeiro` passa a ser `Professional` ([ADR-0003](../docs/decisions/0003-camada-de-dados-prisma-schema-em-ingles.md)). Na UI os rótulos continuam em pt-BR (ex.: "Barbeiro").
- Antes de usar uma API do Next.js, consulte `node_modules/next/dist/docs/`: a versão 16 tem mudanças incompatíveis com versões anteriores.

## Mapeamento de nomes (legado Laravel → `web/`)

| Laravel (tabela / model) | `web/` (tabela / model Prisma) | Colunas e valores que mudaram |
|---|---|---|
| `planos` / `Plano` | `plans` / `Plan` | `nome`→`name`, `descricao`→`description`, `preco_mensal`→`monthly_price`, `limite_barbeiros`→`max_professionals`, `limite_clientes`→`max_customers`, `ativo`→`active` |
| `tenants` / `Tenant` | `tenants` / `Tenant` | `plano_id`→`plan_id`, `cnpj_cpf`→`tax_id`, `telefone`→`phone`, `endereco`→`address`; status `ativo/suspenso/trial` → `active/suspended/trial` |
| `users` / `User` | `users` / `User` | `tipo`→`role` (`super_admin`, `admin`, `prestador_de_servico`→`professional`, `cliente`→`customer`), `telefone`→`phone`, `email_verified_at`→`email_verified` (boolean); **`password` saiu**: a senha fica em `accounts` (`provider_id = 'credential'`); sem `remember_token` |
| `sessions`, `personal_access_tokens` (Sanctum) | `sessions`, `accounts`, `verifications` (Better Auth) | Ver ADR-0004 |
| `clientes` / `Cliente` | `customers` / `Customer` | `nome`, `telefone`, `data_nascimento`→`birth_date`, `observacoes`→`notes` |
| `barbeiros` / `Barbeiro` | `professionals` / `Professional` | `comissao_percentual_padrao`→`default_commission_rate`, `foto_url`→`photo_url`; `user_id` agora é único |
| `servicos` / `Servico` | `services` / `Service` | `duracao_minutos`→`duration_minutes`, `preco`→`price` |
| `produtos` / `Produto` | `products` / `Product` | `estoque_qtd`→`stock_quantity` (null = sem controle de estoque) |
| `barbeiro_servico` | `professional_services` / `ProfessionalService` | `comissao_percentual`→`commission_rate`, `preco_personalizado`→`custom_price` |
| `horarios_trabalho` / `HorarioTrabalho` | `working_hours` / `WorkingHour` | `dia_semana`→`weekday` (0 = domingo), `hora_inicio`/`hora_fim`→`start_time`/`end_time` |
| `bloqueios_agenda` / `BloqueioAgenda` | `schedule_blocks` / `ScheduleBlock` | `data_inicio`/`data_fim`→`starts_at`/`ends_at`, `motivo`→`reason` |
| `agendamentos` / `Agendamento` | `appointments` / `Appointment` | `data_hora_inicio`/`data_hora_fim`→`starts_at`/`ends_at`, `criado_por_user_id`→`created_by_user_id`; status `pendente/confirmado/concluido/cancelado` → `pending/confirmed/completed/cancelled` |
| `agendamento_servico` | `appointment_services` / `AppointmentService` | `preco_no_momento`→`price_at_booking` |
| `comandas` / `Comanda` | `orders` / `Order` | `valor_total`→`total_amount`, `forma_pagamento`→`payment_method` (`dinheiro/pix/cartao_debito/cartao_credito` → `cash/pix/debit_card/credit_card`), status `aberta/paga/cancelada` → `open/paid/cancelled`; **novo** `paid_at` |
| `comanda_itens` / `ComandaItem` | `order_items` / `OrderItem` | `tipo`→`type` (`servico/produto` → `service/product`), `quantidade`→`quantity`, `preco_unitario`/`preco_total`→`unit_price`/`total_price` |
| `financeiro_lancamentos` / `FinanceiroLancamento` | `financial_entries` / `FinancialEntry` | `tipo` `receita/despesa` → `income/expense`, `categoria`→`category`, `valor`→`amount`, `data`→`entry_date` |

## Dados de desenvolvimento (seed)

`npm run db:seed` popula o `DATABASE_URL` com dados **fixos**. O seed do legado usava factories aleatórias e duplicava dados a cada execução; o novo procura cada registro antes de criar, então rodar de novo não muda nada.

- 2 planos (`Básico` R$ 49,90; `Premium` R$ 129,90) e 2 tenants: `barbearia-centro` (Básico, `active`) e `barbearia-zona-sul` (Premium, `trial` por 14 dias).
- Por tenant: 2 profissionais (todos os serviços, expediente de segunda a sexta, 09:00–18:00), 4 serviços, 3 produtos com estoque e 6 clientes (alguns com e-mail e data de nascimento).
- Logins, todos com a senha **`senha123`** (apenas para dev):

| E-mail | Papel | Tenant |
|---|---|---|
| `superadmin@agenda.com` | `super_admin` | — |
| `admin@barbearia-centro.com` | `admin` | barbearia-centro |
| `carlos@barbearia-centro.com`, `rafael@barbearia-centro.com` | `professional` | barbearia-centro |
| `admin@barbearia-zona-sul.com` | `admin` | barbearia-zona-sul |
| `bruno@barbearia-zona-sul.com`, `diego@barbearia-zona-sul.com` | `professional` | barbearia-zona-sul |

Os e-mails de super_admin e admin são os mesmos do legado. Os profissionais são novos: no legado eles tinham e-mails aleatórios e senha `password`.

## Autenticação

[ADR-0004](../docs/decisions/0004-autenticacao-better-auth.md).

- **Sem registro público** (`disableSignUp`). Usuários vêm do seed ou de código da app. Criar um usuário com login exige `users` + `accounts` com `providerId: "credential"`, `accountId: String(user.id)` e `password` (hash de `hashPassword`); veja `ensureCredentialAccount` em `prisma/seed-data.ts`. Onboarding self-service: `TASK-0020` (adiada). Recuperação de senha e verificação de e-mail: `TASK-0021` (adiada).
- Endpoints: `POST /api/auth/sign-in/email` (`{ email, password }`), `POST /api/auth/sign-out`, `GET /api/auth/get-session` e `GET /api/user`.
- No servidor, use **`getCurrentUser()`**. Ele lê `role`, `tenantId` e `professional` do banco a cada chamada, então não confie em campos do cache da sessão para autorizar.
- Os erros do Better Auth vêm em inglês, com `code`. Na UI, mostre sempre `authErrorMessage(error)`.
- Testes de auth chamam `auth.api.signInEmail({ body, returnHeaders: true })` e repassam o `Set-Cookie` como `cookie` para `getCurrentUser(headers)` (ver `src/lib/__tests__/auth.test.ts`).

## Multi-tenancy

[ADR-0005](../docs/decisions/0005-isolamento-por-tenant-prisma-extension.md).

- **Use sempre `db`** em código que atende um tenant. Operações em modelos com tenant (`Customer`, `Professional`, `Service`, `Product`, `ScheduleBlock`, `Appointment`, `Order`, `FinancialEntry` e os indiretos `WorkingHour`, `ProfessionalService`, `AppointmentService`, `OrderItem`) são filtradas pelo tenant do contexto. **Sem contexto, lançam `TenantContextMissingError`** (falha fechada).
- O contexto vem de `withRequestTenant(fn)` (resolve pelo usuário logado, ou por `{ slug }` em rotas públicas) ou de `runWithTenant(tenantId, fn)`. Rode as queries **dentro** do callback.
- `unscopedDb` só para: adapter do Better Auth, seed, setup de testes, features de super_admin. Importá-lo em código de requisição de tenant é erro de revisão.
- Registro de outro tenant buscado por ID → `null` ou erro "não encontrado" no `update`/`delete`. Responda **404**, como no legado.
- **Limitação**: a extension não valida chaves estrangeiras de modelos diretos (ex.: `customerId` de outro tenant ao criar um `Appointment`). Valide toda FK recebida do cliente com o helper da `TASK-0007`. SQL cru (`$queryRaw`) também não é filtrado.
- Testes: `src/lib/tenancy/__tests__/` (isolamento, falha fechada, escrita cross-tenant, modelos indiretos, concorrência, resolução).

## Autorização

[ADR-0006](../docs/decisions/0006-autorizacao-policies-funcoes-puras.md).

Sequência padrão de uma operação de servidor:

```ts
try {
  const user = requireUser(await getCurrentUser());        // 401
  authorize(user, "appointment", "update", appointment);   // 403 (as regras de dono recebem o registro)
  // ... queries com `db` dentro de withRequestTenant(...) (ADR-0005)
} catch (error) {
  return errorResponse(error);                              // 401/403/404 em pt-BR; P2025 → 404
}
```

- Matriz: `customer`/`service`/`product` → leitura para staff (admin + professional), escrita só para admin. `professional` → o admin lista e vê todos; o profissional só o próprio registro (`visibleProfessionals(user)` na listagem, [SPEC-0001](../docs/specs/SPEC-0001.md)); escrita só para admin. `workingHour` → leitura e escrita pelo admin ou pelo dono (SPEC-0001). `appointment`/`order` → ver e editar pelo admin ou pelo dono, criar por qualquer staff, mas só para si mesmo quando é profissional (`appointment.assignTo` e `order.createFor`, SPEC-0001); excluir agendamento só admin. `financialEntry` → só admin. `dashboard` → staff. `super_admin` e `customer` não têm permissão no painel.
- Menu e telas (SPEC-0001): `Financeiro`, `Serviços` e `Produtos` são só do admin (as páginas respondem 404 ao profissional). `/barbeiros` aparece para o profissional como "Meus horários", só com o registro dele. `visibleNavItems(isAdmin)` em `nav-items.ts` monta o menu.
- Listagens de agendamentos e comandas: some `visibleToActor(user)` ao `where` (o profissional vê só os próprios).
- Mudou uma permissão? Atualize `policies.ts` **e** a matriz em `src/lib/authz/__tests__/policies.test.ts`.

## Convenções de API

[ADR-0007](../docs/decisions/0007-convencoes-camada-servidor.md). Exemplo completo e testado: `src/server/http/__tests__/api-stack.test.ts`.

- **Todo Route Handler autenticado usa `apiRoute(...)`**, que cuida de sessão (401), tenant (403 sem tenant), contexto de tenant, serialização e erros.
- Ordem dentro do handler (a do legado): registro (404) → `authorize` (403) → `parseBody`/`parseQuery` (422). Valide antes só quando a policy precisar de um campo do corpo. Depois → `assertReferencesInTenant` para **toda FK recebida** (422) → `db` (dentro de `db.$transaction` se houver mais de uma escrita) → `created(...)` (201), valor (200) ou `noContent()` (204).
- Creates de modelos diretos: passe `tenantId: requireTenantId()` (tipado; a extension confere).
- Schemas Zod com rótulos pt-BR (`{ birthDate: "data de nascimento" }`). Campos opcionais: `.nullable().optional()`, porque `""` chega como `null`.
- Listagens: `paginate(pageFromRequest(request), { findMany, count })`, com o **mesmo** `where` nos dois (15 por página).
- JSON em **camelCase**; `Decimal` → `"45.00"`; datas em ISO.
- Teste o handler exportado direto, com os helpers `tests/api.ts`: `loginCookie(email)` (sessão real) e `call(handler, { method, cookie, body, params })` → `{ status, body }`.

## Endpoints disponíveis

| Endpoint | Métodos | Observações |
|---|---|---|
| `/api/auth/*` | Better Auth | `sign-in/email`, `sign-out`, `get-session` |
| `/api/user` | GET | usuário atual + `professional` |
| `/api/customers`, `/api/customers/[id]` | GET, POST / GET, PUT, PATCH, DELETE | `birthDate` como `"YYYY-MM-DD"`; `phone` gravado só com dígitos (DDD + 8 ou 9; aceita com máscara; SPEC-0005) |
| `/api/services`, `/api/services/[id]` | idem | `price` como `"0.00"` |
| `/api/products`, `/api/products/[id]` | idem | `stockQuantity: null` = sem controle de estoque |
| `/api/professionals`, `/api/professionals/[id]` | GET, POST / GET, PUT, PATCH, DELETE | POST cria usuário + login + profissional; PUT altera só o perfil (`defaultCommissionRate`, `photoUrl`, `active`); **DELETE desativa** (bloqueia login e derruba sessões) |
| `/api/professionals/[id]/working-hours` | GET, POST | horários do profissional (`weekday` 0 = domingo; `"HH:MM"`) |
| `/api/working-hours/[id]` | GET, PUT, PATCH, DELETE | o profissional altera só os próprios; o admin, todos |
| `/api/orders`, `/api/orders/[id]` | GET, POST / GET | comanda avulsa (`customerId` + `professionalId`) ou de agendamento (`appointmentId`, pré-populada com os serviços); uma por agendamento; o profissional abre só para si (sem `professionalId`, assume o dele; colega → 403) |
| `/api/orders/[id]/items`, `/api/orders/[id]/items/[itemId]` | POST / DELETE | `{ type: "service" \| "product", serviceId \| productId, quantity? }`; produto baixa estoque (nunca negativo) e remover devolve |
| `/api/orders/[id]/close` | POST | `{ paymentMethod: "cash" \| "pix" \| "debit_card" \| "credit_card" }` → `paid`, `paidAt`, lançamento `income`/`venda`, agendamento `completed` |
| `/api/financial-entries`, `/api/financial-entries/[id]` | GET, POST / GET, PUT, PATCH, DELETE | só admin; `type: "income" \| "expense"`, `entryDate` `"YYYY-MM-DD"`; lista por data (mais recentes primeiro) |
| `/api/financial-report` | GET | só admin; `?from=&to=` (`YYYY-MM-DD`, padrão: mês corrente no fuso da barbearia) → `{ period, totalIncome, totalExpenses, balance, commissionsByProfessional[{ professionalId, professionalName, commission }] }` (valores como `"0.00"`) |
| `/api/dashboard` | GET | admin e profissional (a barbearia inteira, como no legado) → `{ bestSellingProducts, bestSellingServices, professionalRanking, topCustomers, upcomingBirthdays }`; faturamento só de comandas pagas; `topCustomers` conta atendimentos: agendamentos concluídos + comandas pagas não contadas por um agendamento concluído (SPEC-0003) |
| `/api/appointments`, `/api/appointments/[id]` | GET, POST / GET, PUT, PATCH, DELETE | `?from=&to=` → lista completa por sobreposição (sem paginação); `?professionalId=`; `startsAt` sem offset = fuso da barbearia; o fim vem das durações; só o admin exclui |

Leitura: admin e profissional, menos `/api/professionals` e os horários, em que o profissional só vê o que é dele (SPEC-0001). Escrita: só admin (exceto horários, que o próprio profissional também edita). Listas paginadas (`?page=`, 15 por página, mais recentes primeiro), menos a de horários, que vem completa e ordenada por dia.

## Profissionais e acesso

[ADR-0008](../docs/decisions/0008-desativar-profissional-e-usuario-com-tenant.md).

- **Profissional não é excluído, é desativado** (`DELETE` ou `PUT active: false`): o histórico fica, o login é bloqueado (`ACCOUNT_DISABLED`) e as sessões caem na hora. `PUT active: true` reativa.
- **Todo usuário tem tenant, exceto `super_admin`**: há uma constraint no banco (`users_tenant_required_check`). Ao criar usuário, sempre passe `tenantId` (ou `role: "super_admin"`).
- Criar um profissional cria `User` + `Account` (`credential`) + `Professional` numa transação (`src/server/professionals/professionals.ts`).

## Agenda e fuso horário

[ADR-0009](../docs/decisions/0009-agendamento-fuso-por-tenant-e-regras.md).

- Cada barbearia tem `tenants.timezone` (padrão `America/Sao_Paulo`), disponível em `getCurrentUser().tenant.timezone`. Instantes são gravados em UTC.
- Entrada sem offset (`"2030-01-10T10:00"`, do `datetime-local`) = relógio local da barbearia → `parseDateTimeInput(value, timeZone)`. Na exibição, formate com `timeZone` da barbearia, nunca com o fuso do navegador.
- Expediente e dia da semana são sempre calculados no fuso da barbearia (`isWithinWorkingHours`).
- Criar ou editar agendamento: transação + `lockProfessionalSchedule` + `hasConflict` (evita agendamento duplo concorrente). Profissional inativo não recebe agendamento novo.
- Sem agendamento retroativo ([SPEC-0003](../docs/specs/SPEC-0003.md)): criar, ou mudar o início de um agendamento, para antes de agora → 422 em `startsAt` (`startsInThePast` em `rules.ts`), para todos os papéis. Mudar só o status de um agendamento passado continua permitido. Na tela, os horários passados do calendário ficam desabilitados (`isPastSlot` em `src/lib/calendar.ts`) e o campo de data/hora tem `min`. Testes que agendam pela API usam datas futuras (2030).

## UI

[ADR-0010](../docs/decisions/0010-kit-de-ui-shadcn-radix.md).

- Página nova do painel: `src/app/(app)/<rota>/page.tsx` (herda a guarda e o layout). Adicione o item em `src/components/shell/nav-items.ts` se for para o menu.
- Componente shadcn novo: `npx shadcn@4.21.1 add <nome>` em `web/` e revise o gerado.
- Padrões: formulários em `AppModal`; exclusão com `await useConfirm()({ title, confirmLabel: "Excluir" })`; feedback com `toastSuccess`/`toastError(apiErrorMessage(body, "Não foi possível ..."))`; dinheiro com `DecimalInput` + `formatCurrency`; datas de calendário com `formatDate` (sem fuso).
- Esconda na UI o que o usuário não pode fazer com `can(user, ...)`. A API continua sendo a checagem de verdade.
- Login no navegador para testar: os logins de dev do seed (seção "Dados de desenvolvimento").

## Telas (padrão das telas de cadastro)

Use `src/app/(app)/clientes/` como modelo para telas de lista + formulário:

- `page.tsx` (Server Component) lê `getCurrentUser()` e passa permissões booleanas (`canManage = can(user, ...)`) para o componente cliente. As ações que o usuário não pode executar nem aparecem.
- O componente cliente usa `usePaginated("/api/...")`, `AppModal` para criar/editar, `useConfirm()` para excluir, e `api()` para salvar. Em erro, mostra `response.message` (topo do formulário ou toast) e `response.errors[campo]` embaixo de cada campo. Envie os campos vazios como `""`: a API trata como `null`.
- Barbeiros: "excluir" é **Desativar/Reativar** (ADR-0008). Os horários abrem num diálogo, que é editável pelo admin ou pelo próprio barbeiro e somente leitura para os demais. Uma submissão pode criar até dois períodos (manhã e tarde), como no legado.

### Testar a UI com automação de navegador (Claude in Chrome)

- A aba de automação fica com `document.visibilityState = "hidden"`. Nesse estado o Chrome não roda animações, então os diálogos do Radix ficam "fechados, mas montados" (o evento de fim da animação de saída nunca dispara) e bloqueiam os cliques seguintes. **Antes de interagir, injete** `*,*::before,*::after{animation:none!important;transition:none!important}` num `<style>`. Numa aba visível de verdade isso não acontece.
- Os cliques por coordenada ou por referência (`left_click`) às vezes não acertam botões do rodapé de diálogos (a tela usa devicePixelRatio 1,375). Use `form_input` para preencher e `element.click()` via JavaScript para clicar quando o clique não surtir efeito. Confira pelo log do servidor se a requisição saiu.
- O Chrome do usuário tem credenciais salvas e o autofill sobrescreve os campos do login. **Não use credenciais salvas**: entre com um login de dev do seed via `fetch("/api/auth/sign-in/email", ...)` na própria página.
- Depois de testar, apague os dados criados no `agenda_web` (ou rode o seed de novo em um banco limpo).

## Comandas

[ADR-0011](../docs/decisions/0011-comandas-estoque-e-duplicidade.md).

- Toda alteração numa comanda (adicionar item, remover item, fechar) roda em transação com `lockOrder` (advisory lock por comanda) e reconfere `status = open` dentro dela.
- Estoque: baixa atômica condicional (`updateMany ... stockQuantity >= qty`). Produto com `stockQuantity: null` não tem controle de estoque.
- O fechamento grava `paidAt` e cria o lançamento com `entryDate` = hoje no fuso da barbearia. Use `paidAt` (e não `updatedAt`) nos relatórios.

## Financeiro

- Lançamentos usam o `crudRoutes` genérico (`src/server/financial/financial-entries.ts`, com `orderBy` por `entryDate`).
- Relatório (`src/server/financial/financial-report.ts`, `buildFinancialReport`): totais por `entryDate` no período; comissão = itens de **serviço** das comandas pagas com `paidAt` no período (dias no fuso da barbearia) × percentual (o de `professional_services.commission_rate`, ou o `defaultCommissionRate` do profissional). Aritmética `Decimal` do começo ao fim.

## Telas de negócio

- **Agenda** (`(app)/agenda/`): os horários vêm da API em UTC e são posicionados e exibidos com `zonedParts(..., timeZone da barbearia)`. Clicar num horário livre abre o formulário com `startsAt` local (`datetime-local`). "Criar comanda" faz `POST /api/orders { appointmentId }` e redireciona para `/comandas/[id]`.
- **Comandas** (`(app)/comandas/`): rótulos pt-BR de status e formas de pagamento em `order-labels.ts`. Os erros 422 do servidor (estoque, duplicidade, comanda fechada) aparecem no formulário.
- **Dashboard** (`(app)/page.tsx`): dados no servidor, sem fetch do cliente; gráficos com `BarList`. **O profissional vê a barbearia inteira, como no legado** (decisão pendente do responsável; ver a nota da `TASK-0017`).
- **Financeiro** (`(app)/financeiro/`): filtro de período (padrão: mês corrente no fuso), cartões de receitas, despesas e saldo (saldo negativo em vermelho), comissões e lançamentos.
- Selects que precisam da lista inteira (clientes, serviços, profissionais) usam `apiAll(path)` de `src/lib/api-client.ts`.
