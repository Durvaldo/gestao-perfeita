---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0017 — Dashboard no servidor

**Task ID**: `TASK-0017`

## Objetivo

Portar as agregações do `DashboardController`, sempre considerando só comandas `paga`:

- `produtos_mais_vendidos` / `servicos_mais_vendidos`: top 5 por soma de `quantidade`.
- `ranking_barbeiros`: soma de `valor_total` por barbeiro, sem limite.
- `clientes_mais_frequentes`: top 5 por número de comandas.
- `proximos_aniversarios`: top 5 clientes com `data_nascimento`, ordenados pelos dias até o próximo aniversário (aniversário hoje conta como 0).

## Dependências

- `TASK-0014`

## Critérios de conclusão

- [x] Mesma forma de resposta.
- [x] Testes portando `backend/tests/Feature/Negocio/DashboardApiTest.php`, incluindo a virada de ano no cálculo de aniversário.

## Referências

- [ADR-0009](../decisions/0009-agendamento-fuso-por-tenant-e-regras.md): monte os limites de período (início/fim do dia ou do mês; "hoje" para aniversários) no fuso da barbearia (`tenants.timezone`, helpers em `web/src/lib/timezone.ts`), e não em UTC.
- `backend/app/Http/Controllers/DashboardController.php`

## Notas de progresso
- 2026-10-03 — Implementado `/api/dashboard` (`web/src/server/dashboard/dashboard.ts`) com as mesmas agregações do legado, considerando só comandas pagas: top 5 produtos e serviços por quantidade, ranking de profissionais por faturamento (sem limite), top 5 clientes por número de comandas e top 5 próximos aniversários. Forma da resposta em camelCase (ADR-0007), com valores monetários como `"0.00"`. "Hoje" dos aniversários = dia no fuso da barbearia (ADR-0009); 29/02 em ano não bissexto vira 01/03, como o Carbon do legado. **Paridade mantida e a decidir depois**: o profissional vê o dashboard da barbearia inteira, inclusive o faturamento dos colegas no ranking (o legado não filtrava). Se não for desejado, a mudança é filtrar com `visibleToActor` ou esconder o ranking para o profissional. Verificado: `npm test` (193; 5 novos em `dashboard.test.ts`, que portam os 2 do `DashboardApiTest`, o primeiro pelo fluxo real de comanda, e acrescentam ordenação e limite dos rankings, virada de ano e aniversário hoje, 29/02 e isolamento por tenant); `npx tsc --noEmit`, `npm run lint`, `npm run build`; teste HTTP no dev server (aniversários do seed corretos). Sem commit (nenhum solicitado).
- 2026-10-04 — Decisão pendente resolvida pela SPEC-0001 (Q2): o profissional passou a ver só os próprios dados no dashboard (`TASK-0025`).
