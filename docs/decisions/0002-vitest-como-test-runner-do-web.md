# 0002 — Vitest como test runner do `web/`

- **Data**: 2026-10-03
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0002`
- **Task relacionada**: `TASK-0001`

## Contexto

A regra 3 exige uma suíte de testes leve em cada módulo. A app Next.js 16 criada em `web/` precisa de um test runner para testes unitários e de integração: regras de negócio portadas do Laravel e componentes. O guia oficial empacotado (`node_modules/next/dist/docs/01-app/02-guides/testing/`) cobre Vitest, Jest, Playwright e Cypress. Playwright e Cypress são de E2E e não substituem um runner unitário.

## Decisão

Usar **Vitest** (com `@vitejs/plugin-react`, `jsdom`, `@testing-library/react` e `vite-tsconfig-paths`), configurado conforme o guia oficial do Next.js em `web/vitest.config.mts`. `npm test` roda `vitest run` (execução única, adequada a CI e a agentes) e `npm run test:watch` roda em modo watch.

## Alternativas consideradas

- **Jest** (`next/jest`): também é suportado oficialmente, mas exige transformações (SWC/Babel) e configuração de ESM mais pesadas. O Vitest roda TypeScript/ESM nativamente, é mais rápido e mantém continuidade com o ecossistema Vite que o time já usava no `frontend/`.

## Consequências

- O Vitest não suporta Server Components `async`. Essas telas serão cobertas por E2E (ferramenta a decidir em `TASK-0019`). Para que os testes unitários cubram a lógica, ela deve ficar fora dos componentes, em módulos de servidor testáveis.
- Atualização (2026-10-03, `TASK-0002`): o plugin `vite-tsconfig-paths` foi removido. O próprio Vite passou a recomendar a opção nativa `resolve.tsconfigPaths: true`, que agora está em `vitest.config.mts`.
- O Vitest 5 exige `@types/node` `^22` ou `>=24`, por isso o `@types/node` do scaffold foi elevado de `^20` para `^24` (o Node local é o 24).
