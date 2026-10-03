---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0009 — Barbeiros e horários de trabalho no servidor

**Task ID**: `TASK-0009`

## Objetivo

Portar o cadastro de barbeiros e de horários de trabalho:

- Criar um barbeiro cria, **na mesma transação**, um `User` com `tipo = prestador_de_servico` e o `tenant_id` atual, e o `Barbeiro` vinculado (`comissao_percentual_padrao`, `foto_url`, `ativo`). A atualização mexe só nos campos do barbeiro.
- Horários: listar por barbeiro (ordenado por `dia_semana`), criar em `barbeiros/{id}/horarios-trabalho` e editar/excluir pelo ID do horário (rotas "shallow").
- Comportamento herdado conhecido: excluir um barbeiro deixa órfão o `User` vinculado (ver "Nota para depois" em [`ROADMAP_IMPLEMENTACAO.md`](../ROADMAP_IMPLEMENTACAO.md)). Pergunte ao usuário se a migração corrige isso ou mantém a paridade, e registre a resposta nesta task.

## Dependências

- `TASK-0007`

## Critérios de conclusão

- [x] Criação transacional de User + Barbeiro: se o barbeiro falhar, o user não fica no banco.
- [x] O prestador gerencia só os próprios horários; `admin` gerencia todos.
- [x] Testes portando `backend/tests/Feature/Cadastro/{BarbeiroApiTest,HorarioTrabalhoApiTest}.php`.

## Referências

- [ADR-0007](../decisions/0007-convencoes-camada-servidor.md): siga `apiRoute` + `parseBody` + `authorize` + `assertReferencesInTenant` + `paginate` (exemplo em `web/src/server/http/__tests__/api-stack.test.ts`); serviços em `web/src/server/<domínio>/`.
- [ADR-0004](../decisions/0004-autenticacao-better-auth.md): criar o profissional também cria a conta `credential` em `accounts` (senha com `hashPassword`), na mesma transação.
- [ADR-0003](../decisions/0003-camada-de-dados-prisma-schema-em-ingles.md): `Barbeiro` vira `Professional` no schema novo (tabelas `professionals`/`working_hours`; papel `professional`).
- `backend/app/Http/Controllers/{Barbeiro,HorarioTrabalho}Controller.php`, `backend/app/Http/Requests/{Barbeiro,HorarioTrabalho}Request.php`, `backend/app/Policies/HorarioTrabalhoPolicy.php`

## Notas de progresso
- 2026-10-03 — Decisões do responsável: um usuário pertence a uma empresa (exceto super_admin), agora também garantido por constraint no banco (`users_tenant_required_check`); "excluir" profissional **desativa** (pergunta da nota "usuário órfão" respondida). Registradas em [ADR-0008](../decisions/0008-desativar-profissional-e-usuario-com-tenant.md). Implementados `/api/professionals` (criação transacional User + Account `credential` + Professional; e-mail único → 422; update só do perfil, como no legado; DELETE e `PUT active:false` desativam, bloqueiam login e revogam sessões; `PUT active:true` reativa) e `/api/professionals/[id]/working-hours` + `/api/working-hours/[id]` (`"HH:MM"`, término depois do início, o profissional só nos próprios, isolamento por tenant inclusive por ID, fechando a brecha do legado). Login bloqueado via `databaseHooks.session.create.before` (código `ACCOUNT_DISABLED`, mensagem pt-BR); `getCurrentUser()` ignora sessão de profissional inativo. Verificado: `npm test` (132 testes; 13 novos em `professionals.test.ts` e `working-hours.test.ts`, que portam `BarbeiroApiTest` e `HorarioTrabalhoApiTest` e acrescentam atomicidade da criação, desativação/reativação com login e sessão, validações e acesso cross-tenant por ID); `npx tsc --noEmit`, `npm run lint`, `npm run build`; teste HTTP no dev server (criar profissional, horário, login, desativar → sessão antiga 401 e novo login 403). Os dados desse teste foram removidos do `agenda_web`. Sem commit (nenhum solicitado).
