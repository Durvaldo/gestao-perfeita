---
status: backlog
modulo: web
owner:
criado-em: 2026-10-04
---

# 0033 — Telefones só com dígitos no servidor e normalização dos dados existentes

**Task ID**: `TASK-0033`

## Objetivo

Implementar o RF-1 e o RF-3 da [SPEC-0005](../specs/SPEC-0005.md):

- um helper único remove tudo que não for dígito e valida 10 ou 11 dígitos ("O telefone deve ter DDD e 8 ou 9 dígitos.");
- todo campo de telefone que a API recebe passa a usar esse helper: clientes, profissionais/usuários e barbearia;
- uma migration de dados limpa os telefones já gravados e lista os inválidos no log, sem apagar nada;
- o seed passa a gravar só dígitos.

## Dependências

- **Decisão do responsável sobre a Q1 da SPEC-0005** (gravar com ou sem o `55`). Recomendação: sem.

## Critérios de conclusão

- [ ] Decisão registrada na SPEC-0005.
- [ ] Testes: `"(11) 98765-4321"` → `"11987654321"`; 10 dígitos aceito; sem DDD → 422.
- [ ] Migration aplicada no banco de dev; telefones do seed só com dígitos.
- [ ] `npm test`, `npm run lint` e `npx tsc --noEmit` passando.

## Referências

- [SPEC-0005](../specs/SPEC-0005.md) (RF-1, RF-3, Q1)
- `web/src/server/http/fields.ts`, `web/src/server/customers/customers.ts`, `web/prisma/seed-data.ts`

## Notas de progresso

- 2026-10-04 — Criada bloqueada: o formato gravado depende da Q1 da SPEC-0005.
- 2026-10-04 — Desbloqueada: o responsável respondeu às questões pendentes (ver "Decisões do responsável" na SPEC de origem).
