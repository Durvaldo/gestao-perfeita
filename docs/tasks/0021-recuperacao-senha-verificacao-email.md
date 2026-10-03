---
status: adiada
modulo: web
owner:
criado-em: 2026-10-03
---

# 0021 — Recuperação de senha e verificação de e-mail

**Task ID**: `TASK-0021`

## Objetivo

Implementar "esqueci a senha", redefinição de senha e verificação de e-mail com o Better Auth (`sendResetPassword`, `emailVerification`). Esses recursos existem nas rotas do legado (`routes/auth.php`), mas nenhuma tela os usa. Exige escolher a infraestrutura de envio de e-mail (provedor, templates), que hoje não existe: o legado usa `MAIL_MAILER=log`.

## Dependências

- `TASK-0019`

## Critérios de conclusão

- [ ] Provedor de e-mail escolhido (ADR) e configurado, com fallback de log em dev.
- [ ] Fluxos de redefinição de senha e verificação de e-mail funcionando, com textos em pt-BR.
- [ ] Testes dos fluxos (tokens expirados e inválidos inclusive).

## Referências

- [ADR-0004](../decisions/0004-autenticacao-better-auth.md)
- `backend/routes/auth.php`, `backend/app/Http/Controllers/Auth/{PasswordResetLinkController,NewPasswordController,VerifyEmailController}.php`

## Notas de progresso

- 2026-10-03 — Adiada por decisão do responsável (durante a `TASK-0004`): fica para depois, junto com a infraestrutura de e-mail/notificações (Fase 4 do roadmap original). Volta a ser considerada depois do corte (`TASK-0019`) ou por pedido explícito do usuário.
