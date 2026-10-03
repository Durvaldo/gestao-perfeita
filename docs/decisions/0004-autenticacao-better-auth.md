# 0004 — Autenticação com Better Auth, sem registro público

- **Data**: 2026-10-03
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0004`
- **Task relacionada**: `TASK-0004`

## Contexto

O legado usa Laravel Breeze (API) + Sanctum SPA: cookie de sessão + CSRF, `POST /login`, `POST /logout` e `GET /api/user` (usuário com `barbeiro`). Também expõe `POST /register`, recuperação de senha e verificação de e-mail, mas nenhuma tela os usa. O `/register` ainda cria um `admin` **sem tenant**, que quebra com erro 500 em qualquer rota com tenant. Não há envio de e-mail configurado (`MAIL_MAILER=log`).

O responsável decidiu em 2026-10-03:

- **Sem registro público** por ora. Barbearias e usuários são criados pelo seed ou por código da app; o onboarding self-service vira uma task separada (`TASK-0020`, adiada).
- **Recuperação de senha e verificação de e-mail ficam para depois**, junto com a infraestrutura de e-mail (`TASK-0021`, adiada).
- **Better Auth** como biblioteca.

## Decisão

- **Better Auth 1.7.7** (peers compatíveis: Next 16, Prisma 7, Vitest 5). Configuração em `web/src/lib/auth.ts`:
  - `emailAndPassword` com `disableSignUp: true`;
  - adapter Prisma;
  - `advanced.database.generateId: "serial"` (nossos IDs são `Int`);
  - `role` e `tenantId` como `additionalFields` do usuário (só leitura, `input: false`);
  - plugin `nextCookies` (para Server Actions).
- **Hash de senha**: bcrypt custo 12 (`web/src/lib/password.ts`, `bcryptjs`), plugado em `emailAndPassword.password.hash/verify`, em vez do scrypt padrão do Better Auth. Mantém o mesmo esquema do Laravel e dos hashes já gravados pelo seed.
- **Sessão no banco** (tabela `sessions`): cookie httpOnly gerenciado pelo Better Auth, com expiração padrão de 7 dias e renovação diária.
- **Schema ajustado ao contrato do Better Auth** (migration `*_better_auth_tables`):
  - `users` perde `password` e `email_verified_at`, e ganha `email_verified` (boolean) e `image`;
  - novas tabelas `sessions`, `accounts` e `verifications`;
  - a senha passa a ficar em `accounts` (`provider_id = 'credential'`, `account_id` = id do usuário);
  - `accounts` tem unicidade em (`provider_id`, `account_id`), o que deixa o seed idempotente.
- **Superfície HTTP**:
  - `/api/auth/*` (handler do Better Auth: `POST /api/auth/sign-in/email`, `POST /api/auth/sign-out`, `GET /api/auth/get-session`);
  - `GET /api/user`, equivalente ao legado: usuário + `professional`, ou 401 `Não autenticado.`.
- **Usuário atual no servidor**: `getCurrentUser()` (`web/src/lib/current-user.ts`) valida a sessão pelo Better Auth e lê `role`, `tenantId` e `professional` **do banco**, não do cache da sessão. É a base das `TASK-0005`/`0006`.
- **Mensagens em pt-BR**: o Better Auth devolve códigos (`INVALID_EMAIL_OR_PASSWORD` etc.) com mensagens em inglês. A UI traduz com `authErrorMessage()` (`web/src/lib/auth-messages.ts`), usando os textos do `lang/pt_BR/auth.php` do legado.
- **Rate limit** do login: 5 tentativas/minuto em `/sign-in/email`, igual ao throttle do `LoginRequest` do Laravel. O Better Auth só aplica rate limit em produção por padrão.

## Alternativas consideradas

- **Auth.js (NextAuth v5)**: o provider Credentials é desencorajado pela própria biblioteca e só funciona com sessão JWT, sem sessão no banco, o que dificulta revogar sessões.
- **Sessão própria**: controle total, mas CSRF, rotação, expiração e rate limit ficariam sob nossa responsabilidade.
- **Scrypt padrão do Better Auth**: funcionaria, mas o bcrypt mantém compatibilidade com o legado (útil se algum dia houver migração de usuários do `agenda_barbearia`) e com o seed já escrito.

## Consequências

- Criar usuário com login exige duas linhas: `users` + `accounts` (`credential`). Use o padrão de `ensureCredentialAccount` em `web/prisma/seed-data.ts` ou a API do Better Auth. Isso vale para a criação de profissional na `TASK-0009`.
- Os endpoints crus do Better Auth respondem em inglês. Toda mensagem exibida ao usuário passa por `authErrorMessage()` (`TASK-0010`).
- `getCurrentUser()` faz uma query a mais por chamada (a leitura do usuário). É aceitável e garante que mudança de papel ou de tenant valha na hora.
- `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` passam a ser obrigatórios no `web/.env`.
