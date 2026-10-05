# 0012 — Exceções da agenda: representação em `schedule_blocks` e checagem na regra de agendamento

- **Data**: 2026-10-04
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0012`
- **Task relacionada**: `TASK-0030`

## Contexto

A [SPEC-0004](../specs/SPEC-0004.md) pede exceções da agenda: a barbearia inteira ou um profissional fechados por dias inteiros ou por uma faixa de horário dentro de um dia. A agenda deve recusá-las, e os agendamentos já marcados no período precisam aparecer como "precisa de ação" (decisão Q1 do responsável). A tabela `schedule_blocks` já existia (tenant, `professional_id` nulo = barbearia inteira, `starts_at`, `ends_at`, `reason`), sem API. A SPEC não diz como representar "dia inteiro" nem onde a checagem deve ficar.

## Decisão

- **Sem mudança de schema.** O dia inteiro é gravado como instantes UTC que vão da meia-noite local do primeiro dia à meia-noite local do dia seguinte ao último, no fuso da barbearia ([ADR-0009](0009-agendamento-fuso-por-tenant-e-regras.md)). A API recebe `allDay` + `startDate`/`endDate` (dias inclusivos) ou `startsAt`/`endsAt` (mesmo dia). Na resposta, `allDay` é derivado: os dois limites caem na meia-noite local.
- **"Precisa de ação" é calculado, não gravado.** Um agendamento não cancelado que sobrepõe uma exceção que se aplica a ele está afetado. O `POST`, o `GET` e o `PUT` de uma exceção devolvem `affectedAppointments`. Resolver (remarcar, transferir ou cancelar) tira o agendamento da sobreposição, e a marca some sozinha.
- **Checagem dentro de `resolveSchedule`** (`web/src/server/appointments/appointments.ts`), depois do expediente, com `findBlockingException` em `rules.ts`: vale para criar e para remarcar, inclusive pelo admin, e não vale para a atualização só de status. Assim dá para cancelar um agendamento pego por uma exceção nova. A ordem das recusas fica: passado → profissional inativo → expediente → exceção → conflito.
- **Permissões** (`scheduleBlock` em `policies.ts`): toda a equipe vê as exceções da barbearia; o profissional vê e gerencia só as dele, sem aprovação (Q2); só o admin cria, altera ou exclui exceção da barbearia inteira, e mudar o alvo é checado como criar.

## Alternativas consideradas

- **Coluna `all_day` (ou `date` separado)**: mais explícita, mas duplica o que os instantes já dizem e exige migration; derivar da meia-noite local é exato, porque o fuso é da barbearia.
- **Coluna/estado "precisa de ação" no agendamento**: precisaria ser mantida em sincronia a cada criação, edição e exclusão de exceção, e de agendamento. Calcular pela sobreposição não tem como ficar desatualizado.
- **Checar a exceção dentro da transação com o lock do profissional**: fecharia a corrida rara entre criar uma exceção e um agendamento no mesmo instante. Não foi feito porque a exceção não pega o lock do profissional (a da barbearia inteira afetaria todos), e o efeito da corrida é só um agendamento que já nasce marcado como "precisa de ação", visível e resolvível.

## Consequências

- A tela de exceções e as faixas no calendário (`TASK-0031`) e a resolução dos afetados (`TASK-0032`) usam `GET /api/schedule-blocks` e `affectedAppointments`.
- A página pública de agendamento (futura) deve usar a mesma checagem (`findBlockingException`) para esconder horários.
- Exceções recorrentes (Q4) ficam para depois; quando entrarem, vão precisar de outra representação.
