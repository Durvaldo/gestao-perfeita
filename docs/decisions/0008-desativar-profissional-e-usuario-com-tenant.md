# 0008 — "Excluir" profissional desativa, e todo usuário tem tenant (exceto super_admin)

- **Data**: 2026-10-03
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0008`
- **Task relacionada**: `TASK-0009`

## Contexto

No legado, `DELETE /api/barbeiros/{id}` apagava o registro de `barbeiros` e deixava o `User` (`prestador_de_servico`) órfão. Esse usuário continuava conseguindo fazer login ("Nota para depois" do roadmap). A exclusão física também esbarra no histórico: agendamentos e comandas referenciam o profissional.

Além disso, `users.tenant_id` é nullable (por causa do `super_admin`), e a regra "todo usuário que não é super_admin tem tenant" só existia na aplicação.

O responsável decidiu, em 2026-10-03: **desativar em vez de excluir**, e **garantir no banco** a regra do tenant.

## Decisão

1. **`DELETE /api/professionals/[id]` desativa**: marca `professionals.active = false` e apaga as sessões do usuário, numa transação; responde 204. O registro e o histórico ficam preservados, e o `GET` continua devolvendo o profissional, com `active: false`.
2. **Profissional inativo perde o acesso**:
   - **login bloqueado**: hook `databaseHooks.session.create.before` do Better Auth → 403 com código `ACCOUNT_DISABLED`, traduzido por `authErrorMessage()` para "Seu acesso está desativado. Fale com o administrador da barbearia.";
   - **sessão existente invalidada**: `getCurrentUser()` devolve `null` para um profissional inativo, mesmo que a sessão ainda exista.
   - A regra fica em `web/src/lib/account-status.ts`.
3. **`active` tem um significado só**: "atende e acessa". Desativar pelo `PUT` (`active: false`) tem o mesmo efeito do `DELETE`, inclusive revogar as sessões. Reativar pelo `PUT` (`active: true`) devolve o acesso.
4. **Constraint no banco** `users_tenant_required_check`: `role = 'super_admin' OR tenant_id IS NOT NULL` (migration `*_users_tenant_required_check`, escrita em SQL porque o Prisma não modela `CHECK`; os diffs do Prisma a ignoram).

## Alternativas consideradas

- **Apagar a conta junto** (usuário, sessões e conta de login, bloqueando se houver histórico): limpo, mas impede excluir quem já atendeu, que é a maioria, e perde o vínculo do histórico.
- **Manter a conta (paridade)**: deixa uma pessoa desligada com acesso ao sistema.
- **Flag de acesso separada em `users`** (independente do `professionals.active`): mais flexível, mas com dois estados para manter em sincronia sem necessidade atual.

## Consequências

- Não existe exclusão física de profissional pela API. Telas e relatórios devem distinguir ativos de inativos (a lista traz os dois, com `active`).
- Agendamento com profissional inativo: o legado não bloqueava. Decidir na `TASK-0012` (nota adicionada lá).
- Excluir um tenant que ainda tem usuários agora falha (o `ON DELETE SET NULL` de `users.tenant_id` violaria a constraint). Isso é desejável: um tenant não deve ser apagado com usuários pendurados.
