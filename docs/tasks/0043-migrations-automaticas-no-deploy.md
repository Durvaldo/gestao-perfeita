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
- [ ] Deploy de **preview** não aplica migrations (o Preview usa o mesmo banco da homologação).
- [ ] Build local (`npm run build`) e testes não mudam.
- [ ] Teste da regra de quando migrar; `npm test`, `npm run lint` e `npx tsc --noEmit` passando.
- [ ] Decisão registrada em ADR e deploy documentado no `web/AGENTS.md`/`README.md`.

## Referências

- `docs/decisions/0016-migrations-no-build-de-producao-da-vercel.md`

## Notas de progresso
