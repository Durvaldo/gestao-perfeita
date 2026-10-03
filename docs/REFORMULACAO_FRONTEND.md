# Reformulação do Frontend — Padronização Visual

> Documento de padrões e roteiro de execução. Referências: `ROADMAP_IMPLEMENTACAO.md` (progresso geral do projeto), `ESPECIFICACAO.md` (produto).

## 1. Visão geral e objetivo

O frontend (`frontend/`) foi construído nas Fases 1–3 do roadmap com o CSS padrão que o `npm create vite` gera (variáveis soltas em `src/style.css`, classes genéricas `.crud-form`/`.crud-table`/`.btn`). Funciona, mas:

- Não existe biblioteca de ícones (nenhum ícone em nenhuma tela).
- Não existe sistema de feedback visual — exclusões usam `window.confirm()` nativo do navegador (5 telas) e não há nenhum toast de sucesso/erro.
- O Dashboard mostra tudo em tabelas simples, sem gráfico.
- Não há um padrão visual consistente entre as 9 telas (cada uma reaproveita as mesmas 3 classes genéricas).

Como as Fases 1–3 (fundação, cadastro, núcleo do negócio) estão prontas e testadas ponta a ponta, e falta apenas a Fase 4 (notificações + deploy), este é o momento certo para padronizar a UI antes de fechar o projeto — evita retrabalho de estilizar duas vezes as telas que ainda faltam (notificações) e dá uma cara mais profissional ao sistema.

**O que muda:** a camada visual (HTML/classes/componentes) de todas as telas, o layout (sidebar + header no lugar do menu simples atual), o feedback ao usuário (toasts/confirmação estilizada) e a adição de gráficos no Dashboard.

**O que não muda:** a stack funcional — Vue 3 (Composition API, `<script setup>`), Vue Router, Axios, o `stores/auth.js` reativo, a API Laravel/Sanctum. Este documento cobre só o frontend visual.

---

## 2. Stack de UI escolhida

| Ferramenta | Papel | Pacotes/instalação |
|---|---|---|
| **Tailwind CSS v4** | Base utilitária exigida pelo Preline | `npm install tailwindcss @tailwindcss/vite` |
| **Preline UI (free)** | Componentes visuais (sidebar, navbar, cards, tabelas, dropdowns, modais, badges) — inspirado no template [Admin Dashboard](https://preline.co/templates/dashboards/admin-dashboard/) | `npm install preline` + `npm install -D @tailwindcss/forms` |
| **Font Awesome** | Ícones em toda a interface (menu, botões, status) — usando o Kit já criado pelo usuário | Script já pronto: `<script src="https://kit.fontawesome.com/842f88f834.js" crossorigin="anonymous"></script>` |
| **SweetAlert2** | Confirmações de ação e, principalmente, **toasts** de feedback (ex: "Cliente excluído", "Agendamento criado") | `npm install sweetalert2` |
| **Apache ECharts** (via `vue-echarts`) | Gráficos, começando pelo Dashboard | `npm install echarts vue-echarts` |

**Nota sobre o template linkado:** o [Admin Dashboard](https://preline.co/templates/dashboards/admin-dashboard/) que serviu de inspiração é parte do **Preline Pro** (pago). Decisão tomada: seguir só com a **versão free** do Preline, recriando o mesmo tipo de layout (sidebar + header, cards, tabelas) a partir dos exemplos e componentes gratuitos:
- [Application Layout: Sidebar & Header](https://preline.co/examples/html/application-layout-sidebar-and-header.html) — shell base (sidebar + topo)
- [Sidebar (docs)](https://preline.co/docs/sidebar.html) — comportamento do menu lateral (colapsar, offcanvas no mobile)
- [Blocks gratuitos](https://preline.co/blocks/) — cards, tabelas, badges, etc. (verificar "Free" em cada bloco; vários são premium)

Sem custo, com um pouco mais de trabalho de montagem manual comparado ao template pronto.

---

## 3. Padrões e convenções do projeto

Para não repetir código nas 9 telas, criamos um pequeno "design system" de convenções:

### 3.1 `src/utils/alerts.js` — feedback ao usuário
Centraliza todo uso do SweetAlert2 num único lugar, com 3 helpers:
- `toastSuccess(mensagem)` — toast verde, canto superior direito, timer curto (ex: 2.5s), sem botão.
- `toastError(mensagem)` — toast vermelho, mesmo estilo.
- `confirmDelete(mensagem)` — substitui `window.confirm()`: modal SweetAlert2 com ícone de aviso, botão "Excluir" (vermelho) e "Cancelar"; retorna `true`/`false`.

Todas as 5 telas que hoje usam `confirm(...)` (Clientes, Barbeiros, Serviços, Produtos, Financeiro) passam a usar `confirmDelete`, e toda ação de criar/editar/excluir bem-sucedida passa a chamar `toastSuccess`.

### 3.2 `src/echarts.js` — setup único do ECharts
`vue-echarts` exige registrar explicitamente (`use([...])`) os componentes de chart/renderer usados (tree-shaking). Em vez de repetir esse import em cada gráfico, um arquivo único registra tudo que o projeto usa (ex: `BarChart`, `PieChart`, `CanvasRenderer`, `TooltipComponent`, `GridComponent`) e cada view só importa o componente `VChart` já configurado.

### 3.3 Layout shell (sidebar + header)
`AppLayout.vue` (hoje um `<nav>` flex simples) vira uma sidebar fixa + header no padrão Preline, com ícone Font Awesome por item de menu, nome/avatar do usuário e logout no header. Base: exemplo gratuito *Application Layout: Sidebar & Header*.

### 3.4 Tabela + modal no lugar de formulário inline
Hoje cada tela de cadastro mostra um formulário sempre visível acima da tabela (`.crud-form` + `.crud-table`). Passa a ser: tabela Preline (`overflow-hidden`, `divide-y`) com botão "Novo" que abre um modal Preline contendo o formulário — tanto para criar quanto para editar.

### 3.5 Reinicialização do Preline em troca de rota
Como é uma SPA, o Vue Router troca o conteúdo da página sem recarregar o script do Preline — então componentes interativos (dropdown, modal, sidebar) renderizados numa nova rota não iniciam sozinhos. Precisa registrar em `src/router/index.js`:

```js
router.afterEach((to, from, failure) => {
  if (!failure) setTimeout(() => window.HSStaticMethods.autoInit(), 100)
})
```

---

## 4. Passo a passo da implementação

Cada passo tem um critério de "pronto" — igual ao formato usado em `ROADMAP_IMPLEMENTACAO.md`.

- [x] **Passo A — Setup base**
  Instalar `tailwindcss` + `@tailwindcss/vite`, `preline`, `@tailwindcss/forms`, `sweetalert2`, `echarts`, `vue-echarts`. Configurar `vite.config.js` (plugin do Tailwind) e `src/style.css`:
  ```css
  @import "tailwindcss";
  @plugin "@tailwindcss/forms";
  @import "preline/variants.css";
  @source "../node_modules/preline/dist/*.js";
  ```
  Importar o JS do Preline em `src/main.js` (`import 'preline/dist/index.js'`). Adicionar o script do Font Awesome Kit em `index.html`.
  **Pronto quando:** `npm run dev` sobe sem erro, uma classe Tailwind qualquer (ex: `bg-red-500`) e um ícone Font Awesome (ex: `fa-solid fa-house`) aparecem corretamente numa tela de teste.

- [x] **Passo B — Layout shell**
  Recriar `AppLayout.vue` com sidebar + header Preline (base: *Application Layout: Sidebar & Header*), ícones Font Awesome nos itens de menu (Dashboard, Agenda, Comandas, Financeiro, Clientes, Barbeiros, Serviços, Produtos), nome do usuário e logout no header. Registrar `router.afterEach` com `HSStaticMethods.autoInit()`.
  **Pronto quando:** navegar entre todas as rotas mantém a sidebar funcional (inclusive dropdowns/offcanvas mobile, se usados).

- [x] **Passo C — Helpers de feedback**
  Criar `src/utils/alerts.js` (`toastSuccess`, `toastError`, `confirmDelete`). Trocar os 5 `confirm(...)` existentes por `confirmDelete`; adicionar `toastSuccess`/`toastError` nas 9 telas após criar/editar/excluir.
  **Pronto quando:** excluir qualquer registro mostra o modal de confirmação estilizado e, após confirmar, um toast de sucesso.

- [x] **Passo D — Telas de cadastro** (Clientes, Barbeiros, Serviços, Produtos)
  Trocar `.crud-form`/`.crud-table` por tabela + modal Preline, mantendo a lógica de `script setup` já existente (só a camada visual muda).
  **Pronto quando:** as 4 telas usam o mesmo padrão visual (tabela + modal) e passam no mesmo teste manual que já foi feito na Fase 2 (criar/editar/excluir, dados filtrados por tenant).

- [x] **Passo E — Telas de negócio** (Agenda, Comandas, Financeiro)
  Mesmo tratamento visual. Atenção especial a badges de status (agendamento: pendente/confirmado/concluído/cancelado) usando cores Preline.
  **Pronto quando:** o ciclo completo (agendar → comanda → financeiro) continua funcionando, agora com o novo visual.

- [x] **Passo F — Dashboard com ECharts**
  Trocar as tabelas de "ranking de barbeiros" e "mais vendidos" por gráfico de barras horizontal (ECharts). "Clientes mais frequentes" e "próximos aniversários" podem continuar como lista/tabela (não se beneficiam de gráfico).
  **Pronto quando:** o Dashboard carrega os gráficos com os dados reais da API, responsivos.

- [x] **Passo G — Login**
  Restilizar `LoginView.vue` no padrão Preline (card centralizado).
  **Pronto quando:** login continua funcionando (fluxo Sanctum) com o novo visual.

- [x] **Passo H — Polish final**
  Revisar dark mode (Preline suporta nativamente via classe `dark` — decidir se vale ativar toggle), responsividade mobile da sidebar (offcanvas), consistência visual entre todas as telas.
  **Pronto quando:** todas as 9 telas + login seguem o mesmo padrão visual, testado em desktop e mobile.

---

## 5. Observações técnicas

- Font Awesome via Kit faz auto-replace de `<i>` para SVG usando um `MutationObserver` — funciona normalmente dentro de componentes Vue, sem configuração extra.
- SweetAlert2 não depende de Tailwind/Preline — poderia ser feito a qualquer momento, mas faz mais sentido sequenciar depois do Passo A para manter tudo no mesmo commit de fundação.
- `vue-echarts` exige `use([...])` explícito dos módulos usados — feito uma única vez em `src/echarts.js`.
- Este documento não implica reescrever a lógica de nenhuma tela — toda a camada de `script setup` (chamadas de API, validação, estado) permanece igual; só a `<template>` e o CSS mudam.
