# 0001 — Migração para Next.js full-stack, com app nova em paralelo em `web/`

- **Data**: 2026-10-03
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0001`

## Contexto

O sistema hoje é um monorepo com `backend/` (Laravel 13, PHP 8.3, Sanctum, PostgreSQL) e `frontend/` (Vue 3 + Vite, Tailwind v4/Preline). As Fases 1–3 do [roadmap](../ROADMAP_IMPLEMENTACAO.md) estão concluídas e a Fase 4 (notificações e deploy) ainda não começou, então ainda não há deploy de produção.

O responsável pelo projeto decidiu levar o sistema para Next.js. Na hora de decidir (2026-10-03), escolheu explicitamente:

- **Full-stack**: o Next.js assume frontend **e** backend; o Laravel sai.
- **Em paralelo**: a app nova é construída num diretório novo (`web/`), e o sistema atual continua funcionando até a paridade.

## Decisão

1. Criar a aplicação Next.js (TypeScript) em `web/`. Ela substitui `backend/` e `frontend/`.
2. Migrar por **paridade funcional**. As regras de negócio do Laravel (tenancy, policies, agenda, comanda, financeiro, dashboard) e o comportamento das telas Vue são a referência. Features novas ficam fora da migração (ver [`SCOPE.md`](../SCOPE.md)).
3. `backend/` e `frontend/` só são removidos na task final de corte (`TASK-0019`), depois da checagem de paridade e com confirmação humana. Até lá, os dois sistemas ficam no repositório.
4. Escolhas técnicas ainda **não** decididas por esta ADR. Cada uma fica para a task indicada, com uma ADR própria quando houver alternativas reais:
   - test runner / lint / estrutura do `web/` → `TASK-0001`
   - ORM, reaproveitar ou não o schema Postgres atual, nomenclatura de tabelas/modelos (português atual × regra 1 de código em inglês) → `TASK-0002`
   - biblioteca/mecanismo de autenticação e compatibilidade com os hashes bcrypt existentes → `TASK-0004`
   - mecanismo de isolamento por tenant (filtro na camada de ORM × Row Level Security no Postgres × combinação) → `TASK-0005`
   - Route Handlers × Server Actions, biblioteca de validação, formato de erro → `TASK-0007`
   - kit de UI (Preline depende de JS imperativo; avaliar equivalente em React) → `TASK-0010`

## Alternativas consideradas

- **Migrar só o frontend (Vue → Next.js), mantendo o Laravel como API**: menos risco, e reaproveita as regras e os testes de feature já existentes. Descartada pelo responsável, que quer uma stack única em TypeScript.
- **Substituir no lugar (recriar `frontend/` direto como Next.js)**: o repositório fica mais simples, mas o sistema fica quebrado até o fim da migração. Descartada em favor da convivência em paralelo.

## Consequências

- Toda a lógica de servidor precisa ser reimplementada e **retestada**: multi-tenancy (`app/Tenancy/*`, `ResolveTenant`), policies, transações de comanda/estoque/financeiro, validações e mensagens em pt-BR. Os testes de `backend/tests/Feature/**` servem de especificação executável para os novos testes.
- Durante a migração há dois sistemas para manter. Evite investir em features novas em `backend/`/`frontend/`, porque elas teriam de ser portadas de novo.
- O renomeamento de domínio `Barbeiro` → `Profissional` proposto em [`PLANO_MELHORIAS_BENCHMARK.md`](../PLANO_MELHORIAS_BENCHMARK.md) (§2.1) **não** faz parte desta decisão. Decidir se ele entra na migração é uma decisão de produto (human gate), a tomar em `TASK-0002`.
- Fase 4 (notificações, jobs/queue, scheduler) será construída já na stack nova. O mecanismo de jobs em Next.js também está em aberto e não é escopo das tasks de migração.
