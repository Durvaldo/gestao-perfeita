---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0016 — Financeiro no servidor: lançamentos e relatório

**Task ID**: `TASK-0016`

## Objetivo

Portar o CRUD de `financeiro_lancamentos` (só `admin`) e o relatório por período:

- Período: `inicio`/`fim` (padrão: mês corrente), do início ao fim do dia.
- `total_receitas`, `total_despesas` e `saldo`, arredondados em 2 casas.
- `comissoes_por_barbeiro`: considera as comandas `paga` com `updated_at` no período e soma os itens de **serviço** × percentual. O percentual é o `barbeiro_servico.comissao_percentual` daquele par barbeiro × serviço ou, se nulo ou inexistente, o `barbeiros.comissao_percentual_padrao`.
- Simplificação herdada: a "data de pagamento" usada é o `updated_at` da comanda (ver "Nota de simplificação" em [`ROADMAP_IMPLEMENTACAO.md`](../ROADMAP_IMPLEMENTACAO.md)). Avalie criar uma coluna própria de data de pagamento no schema novo (`TASK-0002`) e registre a decisão.
- Use aritmética decimal, não `float`, nos somatórios monetários.

## Dependências

- `TASK-0014`

## Critérios de conclusão

- [x] CRUD e relatório com a mesma forma de resposta (`periodo`, `total_receitas`, `total_despesas`, `saldo`, `comissoes_por_barbeiro[{barbeiro_id, barbeiro_nome, comissao}]`).
- [x] Testes portando `backend/tests/Feature/Negocio/FinanceiroApiTest.php`.

## Referências

- `TASK-0014` concluída: o fechamento grava `orders.paid_at` e cria o lançamento `income` com categoria `venda` e `entryDate` no fuso da barbearia ([ADR-0011](../decisions/0011-comandas-estoque-e-duplicidade.md)).
- [ADR-0009](../decisions/0009-agendamento-fuso-por-tenant-e-regras.md): monte os limites de período (início/fim do dia ou do mês; "hoje" para aniversários) no fuso da barbearia (`tenants.timezone`, helpers em `web/src/lib/timezone.ts`), e não em UTC.
- [ADR-0003](../decisions/0003-camada-de-dados-prisma-schema-em-ingles.md): a coluna `orders.paid_at` já existe no schema novo; use-a no lugar do `updated_at` para filtrar o período de comissão.
- `backend/app/Http/Controllers/{FinanceiroLancamento,FinanceiroRelatorio}Controller.php`, `backend/app/Http/Requests/FinanceiroLancamentoRequest.php`

## Notas de progresso
- 2026-10-03 — Implementados `/api/financial-entries` (CRUD só admin via `crudRoutes`, estendido com `resource: "financialEntry"` e `orderBy`; listagem por data desc, como o legado) e `/api/financial-report` (`web/src/server/financial/`). A forma da resposta segue a convenção camelCase da ADR-0007 (`period`, `totalIncome`, `totalExpenses`, `balance`, `commissionsByProfessional[{ professionalId, professionalName, commission }]`), com valores como string `"0.00"`. Comissões calculadas sobre as comandas pagas com `paidAt` no período (substitui a simplificação do `updated_at`, ADR-0003), com os limites do período no fuso da barbearia (ADR-0009) e aritmética `Decimal`. Padrão: mês corrente no fuso da barbearia. Verificado: `npm test` (188; 8 novos em `financial.test.ts`, que portam os 2 do `FinanceiroApiTest`, este pelo fluxo real de comanda, e acrescentam ordenação, percentual específico por serviço, borda de período no fuso, precisão decimal, isolamento por tenant, 422 de período inválido e o cálculo do mês padrão); `npx tsc --noEmit`, `npm run lint`, `npm run build`; teste HTTP no dev server (lançamento + relatório do mês), com os dados de teste removidos. Sem commit (nenhum solicitado).
