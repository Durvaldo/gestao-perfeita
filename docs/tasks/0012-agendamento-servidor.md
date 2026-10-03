---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0012 — Agendamento no servidor

**Task ID**: `TASK-0012`

## Objetivo

Portar com exatidão as regras de agendamento do Laravel:

- `data_hora_fim` = início + soma de `duracao_minutos` dos serviços escolhidos. O preço de cada serviço fica congelado no pivot (`agendamento_servico.preco_no_momento`).
- **Dentro do expediente** (`Agendamento::dentroDoExpediente`): início e fim no mesmo dia, e o intervalo cabe **inteiro** em **um** período de `horarios_trabalho` daquele barbeiro naquele `dia_semana` (sem atravessar o almoço nem a meia-noite). Um barbeiro sem horário no dia não aceita nada.
- **Conflito** (`Agendamento::conflita`): sobreposição (`inicio < fim_outro AND fim > inicio_outro`) com outro agendamento não cancelado do mesmo barbeiro. No update, o próprio registro é ignorado.
- No update, o expediente só é revalidado se barbeiro, início ou fim mudaram: trocar só o status precisa funcionar em agendamentos antigos. O conflito é sempre revalidado.
- Listagem: com `de` + `ate`, devolve a lista completa do período, sem paginação, por **sobreposição** (inclui quem começa antes e invade o período). Sem esses parâmetros, devolve paginado. Filtro opcional por `barbeiro_id`. O prestador só vê a própria agenda: o filtro se soma e nunca vaza dados.
- Status: `pendente` | `confirmado` | `concluido` | `cancelado`. `criado_por_user_id` = usuário atual.
- Mensagens de erro em pt-BR iguais às atuais: `O horário está fora do expediente do barbeiro.` e `Este barbeiro já tem um agendamento nesse horário.`.
- Atenção ao fuso horário: `dia_semana` e horário são comparados no horário local da barbearia. Defina o timezone explicitamente no lado TypeScript e registre em ADR se houver escolha.

## Dependências

- `TASK-0009`

## Critérios de conclusão

- [x] Todas as regras acima implementadas, em transação.
- [x] Testes portando `backend/tests/Feature/Negocio/AgendamentoApiTest.php`, incluindo bordas de expediente (início exatamente na abertura, fim exatamente no fechamento, atravessar o almoço) e conflito com agendamento cancelado sendo ignorado.

## Referências

- [ADR-0008](../decisions/0008-desativar-profissional-e-usuario-com-tenant.md): profissionais agora são desativados em vez de excluídos. O legado não impedia agendar com um barbeiro inativo (`ativo = false`). Decida (perguntando ao usuário, se não estiver claro) se agendamento novo com profissional inativo deve ser recusado.
- Horários: `working_hours.start_time`/`end_time` são `time(0)` (Prisma: `Date` em 1970-01-01 UTC); ver `presentWorkingHour` em `web/src/server/working-hours/working-hours.ts`.
- `backend/app/Http/Controllers/AgendamentoController.php`, `backend/app/Models/Agendamento.php`, `backend/app/Http/Requests/AgendamentoRequest.php`, `backend/app/Policies/AgendamentoPolicy.php`

## Notas de progresso
- 2026-10-03 — Decisões do responsável: recusar agendamento novo com profissional inativo; fuso por barbearia (`tenants.timezone`, padrão `America/Sao_Paulo`). Registradas em [ADR-0009](../decisions/0009-agendamento-fuso-por-tenant-e-regras.md). Implementado `/api/appointments` (`web/src/server/appointments/`) com todas as regras do legado (duração pelos serviços, preço congelado, expediente em um único período, conflito ignorando cancelados, update só de status sem revalidar expediente, listagem por sobreposição sem paginação ou paginada, filtro por profissional combinado com a visibilidade do prestador, só admin exclui, mensagens pt-BR). Melhorias: trava `pg_advisory_xact_lock` por profissional contra agendamento duplo concorrente; preço congelado preservado na edição (o legado repreçava todos os serviços a cada update). Helpers de fuso em `web/src/lib/timezone.ts`. `getCurrentUser()` passou a trazer `tenant { name, timezone }`; o layout do painel usa isso (sem query extra). Migration `*_tenant_timezone`. Verificado: `npm test` (164 testes; 24 novos: 5 de fuso e 19 de agendamento, que portam os 11 do `AgendamentoApiTest` e acrescentam bordas de expediente, encaixe e cancelado sem conflito, fuso perto da meia-noite, preço na edição, profissional inativo, FK de outro tenant, validação, paridade de agendar para colega e concorrência com 5 requisições simultâneas → 1 criada); `npx tsc --noEmit`, `npm run lint`, `npm run build`; teste HTTP no dev server (criar com 10:00 local → 13:00Z, conflito 422, sábado sem expediente 422, período, exclusão), com os dados de teste removidos. Gotcha registrado no `web/AGENTS.md`: reiniciar o dev server depois de gerar o client Prisma. Sem commit (nenhum solicitado).
