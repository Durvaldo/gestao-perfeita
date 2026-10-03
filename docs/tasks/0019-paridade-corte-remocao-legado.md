---
status: em-andamento
modulo: geral
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0019 — Paridade, corte e remoção do Laravel/Vue

**Task ID**: `TASK-0019`

## Objetivo

Confirmar a paridade do `web/` com o sistema atual e fazer o corte: atualizar a documentação e remover `backend/` e `frontend/`.

⚠️ **Human gate**: remover `backend/` e `frontend/` é destrutivo. Peça confirmação explícita ao usuário antes, mesmo em execução autônoma.

## Dependências

- `TASK-0003`
- `TASK-0011`
- `TASK-0013`
- `TASK-0015`
- `TASK-0018`

## Critérios de conclusão

- [ ] Checklist de paridade (tela por tela, regra por regra) registrado nesta task, comparando os dois sistemas lado a lado com o mesmo seed.
- [ ] Teste ponta a ponta (smoke) do ciclo principal: login → agendar → abrir comanda → fechar → ver no financeiro e no dashboard. Registrar a ferramenta escolhida (ex.: Playwright).
- [ ] Todo teste de `backend/tests/Feature/**` com equivalente no `web/`, ou com a ausência justificada aqui.
- [ ] Confirmação do usuário obtida e `backend/`/`frontend/` removidos.
- [ ] `AGENTS.md` raiz, `docs/SCOPE.md` (pedir ao usuário) e `docs/ROADMAP_IMPLEMENTACAO.md` atualizados para a stack nova; `backend/AGENTS.md` e `frontend/AGENTS.md` removidos junto com os módulos.

## Referências

- [ADR-0001](../decisions/0001-migracao-full-stack-nextjs.md)

## Notas de progresso
- 2026-10-03 — **Teste ponta a ponta** com Playwright 1.63 (`web/e2e/`, `npm run test:e2e`; ferramenta registrada no `web/AGENTS.md`): build de produção na porta 3002 sobre o banco de teste recém-semeado, Chrome instalado e navegador no fuso de Tóquio. 3 testes passando: (1) admin: login → agenda (Carlos, próxima segunda 10:00 no horário da barbearia) → agendar → "Criar comanda" (item Corte) → + Pomada → R$ 84,90 → fechar no Pix → "Paga" → financeiro com Receitas R$ 84,90 e comissão do Carlos R$ 18,00 → dashboard com Corte e ranking R$ 84,90; (2) profissional: sem Financeiro no menu, "Sua agenda." sem seletor de barbeiro, `/financeiro` → "Página não encontrada"; (3) senha errada → mensagem pt-BR.

**Checklist de paridade — telas (`frontend/src/views` → `web/src/app/(app)`)**

| Legado (Vue) | Novo (Next) | Situação |
|---|---|---|
| `LoginView` | `(auth)/login` | ✅ (+ correções de autofill e de credenciais na URL) |
| `AppLayout` (menu, usuário, sair) | `components/shell/app-shell.tsx` | ✅ (Financeiro só para admin) |
| `DashboardView` | `(app)/page.tsx` | ✅ (barras em HTML no lugar do ECharts, ADR-0010) |
| `cadastro/ClientesView` | `(app)/clientes` | ✅ |
| `cadastro/ServicosView` | `(app)/servicos` | ✅ |
| `cadastro/ProdutosView` | `(app)/produtos` | ✅ |
| `cadastro/BarbeirosView` (+ horários) | `(app)/barbeiros` | ✅ (excluir → desativar, ADR-0008) |
| `negocio/AgendaView` + `AgendaCalendar` | `(app)/agenda` | ✅ (fuso da barbearia, ADR-0009) |
| `negocio/ComandasView` | `(app)/comandas` | ✅ |
| `negocio/ComandaDetailView` | `(app)/comandas/[id]` | ✅ |
| `negocio/FinanceiroView` | `(app)/financeiro` | ✅ |

**Checklist de paridade — rotas da API (`backend/routes`) → `web/src/app/api`**: `/login`, `/logout` → `/api/auth/*` (Better Auth); `/api/user` → `/api/user`; `clientes` → `customers`; `servicos` → `services`; `produtos` → `products`; `barbeiros` → `professionals`; `barbeiros.horarios-trabalho` → `professionals/[id]/working-hours` + `working-hours/[id]`; `agendamentos` → `appointments`; `comandas` (+ `itens`, `fechar`) → `orders` (+ `items`, `close`); `financeiro-lancamentos` → `financial-entries`; `financeiro/relatorio` → `financial-report`; `dashboard` → `dashboard`. `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/email/verification-notification` → **não portados de propósito** (ADR-0004; `TASK-0020`/`0021` adiadas).

**Checklist de paridade — testes (`backend/tests/Feature/**`) → `web`**

| Legado | Equivalente | Situação |
|---|---|---|
| `Auth/AuthenticationTest` | `src/lib/__tests__/auth.test.ts` + E2E | ✅ |
| `Auth/RegistrationTest` | `auth.test.ts` ("does not allow public sign-up") | ⚠️ inverso de propósito: registro público desativado (ADR-0004, `TASK-0020`) |
| `Auth/PasswordResetTest`, `Auth/EmailVerificationTest` | — | ⏸ fora do escopo (`TASK-0021` adiada) |
| `ExampleTest` (Feature e Unit) | — | n/a (exemplos do skeleton do Laravel) |
| `LocalizationTest` | `http-errors.test.ts`, `validation.test.ts`, `api-stack.test.ts` | ✅ |
| `Tenancy/TenantScopeTest`, `ResolveTenantMiddlewareTest`, `CadastroModelsTenantScopeTest` | `src/lib/tenancy/__tests__/{scope,resolve}.test.ts` | ✅ (+ modelos indiretos, concorrência) |
| `Cadastro/CadastroApiTest` | `src/server/__tests__/catalog-crud.test.ts` | ✅ |
| `Cadastro/BarbeiroApiTest` | `professionals.test.ts` | ✅ (+ desativação) |
| `Cadastro/HorarioTrabalhoApiTest` | `working-hours.test.ts` | ✅ (+ acesso por ID entre tenants) |
| `Negocio/AgendamentoApiTest` | `appointments.test.ts` | ✅ (+ fuso, concorrência, inativo) |
| `Negocio/ComandaApiTest` | `orders.test.ts` | ✅ (+ estoque, duplicidade, fechamento concorrente) |
| `Negocio/FinanceiroApiTest` | `financial.test.ts` | ✅ (+ percentual por serviço, período no fuso) |
| `Negocio/DashboardApiTest` | `dashboard.test.ts` | ✅ (+ virada de ano, 29/02) |

Resultado atual: `npm test` 196 ✅ · `npm run test:e2e` 3 ✅ · `tsc`/`lint`/`build` ✅.

**Pendente (human gate)**: confirmação explícita do responsável para remover `backend/` e `frontend/`. ⚠️ O repositório ainda **não tem nenhum commit**: apagar agora seria irreversível. Recomendação: fazer primeiro um commit com o estado atual (o legado fica preservado no histórico) e só então remover numa segunda etapa. Depois da remoção: atualizar `AGENTS.md` raiz, `docs/ROADMAP_IMPLEMENTACAO.md`, apagar `backend/AGENTS.md`/`frontend/AGENTS.md` junto com os módulos e pedir ao responsável a atualização do `docs/SCOPE.md`.
