---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0003 — Seed de desenvolvimento equivalente

**Task ID**: `TASK-0003`

## Objetivo

Portar os seeders do Laravel para o `web/`, para que o ambiente de dev tenha os mesmos dados de teste: 1 super_admin (sem tenant), 2 planos, 2 tenants com 1 admin cada e, por tenant, 2 barbeiros (com `User` vinculado), 4 serviços, 3 produtos, 6 clientes e expediente de segunda a sexta.

## Dependências

- `TASK-0002`

## Critérios de conclusão

- [x] Comando de seed (ex.: `npm run db:seed`) idempotente, como o `firstOrCreate` dos seeders atuais.
- [x] Mesmos e-mails de login dos seeders atuais (`superadmin@agenda.com`, `admin@barbearia-centro.com`, `admin@barbearia-zona-sul.com`), para facilitar a comparação lado a lado com o sistema antigo.
- [x] Senhas de dev documentadas só no `web/AGENTS.md`, nunca num `.env.example` de produção.

## Referências

- `backend/database/seeders/{DatabaseSeeder,PlanoSeeder,TenantSeeder,CadastroSeeder}.php`
- `backend/database/factories/*`

## Notas de progresso
- 2026-10-03 — Seed portado em `web/prisma/seed-data.ts` (lógica `seed(db)`) + `web/prisma/seed.ts` (entry point), configurado como `migrations.seed` no `prisma7.config.ts` e exposto como `npm run db:seed` (via `tsx`). Divergência proposital do legado: o `CadastroSeeder` usava factories com dados aleatórios e **não** era idempotente (cada execução criava mais barbeiros, serviços e clientes, e os barbeiros tinham e-mails aleatórios com senha `password`). O seed novo usa dados fixos, procura cada registro antes de criar (`upsert` por chave única ou `findFirst`) e dá aos 4 profissionais logins conhecidos (`senha123`). As contagens batem com o legado: 1 super_admin, 2 planos, 2 tenants com 1 admin cada e, por tenant, 2 profissionais, 4 serviços, 3 produtos, 6 clientes e expediente de segunda a sexta, 09:00–18:00. Hash de senha em `src/lib/password.ts` (bcrypt custo 12, igual a `BCRYPT_ROUNDS=12` do Laravel, via `bcryptjs`, JS puro, sem build nativo no Windows); nota adicionada à `TASK-0004`. Verificado: `npm run db:seed` executado 2× no `agenda_web` (7 users, 4 profissionais, 8 serviços, 12 clientes, 20 horários, sem duplicar); `npm test` (9 testes, incluindo 4 novos em `prisma/__tests__/seed.test.ts`: contagens, idempotência, logins/papéis/hash e expediente), `npm run lint`, `npx tsc --noEmit` e `npm run build`. Sem commit (nenhum solicitado).
