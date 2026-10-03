---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0010 — Shell da UI: layout, login, guarda de rotas e componentes base

**Task ID**: `TASK-0010`

## Objetivo

Construir a casca visual do `web/`, equivalente à do `frontend/`:

- tela de login;
- layout com sidebar e header (`AppLayout.vue`);
- redirecionamento de rotas autenticadas e de convidado (`router.beforeEach`);
- modal genérico (`AppModal.vue`) e input decimal (`DecimalInput.vue`);
- feedback com toasts e confirmação destrutiva (hoje `sweetalert2`, em `utils/alerts.js`);
- formatação (`utils/format.js`).

Decidir com ADR o kit de UI. O Preline atual depende de JS imperativo e de reinicialização a cada troca de rota (ver [`REFORMULACAO_FRONTEND.md`](../REFORMULACAO_FRONTEND.md) §3.5): avaliar se ele se encaixa bem em React/Server Components ou se vale um equivalente. Os ícones vêm hoje de um kit Font Awesome carregado por `<script>` externo em `frontend/index.html`.

## Dependências

- `TASK-0001`
- `TASK-0004`

## Critérios de conclusão

- [x] ADR do kit de UI, dos ícones e dos toasts.
- [x] Login → dashboard (placeholder) → logout funcionando no navegador, e rota protegida redirecionando para `/login` quando não há sessão.
- [x] Textos de UI em pt-BR (exceção da regra 1).
- [x] Componentes base com um uso de exemplo.

## Referências

- [ADR-0004](../decisions/0004-autenticacao-better-auth.md): o login chama `POST /api/auth/sign-in/email` (ou o client do Better Auth); mensagens de erro via `authErrorMessage()` (`web/src/lib/auth-messages.ts`); `getCurrentUser()` para guardar as rotas no servidor.
- `frontend/src/components/*`, `frontend/src/utils/*`, `frontend/src/views/LoginView.vue`, `frontend/src/router/index.js`, `frontend/src/style.css`
- [`docs/REFORMULACAO_FRONTEND.md`](../REFORMULACAO_FRONTEND.md)

## Notas de progresso
- 2026-10-03 — Kit escolhido e registrado em [ADR-0010](../decisions/0010-kit-de-ui-shadcn-radix.md): shadcn/ui 4.21 (Radix) + Tailwind v4 (primária azul), sonner, lucide-react. O pacote `cn` instalado pelo CLI foi verificado como oficial do shadcn. Construídos: login (`(auth)/login`), layout protegido (`(app)/layout.tsx`, guarda no servidor, aviso para usuário sem tenant), `AppShell` (sidebar, sheet mobile, menu do usuário com Sair), menu igual ao do legado com Financeiro só para admin (item, card e rota), placeholders "Em construção", 404 em pt-BR, `AppModal`, `useConfirm`, `DecimalInput`, toasts, `format.ts` e a página `/componentes` (só dev). Problemas achados no teste manual e corrigidos: o autofill do Chrome deixava o "Entrar" desabilitado (agora os campos não são controlados e os valores vêm do `FormData`); um envio antes da hidratação poderia colocar as credenciais na URL (agora `method="post"`); o card Financeiro aparecia para o profissional; o 404 vinha em inglês. Verificado no Chrome: `/` sem sessão → `/login`; senha errada → mensagem pt-BR; admin entra → dashboard com menu completo; navegação e reload mantêm a sessão; menu do usuário → Sair → `/login`; rota protegida sem sessão → `/login`; profissional (carlos) entra → sem Financeiro no menu e no dashboard, `/financeiro` → 404 pt-BR; `/componentes` renderiza. `npm test` (164; 10 novos de UI: formatação, `DecimalInput`, `ConfirmProvider`, menu), `npx tsc --noEmit`, `npm run lint`, `npm run build`. Sem commit (nenhum solicitado).
