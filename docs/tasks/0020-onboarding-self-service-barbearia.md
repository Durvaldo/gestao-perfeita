---
status: adiada
modulo: web
owner:
criado-em: 2026-10-03
---

# 0020 — Cadastro self-service de barbearia (onboarding)

**Task ID**: `TASK-0020`

## Objetivo

Permitir que uma barbearia nova se cadastre sozinha: criar o tenant (nome, slug), o usuário admin (com conta `credential`) e o plano/trial, numa única transação. Substitui de forma correta o `POST /register` do legado, que criava um admin sem tenant. Hoje o registro público está desativado ([ADR-0004](../decisions/0004-autenticacao-better-auth.md)).

Decisões de produto pendentes (perguntar ao usuário ao retomar): qual plano o cadastro recebe, quantos dias de trial, regras de slug, se há confirmação de e-mail obrigatória (depende da `TASK-0021`).

## Dependências

- `TASK-0019`

## Critérios de conclusão

- [ ] Fluxo de cadastro cria tenant + admin + conta de credencial atomicamente.
- [ ] Testes cobrindo o caminho principal e o slug duplicado.

## Referências

- [ADR-0004](../decisions/0004-autenticacao-better-auth.md)
- [`docs/PLANO_MELHORIAS_BENCHMARK.md`](../PLANO_MELHORIAS_BENCHMARK.md)

## Notas de progresso

- 2026-10-03 — Adiada por decisão do responsável (durante a `TASK-0004`): sem registro público na migração, para manter a paridade, já que o legado não tem tela de registro. Volta a ser considerada depois do corte (`TASK-0019`) ou por pedido explícito do usuário.
