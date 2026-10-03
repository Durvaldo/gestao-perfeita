---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0004 — Autenticação (login, logout, sessão, usuário atual)

**Task ID**: `TASK-0004`

## Objetivo

Substituir o fluxo Laravel Breeze (API) + Sanctum SPA (cookie de sessão + CSRF) por autenticação no `web/`. Decidir a biblioteca/mecanismo com ADR (ex.: Auth.js, Better Auth, sessão própria). Se o banco for reaproveitado (`TASK-0002`), os hashes bcrypt dos usuários atuais precisam continuar verificáveis.

Superfície atual a cobrir (é o que o frontend Vue usa): `POST /login`, `POST /logout` e `GET /api/user`. Este último devolve o usuário **com o `barbeiro` vinculado**, que o frontend usa para saber a agenda do prestador logado.

⚠️ **Não porte `POST /register` como está.** No Laravel essa rota pública cria um `User` sem `tenant_id`, com o `tipo` no default da coluna (`admin`). Com esse usuário sem tenant, qualquer rota que use modelo de tenant lança `TenantContextMissingException`. O frontend Vue não tem tela de registro: `register()` existe em `src/stores/auth.js`, mas nenhuma view o usa. Como deve funcionar o cadastro de novas barbearias (onboarding de tenant) é decisão de produto. Pergunte ao usuário e, até lá, deixe o registro público de fora.

Esqueci a senha, redefinição e verificação de e-mail existem no backend (`routes/auth.php`), mas nenhuma tela usa. Confirme com o usuário se entram na paridade.

## Dependências

- `TASK-0002`

## Critérios de conclusão

- [x] ADR da escolha de auth.
- [x] Login com e-mail/senha dos usuários do seed (`TASK-0003`), logout e sessão que sobrevive a reload.
- [x] Helper de servidor que devolve o usuário atual (com `tipo`, `tenant_id` e barbeiro vinculado), usado pelas tasks seguintes.
- [x] Mensagens de erro de login em pt-BR (ver `backend/lang/pt_BR/auth.php`).
- [x] Testes de login válido, senha errada e acesso sem sessão (equivalentes a `backend/tests/Feature/Auth/AuthenticationTest.php`).

## Referências

- `web/src/lib/password.ts` (`TASK-0003`): o seed já grava as senhas com bcrypt custo 12 (`bcryptjs`). A auth escolhida precisa verificar esses hashes, ou substituir o módulo e rodar o seed de novo (`TRUNCATE` + `npm run db:seed`).
- `backend/routes/auth.php`, `backend/app/Http/Controllers/Auth/*`, `backend/app/Http/Requests/Auth/LoginRequest.php`
- `frontend/src/stores/auth.js`, `frontend/src/router/index.js`

## Notas de progresso
- 2026-10-03 — Decisões do responsável (human gates): sem registro público por ora (→ `TASK-0020`, adiada); recuperação de senha e verificação de e-mail ficam para depois (→ `TASK-0021`, adiada); Better Auth. Registradas em [ADR-0004](../decisions/0004-autenticacao-better-auth.md). Better Auth 1.7.7 instalado (peers aceitam Next 16, Prisma 7, Vitest 5) e configurado em `web/src/lib/auth.ts`: sign-up desativado, bcrypt via `src/lib/password.ts`, IDs serial, `role`/`tenantId` como campos adicionais, rate limit de 5/min no login e `nextCookies`. Schema ajustado ao contrato do Better Auth (migration `*_better_auth_tables`, gerada com `prisma migrate diff` e aplicada com `migrate deploy`, porque o `migrate dev` recusa rodar em modo não interativo quando remove colunas): `users` sem `password`/`email_verified_at`, com `email_verified`/`image`; novas `sessions`, `accounts` e `verifications`. Os dados afetados no `agenda_web` eram só os do seed, que foi rodado de novo. O seed passou a gravar a senha em `accounts` (`credential`). Criados `getCurrentUser()`, `authErrorMessage()`, `GET /api/user` e o handler `/api/auth/*`. Verificado: `npm test` (16 testes; 7 novos de auth: login válido, usuário atual com e sem profissional, senha errada com mensagem pt-BR, e-mail desconhecido, sem sessão / cookie inválido, logout e sign-up bloqueado); teste HTTP no dev server (401 sem sessão → login 200 → `/api/user` 200 com `professional` → logout → 401; senha errada 401; sign-up 400); `npm run lint`, `npx tsc --noEmit` e `npm run build`. A tela de login fica na `TASK-0010`. Sem commit (nenhum solicitado).
