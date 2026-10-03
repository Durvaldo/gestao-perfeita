# 0010 — Kit de UI: shadcn/ui (Radix) + Tailwind v4, sonner e lucide; guarda de rotas no layout do servidor

- **Data**: 2026-10-03
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0010`
- **Task relacionada**: `TASK-0010`

## Contexto

O `frontend/` Vue usa Tailwind v4 + Preline (componentes acionados por JS imperativo, que exigem reinicialização a cada troca de rota, ver `REFORMULACAO_FRONTEND.md` §3.5), sweetalert2 para toasts e confirmações, ECharts e um kit Font Awesome carregado por `<script>` externo. A casca da nova UI (`TASK-0010`) precisava de um kit que se encaixasse bem em React 19 / Server Components.

## Decisão

- **shadcn/ui 4.21** com primitivas **Radix** (estilo `radix-nova`; `components.json` em `web/`). Os componentes são copiados para `web/src/components/ui/` (código nosso, editável) e estilizados com Tailwind v4 via variáveis CSS em `src/app/globals.css`.
  - Cor primária azul (`blue-600` do Tailwind), como no sistema atual. O resto segue a base `neutral`.
  - O CLI 4.x instala o pacote `cn` (mantido pelo próprio shadcn, repositório `shadcn-ui/cn`) no lugar de `clsx` + `tailwind-merge`. Foi verificado e não tem scripts de instalação.
- **Toasts**: `sonner` (`<Toaster />` no layout raiz; `toastSuccess`/`toastError` em `src/lib/toast.ts`). **Confirmação destrutiva**: `useConfirm()` (`src/components/confirm-provider.tsx`, AlertDialog), que substitui o sweetalert2 e o `window.confirm`.
- **Ícones**: `lucide-react` (pacote npm), no lugar do kit Font Awesome externo.
- **Componentes base próprios**:
  - `AppModal` (formulários em modal, padrão tabela + modal do legado);
  - `DecimalInput` (o usuário digita "1.234,5" e a API recebe a string "1234.5", nunca float);
  - `src/lib/format.ts` (`formatDate` sem conversão de fuso, `formatDateTime`, `formatDecimal`, `formatCurrency`, `parseDecimal`, `initials`).
  - Exemplos de uso em `/componentes`, que só existe em desenvolvimento.
- **Rotas**: grupo `(auth)` com `/login` e grupo `(app)` com o painel.
  - **A guarda fica no layout do servidor** (`src/app/(app)/layout.tsx`): sem sessão, redireciona para `/login`; usuário sem tenant (`super_admin`) vê um aviso. Não há `proxy` (o antigo `middleware`, renomeado no Next 16): a checagem autoritativa já é feita no servidor, e a API checa de novo a cada requisição.
  - O `/login` redireciona para `/` quem já tem sessão.
  - Rotas e rótulos em pt-BR (`/clientes`, `/barbeiros`...), por serem texto de produto.
  - O menu é igual ao do legado; o Financeiro (item, card e rota) só aparece para admin.
- **Login**: `authClient.signIn.email` (`better-auth/react`, `src/lib/auth-client.ts`), com erros traduzidos por `authErrorMessage()`.
  - Os campos não são controlados e os valores são lidos do `FormData` no envio. Motivo: o autofill do Chrome preenche os campos sem disparar `onChange`, e o botão ficava desabilitado.
  - O formulário usa `method="post"`: se for enviado antes da hidratação, o navegador nunca coloca as credenciais na URL. Os dois problemas foram encontrados no teste manual no navegador.
- **404 em pt-BR** (`src/app/not-found.tsx`), também usado pelo `notFound()` das páginas.

## Alternativas consideradas

- **Manter o Preline**: depende de JS imperativo e de reinicialização por rota, um encaixe ruim com React/RSC.
- **Biblioteca de componentes fechada** (MUI, Mantine, Chakra): mais pesada e com outro sistema de estilos. O shadcn mantém o Tailwind v4 que o time já usa e deixa o código dos componentes no repositório.
- **`proxy` do Next 16 para a guarda de rotas**: seria só uma checagem otimista por cookie. A do layout do servidor já é autoritativa e suficiente agora.

## Consequências

- Para adicionar um componente: `npx shadcn@4.21.1 add <nome>` dentro de `web/`, depois revisar o arquivo gerado em `src/components/ui/`.
- Novas páginas do painel entram em `src/app/(app)/<rota>/page.tsx` e herdam a guarda e o layout. Os placeholders "Em construção" (`ComingSoon`) são substituídos pelas tasks de cada tela.
- Textos de UI sempre em pt-BR. Horários exibidos no fuso da barbearia (ADR-0009).

## Atualização — 2026-10-03 (`TASK-0018`)

- **Gráficos**: o legado usava ECharts (via `vue-echarts`). Os gráficos do dashboard são todos de **barras horizontais de série única** (magnitude por categoria: mais vendidos, ranking, clientes frequentes), então foram feitos com um componente em HTML puro (`web/src/components/charts/bar-list.tsx`), sem biblioteca de gráficos. São mais leves e acessíveis: os valores aparecem como texto, a identidade não depende de cor, e há tooltip no hover. Uma cor só (a primária azul), validada com o validador da skill de dataviz contra as superfícies clara e escura (passa em todas as checagens). Se surgir um gráfico que precise de eixos ou séries temporais, avalie o componente `chart` do shadcn (Recharts) antes de trazer o ECharts de volta.
- O placeholder `ComingSoon` foi removido: todas as telas do menu foram migradas.
