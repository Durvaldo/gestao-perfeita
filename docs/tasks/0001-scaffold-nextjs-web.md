---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0001 — Scaffold da aplicação Next.js em `web/`

**Task ID**: `TASK-0001`

## Objetivo

Criar a base da app Next.js que vai substituir `backend/` e `frontend/` ([ADR-0001](../decisions/0001-migracao-full-stack-nextjs.md)): TypeScript, App Router e Tailwind CSS v4 (mesma versão major do `frontend/` atual), com lint e test runner funcionando. Use a versão estável atual do Next.js **no momento da execução**, conferindo a documentação oficial em vez de assumir de memória.

## Dependências

- Nenhuma.

## Critérios de conclusão

- [x] `web/` criado com `package.json` próprio e scripts `dev`, `build`, `start`, `lint`, `test`.
- [x] Test runner configurado, com 1 teste trivial passando (regra 3). Registrar a escolha (ex.: Vitest × Jest) em ADR se houver mais de uma opção razoável.
- [x] `web/.env.example` com as variáveis previstas (ex.: `DATABASE_URL`), sem segredos; `.env*` locais no `.gitignore` do `web/`.
- [x] Porta de dev que não colida com o sistema atual (o `frontend` usa 3000 e o `php artisan serve` usa 8000).
- [x] `web/AGENTS.md` criado no padrão dos outros módulos, e a linha `web/` atualizada na tabela do `AGENTS.md` raiz (de "planejado" para módulo real).
- [x] `npm run build` e `npm test` passam em `web/`.

## Referências

- [ADR-0001](../decisions/0001-migracao-full-stack-nextjs.md)
- `frontend/package.json`, `frontend/vite.config.js` (stack de UI atual)

## Notas de progresso
- 2026-10-03 — Scaffold criado com `create-next-app@16.3.8` (TypeScript, App Router, `src/`, Tailwind v4, ESLint, alias `@/*`, sem git próprio). Vitest + Testing Library configurados conforme o guia oficial ([ADR-0002](../decisions/0002-vitest-como-test-runner-do-web.md)); `@types/node` elevado para `^24` (o `^20` do scaffold conflitava com o peer do Vitest 5). Porta 3001 em `dev`/`start`. Página placeholder em pt-BR com 1 teste. `.env.example` (`DATABASE_URL`) com exceção no `.gitignore`. `web/AGENTS.md` (mantendo o bloco gerado pelo Next) e `web/README.md` escritos; tabela e Build do `AGENTS.md` raiz atualizados. Verificado: `npm test` (1 passou), `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm start` respondendo em `http://localhost:3001`. Pendência conhecida: `npm audit` com *high* em `braces`, vindo do `eslint-config-next` (só em dev); o fix sugerido rebaixaria para a 14 e não foi aplicado (registrado no `web/AGENTS.md`). Sem commit: o repositório ainda não tem commit inicial e nenhum foi solicitado.
