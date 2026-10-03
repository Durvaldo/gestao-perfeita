Ver também o [AGENTS.md raiz](../AGENTS.md).

# frontend — SPA Vue 3 (legado em migração)

> ⚠️ Este módulo será substituído pela app Next.js em `web/` ([ADR-0001](../docs/decisions/0001-migracao-full-stack-nextjs.md)). Ele continua sendo a referência de telas e UX para as tasks `docs/tasks/0010`, `0011`, `0013`, `0015` e `0018`. Evite investir em features novas aqui.

## Propósito

Painel administrativo da barbearia (admin e prestador de serviço), consumindo a API do `backend/` via Axios com cookies (Sanctum SPA).

## Tech stack

Fonte: `package.json`.

- `vue ^3.5`, `vue-router ^4.6`, `axios ^1.18`, `vite ^8.1` com `@vitejs/plugin-vue`.
- UI: `tailwindcss ^4.3` (via `@tailwindcss/vite`), `@tailwindcss/forms`, `preline ^4.2`, `sweetalert2` (toasts e confirmações), `echarts ^6` + `vue-echarts ^8` (gráficos).
- Ícones: kit Font Awesome carregado por `<script>` externo em `index.html` (não é dependência npm).
- Sem Pinia: o estado de auth é um `reactive()` simples em `src/stores/auth.js`.
- JavaScript puro (sem TypeScript).

## Estrutura

- `src/main.js`: monta o app, importa `style.css` e `preline`.
- `src/router/index.js`: rotas `/login` (meta `guest`) e `/` com filhos `dashboard`, `clientes`, `barbeiros`, `servicos`, `produtos`, `agenda`, `comandas`, `comandas/:id`, `financeiro` (meta `requiresAuth`). O `beforeEach` busca `/api/user` uma vez e redireciona.
- `src/api/axios.js`: instância com `baseURL: 'http://localhost:8000'` **fixa no código** (sem variável de ambiente), `withCredentials` e `withXSRFToken`.
- `src/api/cadastro.js` e `src/api/negocio.js`: wrappers por recurso. `createCrudApi()` cobre os cadastros; agendamentos, comandas e financeiro têm funções próprias.
- `src/stores/auth.js`: `fetchUser`, `login` (csrf-cookie → `/login` → `/api/user`), `register` (sem tela que o use) e `logout`.
- `src/views/cadastro/*`, `src/views/negocio/*`, `DashboardView.vue`, `LoginView.vue`: telas. `AgendaView.vue` usa `authState.user.tipo` para distinguir admin de prestador.
- `src/components/`: `AppLayout.vue` (sidebar + header), `AppModal.vue`, `DecimalInput.vue`, `agenda/AgendaCalendar.vue`.
- `src/utils/`: `alerts.js` (sweetalert2), `calendar.js`, `format.js`. `src/echarts.js` faz o registro único dos módulos do ECharts.
- `src/style.css`: Tailwind v4 + Preline (`@import` por caminho relativo de `node_modules/preline/variants.css`) e classes de componente compartilhadas (`.card`, `.btn-primary` etc.). Padrões descritos em [`docs/REFORMULACAO_FRONTEND.md`](../docs/REFORMULACAO_FRONTEND.md).

## Configuração

- `vite.config.js`: dev server na porta **3000**, que precisa bater com `FRONTEND_URL`/CORS/Sanctum stateful do backend.
- A URL da API está no código (`src/api/axios.js`). Para mudar de ambiente, é preciso editar o arquivo.

## Testes

> Regra 3 do [AGENTS.md raiz](../AGENTS.md).

Não há framework de teste nem lint configurado (nenhum script `test`/`lint` no `package.json`). Como o módulo vai ser substituído, não vale montar uma suíte aqui. Os testes da UI nova ficam no `web/` (`TASK-0001`). Se for indispensável testar algo aqui antes do corte, o nativo do ecossistema é Vitest + `@vue/test-utils`.

## Build

- `npm install`, `npm run dev` (porta 3000), `npm run build` (gera `dist/`, que é gitignored) e `npm run preview`.
- Precisa do backend rodando em `http://localhost:8000`.

## Convenções

- Textos de UI em pt-BR (`index.html` usa `lang="pt-BR"`). Identificadores de domínio em português, espelhando a API (`clientesApi`, `agendamentosApi`).
- Código existente pode estar em português, mas código novo ou editado segue a regra 1 (inglês). A exceção é o texto voltado ao usuário final, que fica em português.
