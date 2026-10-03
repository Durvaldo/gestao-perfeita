---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0018 — Telas de financeiro e dashboard (gráficos)

**Task ID**: `TASK-0018`

## Objetivo

Portar `FinanceiroView.vue` (lançamentos e relatório por período) e `DashboardView.vue` (widgets com gráficos de barra). Os gráficos usam hoje ECharts via `vue-echarts`, configurado em `src/echarts.js`. Escolha o equivalente em React (ex.: `echarts` direto ou um wrapper React) e registre se houver troca de biblioteca.

## Dependências

- `TASK-0010`
- `TASK-0016`
- `TASK-0017`

## Critérios de conclusão

- [x] Paridade visual e funcional com as telas atuais, verificada no navegador com o seed.
- [x] Financeiro inacessível para `prestador_de_servico`, tanto no menu quanto na rota.

## Referências

- API do dashboard pronta (`TASK-0017`): `/api/dashboard` → `bestSellingProducts`/`bestSellingServices` (`{ id, name, totalQuantity }`), `professionalRanking` (`{ professionalId, name, totalRevenue: "0.00" }`), `topCustomers` (`{ customerId, name, totalVisits }`), `upcomingBirthdays` (`{ customerId, name, birthDate, daysUntilBirthday }`).
- API do financeiro pronta (`TASK-0016`): `/api/financial-entries` (CRUD, só admin) e `/api/financial-report?from=&to=` (valores como `"0.00"`; formate com `formatCurrency`). Tabela de endpoints em `web/AGENTS.md`.
- `frontend/src/views/{DashboardView,negocio/FinanceiroView}.vue`, `frontend/src/echarts.js`

## Notas de progresso
- 2026-10-03 — Dashboard (`web/src/app/(app)/page.tsx`): Server Component que chama `buildDashboard()` (extraído de `web/src/server/dashboard/dashboard.ts`, reaproveitado pela rota) dentro de `runWithTenant`. Cartões de serviços e produtos mais vendidos, ranking de barbeiros (R$) e clientes frequentes com `BarList` (barras horizontais de série única em HTML, `web/src/components/charts/bar-list.tsx`), mais a tabela de próximos aniversários. Gráficos seguindo a skill de dataviz: forma = barra horizontal de magnitude; uma cor (primária azul, validada com `validate_palette.js` nas superfícies clara #fcfcfb e escura #1a1a19, todas as checagens PASS); barras finas com ponta de 4px; espaço de 2px entre barras; sem legenda (série única, o título nomeia); valores como texto; tooltip no hover. Troca do ECharts registrada como atualização da ADR-0010. Financeiro (`web/src/app/(app)/financeiro/financial-screen.tsx`, só admin, 404 para profissional): filtro De/Até (padrão: mês corrente no fuso da barbearia), cartões Receitas/Despesas/Saldo (negativo em vermelho), comissões por barbeiro, lançamentos paginados com criação em modal (tipo, data, categoria, valor em formato brasileiro, descrição) e exclusão com confirmação. Removido o placeholder `ComingSoon`, que ficou sem uso. Verificado no Chrome com 5 vendas reais criadas pela API: dashboard com Corte = 3, Carlos R$ 259,80, Rafael R$ 109,90, renderização conferida na captura (sem colisão ou transbordamento); financeiro com Receitas R$ 369,70 e comissões Carlos R$ 72,00 (40% de R$ 180) e Rafael R$ 28,00 (35% de R$ 80), conferidas à mão; despesa de R$ 500 → saldo −R$ 130,30 em vermelho; período de setembro → zerado. Dados de teste removidos e estoque restaurado. `tsc`, `lint`, `build`, `npm test` (196). Sem commit (o responsável vai commitar ao final).
