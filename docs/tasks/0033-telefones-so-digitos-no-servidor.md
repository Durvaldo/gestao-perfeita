---
status: concluida
modulo: web
owner: Durvaldo
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

- [x] Decisão registrada na SPEC-0005.
- [x] Testes: `"(11) 98765-4321"` → `"11987654321"`; 10 dígitos aceito; sem DDD → 422.
- [x] Migration aplicada no banco de dev; telefones do seed só com dígitos.
- [x] `npm test`, `npm run lint` e `npx tsc --noEmit` passando.

## Referências

- [SPEC-0005](../specs/SPEC-0005.md) (RF-1, RF-3, Q1)
- `web/src/server/http/fields.ts`, `web/src/server/customers/customers.ts`, `web/prisma/seed-data.ts`

## Notas de progresso

- 2026-10-04 — Criada bloqueada: o formato gravado depende da Q1 da SPEC-0005.
- 2026-10-04 — Desbloqueada: o responsável respondeu às questões pendentes (ver "Decisões do responsável" na SPEC de origem).
- 2026-10-04 — Implementado. `src/lib/phone.ts` (`phoneDigits`, `isValidPhoneDigits`, isomórfico) e os builders `phone()`/`optionalPhone()` em `fields.ts`: tiram tudo que não é dígito e validam 10 ou 11 dígitos ("O telefone deve ter DDD e 8 ou 9 dígitos."). Aplicados a clientes (obrigatório) e ao telefone do profissional/usuário (opcional). A barbearia (`tenants.phone`) ainda não tem API de escrita; quando tiver, deve usar `optionalPhone()`. Migration `20261004230000_phone_digits_only`: limpa `customers`, `users` e `tenants` e lista como NOTICE o que ficar fora de 10–11 dígitos, sem apagar nada. No banco de dev, os 12 clientes ficaram válidos. Seed só com dígitos. Testes: unitários de `phone.ts`, API de clientes (normaliza, fixo, inválidos incluindo `+55`) e de profissionais (opcional, normaliza, inválido). Verificado: `npm test` (222), `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (6). **Produção (Vercel):** o build é só `next build` e não aplica migrations, então é preciso rodar `npx prisma migrate deploy` com o `DATABASE_URL` de produção.
