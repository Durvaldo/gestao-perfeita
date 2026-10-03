Ver também o [AGENTS.md raiz](../AGENTS.md).

# backend — API Laravel (legado em migração)

> ⚠️ Este módulo será substituído pela app Next.js em `web/` ([ADR-0001](../docs/decisions/0001-migracao-full-stack-nextjs.md)). Ele continua sendo a **referência de comportamento** para a migração: as regras de negócio e os testes daqui são a especificação que as tasks `docs/tasks/0002`–`0017` portam. Evite investir em features novas aqui, porque elas teriam de ser portadas de novo.

## Propósito

API REST do SaaS de agenda para barbearias: autenticação de SPA via Sanctum (cookie de sessão + CSRF), multi-tenancy por `tenant_id` e os módulos de cadastro, agendamento, comanda, financeiro e dashboard. Não renderiza telas: `routes/web.php` só devolve a versão do Laravel em `/` e inclui as rotas de auth.

## Tech stack

Fonte: `composer.json`.

- PHP `^8.3`, `laravel/framework ^13.8`, `laravel/sanctum ^4.0`, `laravel/tinker`.
- Dev: `laravel/breeze ^2.4` (stack API, que gerou `app/Http/Controllers/Auth/*` e `routes/auth.php`), `phpunit/phpunit ^12.5`, `laravel/pint` (formatter), `mockery`, `fakerphp/faker`, `laravel/pail`.
- O `name` do `composer.json` ainda é o do skeleton (`laravel/laravel`).

## Estrutura

- `app/Http/Controllers/`: um controller REST por recurso (`Cliente`, `Servico`, `Produto`, `Barbeiro`, `HorarioTrabalho`, `Agendamento`, `Comanda`, `FinanceiroLancamento`), mais `FinanceiroRelatorioController` e `DashboardController` (invokable), e `Auth/*` (Breeze).
- `app/Http/Requests/`: Form Requests que combinam validação e autorização (`authorize()`).
- `app/Http/Middleware/ResolveTenant.php`: resolve o tenant pelo parâmetro de rota `{tenant}` (slug) ou pelo usuário autenticado. `EnsureEmailIsVerified.php`: alias `verified`, devolve 409 em JSON.
- `app/Tenancy/`: `CurrentTenant` (singleton do tenant da requisição), `BelongsToTenant` (trait: global scope + preenche `tenant_id` no `creating`), `TenantScope` (**falha fechada**: lança `TenantContextMissingException` se nenhum tenant foi resolvido).
- `app/Models/`: Eloquent. Todos os modelos com `tenant_id` usam `BelongsToTenant`; `HorarioTrabalho` é escopado indiretamente via `barbeiro`. Regras de agenda ficam em `Agendamento::dentroDoExpediente()` e `Agendamento::conflita()`.
- `app/Policies/`: autorização por `users.tipo` (`super_admin`, `admin`, `prestador_de_servico`, `cliente`).
- `bootstrap/app.php`: registra os middlewares da API (Sanctum stateful + `ResolveTenant`), força `ResolveTenant` **antes** do `SubstituteBindings` (correção de bug real; sem isso, o route model binding roda sem tenant) e reescreve as mensagens 401/403/404 em pt-BR para `api/*`.
- `database/migrations/`, `factories/`, `seeders/`: schema e dados de dev (`DatabaseSeeder` → `PlanoSeeder`, `TenantSeeder`, `CadastroSeeder`).
- `lang/pt_BR/`: mensagens de validação/auth em português (`APP_LOCALE=pt_BR` no `.env` local).

## Configuração

- `.env` (gitignored) é o que vale localmente: `DB_CONNECTION=pgsql`, `DB_HOST=127.0.0.1`, `DB_PORT=5433`, `DB_DATABASE=agenda_barbearia`, `APP_URL=http://localhost:8000`, `FRONTEND_URL=http://localhost:3000`, `APP_LOCALE=pt_BR`.
- O Postgres **não** é provisionado por este repositório (não há `docker-compose`). Segundo o [roadmap](../docs/ROADMAP_IMPLEMENTACAO.md), é o container Docker `esus-db` (porta 5433), compartilhado com outro projeto.
- `config/cors.php`: `allowed_origins = [FRONTEND_URL]` (padrão `http://localhost:3000`), `supports_credentials = true`.
- `config/sanctum.php`: os domínios stateful padrão incluem `localhost:3000` e `127.0.0.1:3000`, mais o host de `FRONTEND_URL`.
- ⚠️ `.env.example` está **divergente** do `.env` real: usa `DB_CONNECTION=sqlite` e `APP_LOCALE=en`, e não tem `FRONTEND_URL`. Quem copiar o exemplo terá locale e banco diferentes do ambiente usado no desenvolvimento.

## APIs

Fonte: `routes/api.php` e `routes/auth.php`.

- Auth (sem prefixo `/api`): `POST /register`, `/login`, `/forgot-password`, `/reset-password`, `/logout`, `/email/verification-notification`, e `GET /verify-email/{id}/{hash}`. O frontend usa `/sanctum/csrf-cookie`, `/login`, `/logout`.
- `/api/*` (todas atrás de `auth:sanctum`): `GET user` (com o `barbeiro` vinculado); `apiResource` de `clientes`, `servicos`, `produtos`, `barbeiros`, `agendamentos` e `financeiro-lancamentos`; `barbeiros.horarios-trabalho` (shallow); `comandas` (index/store/show) mais `POST comandas/{comanda}/itens`, `DELETE comandas/{comanda}/itens/{item}` e `POST comandas/{comanda}/fechar`; `GET financeiro/relatorio`; `GET dashboard`.
- Health check: `GET /up`.
- ⚠️ `POST /register` cria um `User` **sem `tenant_id`** e com `tipo` no default da coluna (`admin`, conforme a migration `add_tenant_id_and_tipo_to_users_table`). Esse usuário quebra (500, `TenantContextMissingException`) em qualquer rota com modelo de tenant. Não há tela de registro no frontend. Não está claro se isso é resto do Breeze ou intencional; ver `TASK-0004`.

- ⚠️ **Provável brecha de isolamento em horários de trabalho** (constatada lendo o código, não executada): `HorarioTrabalho` não usa `BelongsToTenant` (a tabela não tem `tenant_id`), então as rotas shallow `GET`/`PUT`/`DELETE /api/horarios-trabalho/{id}` resolvem o registro **sem filtro de tenant**. Como a `HorarioTrabalhoPolicy` devolve `true` para qualquer `admin` em `view`/`update`/`delete`, o admin de um tenant consegue ler, editar ou excluir horários de outro tenant pelo ID. `tests/Feature/Cadastro/HorarioTrabalhoApiTest.php` só testa a criação aninhada. Na app nova isso está corrigido ([ADR-0005](../docs/decisions/0005-isolamento-por-tenant-prisma-extension.md)); no legado não será corrigido: o responsável confirmou (2026-10-03) que o sistema PHP nunca foi usado em produção e será apagado após o corte (`TASK-0019`).

## Testes

> Regra 3 do [AGENTS.md raiz](../AGENTS.md).

- PHPUnit 12 (`phpunit.xml`): suítes `Unit` e `Feature`. Os testes rodam em **SQLite `:memory:`** (precisa da extensão `pdo_sqlite`), não no Postgres.
- `tests/Feature/{Auth,Cadastro,Negocio,Tenancy}/*`: cobrem auth, CRUDs, agenda, comanda, financeiro, dashboard e isolamento por tenant. `tests/Unit/` só tem o exemplo do skeleton.
- Rodar: `composer test` (faz `config:clear` + `php artisan test`) ou `php artisan test`.
- Não verificado nesta sessão: a suíte não foi executada porque o PHP do PATH estava na 7.4 (ver abaixo).

## Build / execução

- ⚠️ **PHP do PATH**: sessões novas de terminal podem herdar o PHP 7.4 do Laragon em vez do 8.3, e o autoload falha com o erro de platform check. Confira com `php -v` e, se vier 7.4, ajuste o PATH só da sessão (comando no Passo 0 de [`ROADMAP_IMPLEMENTACAO.md`](../docs/ROADMAP_IMPLEMENTACAO.md)).
- Subir a API: `php artisan serve` (porta 8000, que é a `baseURL` fixa do frontend), depois `php artisan migrate` e `php artisan db:seed`.
- ⚠️ Os scripts `composer setup` e `composer dev` (herdados do skeleton) chamam `npm install`/`npm run build`/`npm run dev` **dentro de `backend/`**, mas não existe `package.json` aqui (o frontend é separado). Esses passos falham; use os comandos `artisan` diretamente.
- Formatação: `vendor/bin/pint`.

## Convenções

- Domínio e banco estão em português (`Agendamento`, `data_hora_inicio`, `conflita()`). Comentários novos em `bootstrap/app.php` e nos models já estão em inglês.
- Mensagens ao usuário (validação, exceções de API) em pt-BR.
- Código existente pode estar em português, mas código novo ou editado segue a regra 1 (inglês). A exceção é o texto de UI e as mensagens ao usuário final, que ficam em português.
