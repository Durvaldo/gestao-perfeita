# 0003 — Camada de dados: Prisma 7, banco novo e schema em inglês com `Professional`

- **Data**: 2026-10-03
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0003`
- **Task relacionada**: `TASK-0002`

## Contexto

A `TASK-0002` precisava definir a camada de dados do `web/`: o ORM, se o banco atual do Laravel seria reaproveitado, a nomenclatura (o legado está em português; a regra 1 pede código em inglês) e se o renomeamento `Barbeiro` → `Profissional` de [`PLANO_MELHORIAS_BENCHMARK.md`](../PLANO_MELHORIAS_BENCHMARK.md) §2.1 entraria agora. Os três últimos pontos eram decisões de produto. O responsável escolheu, em 2026-10-03, as opções recomendadas em todos eles.

## Decisão

1. **ORM: Prisma 7.10.0** (`prisma`, `@prisma/client`, `@prisma/adapter-pg` + `pg`), com o generator `prisma-client`, o client gerado em `web/src/generated/prisma` (gitignored; gerado no `postinstall`) e a config em `web/prisma7.config.ts`. Esse é o nome padrão do Prisma 7.10, que ainda aceita `prisma.config.ts` como legado. Versão fixada na 7.10.0 porque o dist-tag `latest` do npm apontava para uma RC (`8.0.0-rc.19`).
2. **Banco novo**: `agenda_web` (app) e `agenda_web_test` (suíte de testes), no mesmo Postgres local (container `esus-db`, porta 5433). O `agenda_barbearia` do Laravel não é tocado, então cada sistema é dono do seu schema durante a convivência.
3. **Nomenclatura em inglês**: models em PascalCase e campos em camelCase no Prisma, mapeados (`@@map`/`@map`) para tabelas e colunas em snake_case. A tabela de correspondência com o legado fica em [`web/AGENTS.md`](../../web/AGENTS.md).
4. **`Barbeiro` → `Professional`** já no schema (`professionals`, `professional_services`, `professional_id`). O papel `prestador_de_servico` vira `UserRole.professional`. O rótulo exibido na UI ("Barbeiro") é texto de produto e pode continuar.
5. Detalhes de modelagem escolhidos aqui:
   - **IDs `Int`** (serial de 4 bytes) em vez de `BigInt`. No Laravel eram `bigint`, mas `BigInt` em JS não serializa em JSON e complica toda a pilha. O volume previsto não chega perto do limite de 2^31.
   - **Enums nativos do Postgres**. O Laravel usava `varchar` + check, e os valores mudam para inglês (`pendente` → `pending`, `dinheiro` → `cash` etc.; ver o mapeamento).
   - **Nova coluna `orders.paid_at`**: corrige a simplificação herdada, em que o relatório de comissão usava o `updated_at` da comanda como data de pagamento. A `TASK-0014` precisa preenchê-la ao fechar a comanda, e a `TASK-0016` precisa filtrá-la.
   - **`professionals.user_id` único**: o legado não garantia isso no banco, mas sempre criava exatamente um usuário por barbeiro.
   - **Horários (`working_hours.start_time`/`end_time`) como `time(0)`**, igual ao legado. O Prisma os expõe como `Date` em `1970-01-01` UTC; a `TASK-0012` deve comparar só a parte de hora.
   - **Valores monetários e percentuais em `Decimal`** (`decimal(10,2)` e `decimal(5,2)`). O Prisma devolve `Decimal` (decimal.js); nunca converta para `number` nos cálculos.
   - As tabelas de infraestrutura do Laravel (`sessions`, `cache`, `jobs`, `personal_access_tokens`, `password_reset_tokens`) não foram portadas. A auth (`TASK-0004`) cria o que precisar.
6. **Testes com banco**: o `globalSetup` do Vitest roda `prisma migrate deploy` no `TEST_DATABASE_URL`, e cada arquivo de teste limpa as tabelas com `truncateAll()` (`web/tests/db.ts`). O `vitest.config.mts` aborta se `TEST_DATABASE_URL` faltar ou for igual a `DATABASE_URL`.

## Alternativas consideradas

- **Drizzle**: mais leve e próximo do SQL, mas não tem mecanismo de escopo global; o isolamento por tenant (`TASK-0005`) teria de ser um wrapper próprio ou RLS. O Prisma tem `include` (o mais próximo do `with()` do Eloquent), tipo `Decimal` e client extensions. Escolha confirmada pelo responsável.
- **Reaproveitar o `agenda_barbearia`**: preservaria os dados atuais, mas deixaria dois sistemas de migration disputando o mesmo schema e prenderia a app nova aos nomes do Laravel. Ainda não há produção.
- **Manter os nomes em português**: facilitaria comparar linha a linha com o Laravel, mas iria contra a regra 1 em todo código novo.
- **`prisma migrate reset` no setup dos testes**: o Prisma 7 bloqueia esse comando quando é executado por um agente de IA sem consentimento explícito a cada vez. Truncar só o banco de teste dedicado tem o mesmo efeito, sem depender de confirmação manual a cada execução da suíte.

## Consequências

- As tasks seguintes passam a usar os nomes em inglês. Ao portar uma regra do Laravel, use a tabela de mapeamento do `web/AGENTS.md`.
- `npm test` agora exige o Postgres local no ar, com `agenda_web_test` criado e `TEST_DATABASE_URL` no `web/.env`.
- Os valores gravados mudam: a categoria do lançamento gerado ao fechar uma comanda (`venda` no legado) será definida em inglês ou como texto de produto na `TASK-0014`.
- Comparar os dois sistemas lado a lado (`TASK-0019`) exige traduzir valores de enum e nomes de campo.
