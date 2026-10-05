# 0006 — Autorização por papel com policies em funções puras

- **Data**: 2026-10-03
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0006`
- **Task relacionada**: `TASK-0006`

## Contexto

O legado autoriza com Policies do Laravel (`backend/app/Policies/*`), chamadas pelos controllers (`$this->authorize()`) e pelos `authorize()` dos Form Requests, e devolve mensagens 401/403/404 em pt-BR reescritas em `bootstrap/app.php`. A `TASK-0006` precisava de um mecanismo central equivalente no `web/`.

## Decisão

- **Policies como funções puras** em `web/src/lib/authz/policies.ts`. Cada recurso (`customer`, `service`, `product`, `professional`, `workingHour`, `appointment`, `order`, `financialEntry`, `dashboard`) mapeia ações para regras `(actor, subject?) => boolean`, sem acesso a banco. O `actor` é o retorno de `getCurrentUser()` (`role` + `professional`).
- **API**:
  - `can(actor, resource, action, subject?)`: tipado; regras de dono exigem o registro em tempo de compilação.
  - `authorize(...)`: lança `ForbiddenError`, 403 (`web/src/lib/authz/guard.ts`).
  - `requireUser(user)`: lança `UnauthenticatedError`, 401.
  - `visibleToActor(actor)`: o `where` que limita listagens aos registros do próprio profissional, equivalente ao `whereHas('barbeiro', user_id)` dos `index` do legado.
- **Regra de dono**: comparar `subject.professionalId` com `actor.professional.id`, equivalente a `$model->barbeiro->user_id === $user->id`, sem query extra.
- **Erros HTTP** em `web/src/lib/http-errors.ts`: `UnauthenticatedError` / `ForbiddenError` / `NotFoundError`, com as mensagens do legado (`Não autenticado.`, `Esta ação não é autorizada.`, `Registro não encontrado.`). `errorResponse(error)` converte essas classes e também o `P2025` do Prisma (registro não encontrado no update/delete, que é o que um registro de outro tenant produz, ver ADR-0005) em JSON com o status certo; qualquer outro erro é relançado.
- **Paridade mantida de propósito**:
  - `super_admin` e `customer` não têm nenhuma permissão no painel.
  - O profissional pode **criar** agendamento e comanda para qualquer profissional do tenant (a policy `create` do legado não restringe), mas só vê e edita os próprios.
  - Excluir agendamento é só para `admin`.
  - Comanda não tem `delete`, porque o legado não tem essa rota.

## Alternativas consideradas

- **Biblioteca de ACL (ex.: CASL)**: expressiva, mas pesada para uma matriz pequena e estável. As funções puras são triviais de testar e de ler lado a lado com as Policies do legado.
- **Checagens inline em cada handler**: espalham as regras e facilitam divergências entre telas e endpoints.

## Consequências

- Toda operação de servidor segue a sequência `requireUser(await getCurrentUser())` → `authorize(...)` → query com `db`, que já tem o escopo de tenant. Em listagens de agendamentos e comandas, acrescente `visibleToActor(actor)` ao `where`.
- A UI pode usar `can()` (é isomórfica, sem dependência de servidor) para esconder ações que o usuário não pode fazer. A checagem no servidor continua obrigatória.
- Mudar uma permissão = editar `policies.ts` e a matriz em `src/lib/authz/__tests__/policies.test.ts`, que confere cada recurso × ação × papel e falha se uma policy for adicionada sem entrar na matriz.

## Atualização — 2026-10-04 (SPEC-0001)

Dois pontos de "paridade mantida de propósito" foram superados pela [SPEC-0001](../specs/SPEC-0001.md):

- O profissional **não** cria mais comanda para um colega: a ação nova `order.createFor` (admin ou dono) é checada com o profissional da comanda, tanto na avulsa quanto na aberta a partir de um agendamento (`TASK-0023`).
- `professional.view` e `workingHour.viewAny`/`view` passaram a ser admin ou dono: o profissional só vê o próprio registro e os próprios horários, e a listagem de profissionais usa `visibleProfessionals(actor)` (`TASK-0022`).

- O profissional também **não** agenda mais para um colega nem move um agendamento para a agenda dele: a ação nova `appointment.assignTo` (admin ou dono) é checada no `POST` e no `PUT` (`TASK-0024`, Q1 da SPEC-0001).
