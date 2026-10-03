# 0009 — Agendamento: fuso horário por barbearia, profissional inativo e trava contra agendamento duplo

- **Data**: 2026-10-03
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0009`
- **Task relacionada**: `TASK-0012`

## Contexto

Ao portar o agendamento (`TASK-0012`), três pontos exigiam decisão:

1. **Fuso horário.** O Laravel roda em `UTC` (`config/app.php`) e o frontend envia horários sem fuso (`2030-01-10T10:00`). Na prática, o horário digitado é tratado como se fosse UTC. Funciona enquanto tudo for "relógio de parede", mas o dia da semana e o expediente são calculados nesse falso UTC, e o sistema não representa instantes reais.
2. **Profissional inativo** (desde a ADR-0008, "excluir" desativa). O legado não impedia agendar com um barbeiro `ativo = false`.
3. **Corrida**: o legado checava o conflito e depois gravava, sem trava. Duas requisições simultâneas podiam marcar o mesmo horário.

O responsável decidiu em 2026-10-03: **fuso por barbearia** e **recusar agendamento novo com profissional inativo**.

## Decisão

- **`tenants.timezone`** (IANA, padrão `America/Sao_Paulo`).
  - Os instantes são gravados em UTC.
  - Horários **sem offset** vindos do cliente (o que o `<input type="datetime-local">` envia) são interpretados no fuso da barbearia; com offset (`Z`, `-03:00`), são exatos. Uma data pura vira meia-noite local.
  - O dia da semana e a comparação com o expediente usam o relógio local da barbearia.
  - Helpers sem dependência, baseados em `Intl`, em `web/src/lib/timezone.ts`, com testes que incluem um fuso com horário de verão.
  - O fuso chega à aplicação por `getCurrentUser().tenant.timezone`.
- **Profissional inativo**: criar ou remarcar (mudar profissional ou horário) com profissional inativo → 422 `professionalId` "Este barbeiro está inativo.". Agendamentos existentes continuam podendo ser consultados e ter o status alterado.
- **Trava**: a criação e a edição rodam numa transação que pega `pg_advisory_xact_lock(1, professional_id)` antes de checar conflito e gravar. Isso serializa as escritas na agenda de um mesmo profissional. Há teste com 5 reservas simultâneas: 1 entra e 4 são recusadas.
- **Preço congelado de verdade**: na edição, os serviços mantidos conservam o `priceAtBooking` original e só os novos pegam o preço atual. O legado fazia `sync` com o preço atual de todos os serviços a cada update, inclusive numa simples confirmação de status, o que "descongelava" o preço.
- Regras mantidas do legado (`web/src/server/appointments/`):
  - fim = início + soma das durações;
  - o horário cabe inteiro em **um** período de expediente do dia (não atravessa almoço nem meia-noite);
  - conflito por sobreposição, ignorando cancelados;
  - uma atualização só de status não revalida o expediente, mas o conflito é sempre revalidado;
  - listagem com `from`/`to` devolve a lista completa por sobreposição (sem paginação); sem eles, devolve paginado;
  - o profissional vê só a própria agenda, com filtro combinado por AND;
  - o profissional pode criar agendamento para um colega;
  - só o admin exclui;
  - mensagens em pt-BR iguais às do legado.

## Alternativas consideradas

- **`America/Sao_Paulo` fixo**: mais simples, mas o Brasil tem quatro fusos (Manaus, Cuiabá, Rio Branco...), e mudar isso depois exigiria migrar dados.
- **Sem fuso (paridade)**: mantém a ambiguidade do legado e erra o dia da semana perto da meia-noite em qualquer conversão futura.
- **Transação `SERIALIZABLE`** em vez de advisory lock: também resolveria a corrida, mas com retries e erros de serialização a tratar. O lock por profissional é simples e localizado.

## Consequências

- As telas (`TASK-0013`) devem exibir os horários no fuso da barbearia (`timeZone: user.tenant.timezone` no `Intl`), e não no fuso do navegador. Para enviar, um `datetime-local` "cru" é o formato natural.
- Relatórios por período (`TASK-0016`/`0017`) devem montar os limites de "dia" e "mês" no fuso da barbearia (`parseDateTimeInput` / `zonedToUtc`).
- Ainda não há tela para editar `tenants.timezone`; o padrão atende o seed. Entra junto com as configurações da barbearia.
