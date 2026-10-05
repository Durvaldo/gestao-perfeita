---
status: em-andamento
modulo: web
owner: Durvaldo
criado-em: 2026-10-05
---

# 0043 — Migrations automáticas no deploy da Vercel

**Task ID**: `TASK-0043`

## Objetivo

Hoje, a cada migration nova, alguém precisa rodar `prisma migrate deploy` na mão contra o banco da homologação na Vercel (Prisma Postgres). Se isso for esquecido, o código novo vai ao ar com um banco desatualizado. O objetivo é que o deploy de produção da Vercel aplique as migrations pendentes sozinho, antes do build, e falhe se a migration falhar.

## Dependências

- Nenhuma.

## Critérios de conclusão

- [ ] Deploy de **produção** na Vercel roda `prisma migrate deploy` antes do `next build`; migration com erro faz o deploy falhar (o site continua na versão anterior).
- [x] Deploy de **preview** não aplica migrations (o Preview usa o mesmo banco da homologação).
- [x] Build local (`npm run build`) e testes não mudam.
- [x] Teste da regra de quando migrar; `npm test`, `npm run lint` e `npx tsc --noEmit` passando.
- [x] Decisão registrada em ADR e deploy documentado no `web/AGENTS.md`/`README.md`.

## Referências

- `docs/decisions/0016-migrations-no-build-de-producao-da-vercel.md`

## Notas de progresso
- 2026-10-05 — Antes da task, as 4 migrations pendentes (`phone_digits_only`, `tenant_settings`, `stored_files`, `professional_calendar_token`) foram aplicadas na mão no banco da homologação; o banco ficou em dia com o schema. Implementado: script `vercel-build` (`tsx scripts/vercel-build.ts`), que roda `prisma migrate deploy` e depois `next build` só com `VERCEL_ENV=production` (`shouldMigrateOnBuild` em `scripts/migrate-policy.ts`). O preview não migra porque usa o mesmo banco ([ADR-0016](../decisions/0016-migrations-no-build-de-producao-da-vercel.md)). Deploy documentado no `web/AGENTS.md` (seção "Deploy") e no `README.md`. Verificado: `npx tsc --noEmit`, `npm run lint`, `npm test` (295, com 3 novos) e uma execução local do script (pula as migrations sem `VERCEL_ENV` e segue para o `next build`). **Falta verificar** o primeiro critério num deploy real de produção (log do build com `prisma migrate deploy`), o que depende do push para o `main`; a task fica `em-andamento` até lá.
