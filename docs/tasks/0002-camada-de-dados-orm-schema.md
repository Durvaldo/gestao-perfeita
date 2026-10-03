---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0002 — Camada de dados: ORM e schema equivalente ao do Laravel

**Task ID**: `TASK-0002`

## Objetivo

Escolher o ORM/camada de acesso a dados do `web/` e modelar um schema PostgreSQL equivalente às migrations do Laravel. Esta task decide, com ADR:

1. **ORM** (ex.: Prisma × Drizzle). Critérios: transações; `decimal` sem perda de precisão (valores monetários são `decimal(10,2)` e percentuais `decimal(5,2)`); enums do Postgres; como o isolamento por tenant vai se encaixar (`TASK-0005`).
2. **Reaproveitar o banco/schema atual** (`agenda_barbearia`) **ou criar um schema novo**. Ainda não há produção (a Fase 4 não começou), mas confirme com o usuário se existe algum dado a preservar antes de descartar.
3. **Nomenclatura**: tabelas e colunas hoje estão em português (`clientes`, `data_hora_inicio`). A regra 1 pede código em inglês, mas permite manter termos de domínio. Decida e registre. Se a decisão envolver o renomeamento `Barbeiro` → `Profissional` (`PLANO_MELHORIAS_BENCHMARK.md` §2.1), **pare e pergunte ao usuário**: é decisão de produto (human gate).

## Dependências

- `TASK-0001`

## Critérios de conclusão

- [x] ADR registrando o ORM, a estratégia de schema e a nomenclatura.
- [x] Schema cobrindo todas as tabelas de domínio de `backend/database/migrations/` (`planos`, `tenants`, `users` com `tenant_id`/`tipo`/`telefone`, `clientes`, `barbeiros`, `servicos`, `produtos`, `barbeiro_servico`, `horarios_trabalho`, `bloqueios_agenda`, `agendamentos`, `agendamento_servico`, `comandas`, `comanda_itens`, `financeiro_lancamentos`), com os mesmos enums, defaults, nullability e FKs. As tabelas de infraestrutura do Laravel (`cache`, `jobs`, `sessions`, `personal_access_tokens`, `password_reset_tokens`) só entram se a auth escolhida precisar delas (`TASK-0004`).
- [x] Migrations do ORM aplicando do zero num Postgres local, e banco de teste isolado para a suíte.
- [x] Teste mostrando que valores `decimal` fazem ida e volta ao banco sem perda (ex.: `10.10`).

## Referências

- `backend/database/migrations/*`
- [`docs/MODELAGEM_BANCO.md`](../MODELAGEM_BANCO.md)
- [ADR-0001](../decisions/0001-migracao-full-stack-nextjs.md)

## Notas de progresso
- 2026-10-03 — Decisões do responsável (via perguntas, já que eram human gates): banco novo separado, nomes em inglês, `Barbeiro` → `Professional` já na migração, Prisma. Registradas em [ADR-0003](../decisions/0003-camada-de-dados-prisma-schema-em-ingles.md). Bancos `agenda_web` e `agenda_web_test` criados no container `esus-db` (porta 5433); o `agenda_barbearia` não foi tocado. Prisma fixado na 7.10.0, porque o `latest` do npm era uma RC 8.0. Schema com as 15 tabelas de domínio, 7 enums nativos, IDs `Int`, a coluna nova `orders.paid_at` e `professionals.user_id` único. Migration `20261003155523_init` aplicada do zero nos dois bancos. Client em `src/lib/db.ts`. Infra de teste: `globalSetup` com `prisma migrate deploy` + `truncateAll()` por arquivo, com trava contra `TEST_DATABASE_URL == DATABASE_URL`. O setup inicial usava `prisma migrate reset`, que o Prisma 7 bloqueia quando executado por agente de IA, e foi trocado. `vite-tsconfig-paths` substituído por `resolve.tsconfigPaths` (nativo do Vite). Verificado: `npm test` (5 testes: decimal `10.10` ida e volta, defaults do legado, `time`, cascade order → items), `npm run lint`, `npx tsc --noEmit` e `npm run build`. Docs: `web/AGENTS.md` (com a tabela de mapeamento legado → novo), `AGENTS.md` raiz, `web/README.md`; referências à ADR-0003 adicionadas às TASK-0009/0014/0016. Sem commit (nenhum solicitado).
