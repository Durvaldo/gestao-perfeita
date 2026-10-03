---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0006 — Autorização por papel (equivalente às Policies)

**Task ID**: `TASK-0006`

## Objetivo

Portar a matriz de permissões das Policies do Laravel para um mecanismo central de autorização no `web/`, aplicado em toda operação de servidor. Os papéis vêm de `users.tipo`: `super_admin`, `admin`, `prestador_de_servico`, `cliente`.

Matriz atual (confira arquivo a arquivo em `backend/app/Policies/`):

- Clientes / Serviços / Produtos / Barbeiros: `admin` faz CRUD completo; `prestador_de_servico` só lê.
- Horários de trabalho: `admin` faz tudo; o prestador lê e cria/edita/exclui **só os próprios** (`barbeiro.user_id === user.id`).
- Agendamentos: `admin` faz tudo; o prestador vê e edita só os da própria agenda; só `admin` exclui.
- Comandas: `admin` e prestador criam; o prestador só vê e edita as próprias.
- Financeiro (lançamentos e relatório): só `admin`.
- Dashboard: mesma regra do `viewAny` de Comanda.

Respostas de erro em pt-BR, como em `bootstrap/app.php`: 401 `Não autenticado.`, 403 `Esta ação não é autorizada.`, 404 `Registro não encontrado.`.

## Dependências

- `TASK-0005`

## Critérios de conclusão

- [x] Módulo único de autorização, com testes por papel × ação.
- [x] Mensagens 401/403/404 em pt-BR, conforme acima.

## Referências

- `backend/app/Policies/*` e `backend/app/Http/Requests/*` (vários Form Requests autorizam em `authorize()`)
- `backend/bootstrap/app.php`

## Notas de progresso
- 2026-10-03 — Matriz portada de `backend/app/Policies/*` e dos `authorize()` dos Form Requests para `web/src/lib/authz/policies.ts` (funções puras, `can` tipado, em que regras de dono exigem o registro em tempo de compilação, e `visibleToActor` para listagens) + `guard.ts` (`requireUser` 401, `authorize` 403) + `web/src/lib/http-errors.ts` (mensagens pt-BR do legado; `errorResponse` também mapeia o `P2025` do Prisma → 404). Decisão em [ADR-0006](../decisions/0006-autorizacao-policies-funcoes-puras.md). Paridade mantida e documentada: `super_admin`/`customer` sem permissão no painel; profissional cria agendamento e comanda para qualquer profissional, mas só vê e edita os próprios. `GET /api/user` passou a usar `requireUser` + `errorResponse`. Verificado: `npm test` (80 testes; 48 novos: matriz completa recurso × ação × papel, com dono/não dono/profissional sem registro, checagem de que a matriz cobre todas as policies, tipagem com `@ts-expect-error`, guards e mapeamento de erros), `npx tsc --noEmit`, `npm run lint`, `npm run build`; `/api/user` sem sessão → 401 `Não autenticado.` no dev server. Sem commit (nenhum solicitado).
