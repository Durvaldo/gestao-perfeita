# Specs (`docs/specs/`)

Camada entre o escopo ([`SCOPE.md`](../SCOPE.md), roadmap e plano de melhorias) e as tasks ([`tasks/`](../tasks/)): cada SPEC
transforma uma demanda em requisitos verificáveis (`RF-N`, cada um com o seu aceite) e separa o que está decidido do que
ainda está em aberto. O fluxo SCOPE → SPEC → TASK → ADR está em [`docs/AGENTS.md`](../AGENTS.md).

- Um arquivo por SPEC: `SPEC-NNNN.md`, numeração sequencial; o identificador é `SPEC-NNNN`. Modelo: [`SPEC-0000-template.md`](SPEC-0000-template.md).
- **Status**: `rascunho` (ainda não revisada pelo responsável) → `aprovada` (pode virar tasks) → `em-implementação` → `implementada` (ou `implementada em parte`, dizendo o que ficou para depois), ou `superada por SPEC-NNNN`.
- Só gere tasks de uma SPEC `aprovada`. Questões em aberto marcadas como **(hipótese)** viram tasks de avaliação, nunca de "implementação definitiva".

## Índice

Criadas em 2026-10-04 a partir das anotações do responsável sobre o sistema; decisões em aberto respondidas em 2026-10-04/05 (seção "Decisões do responsável" de cada SPEC).

| SPEC | Título | Status | Tasks |
|---|---|---|---|
| [SPEC-0001](SPEC-0001.md) | Visão do profissional restrita ao próprio trabalho | implementada | `TASK-0022`, `0023`, `0024`, `0025` |
| [SPEC-0002](SPEC-0002.md) | Estoque: quantidade atualizada na comanda e modo de estoque explícito | implementada | `TASK-0026`, `0027` |
| [SPEC-0003](SPEC-0003.md) | Agenda: sem agendamento retroativo e atendimento concluído no dashboard | implementada | `TASK-0028`, `0029` |
| [SPEC-0004](SPEC-0004.md) | Exceções da agenda e replanejamento dos agendamentos afetados | implementada (Q5 sem o que checar, ver nota) | `TASK-0030`, `0031`, `0032` |
| [SPEC-0005](SPEC-0005.md) | Telefones só com dígitos, exibidos com máscara | implementada | `TASK-0033`, `0034` |
| [SPEC-0006](SPEC-0006.md) | Integração com Google Agenda e Alexa | implementada em parte (RF-2c depois da Fase 4) | `TASK-0035`, `0041`, `0042` |
| [SPEC-0007](SPEC-0007.md) | Site da barbearia a partir de um template | implementada | `TASK-0036`, `0037`, `0038` |
| [SPEC-0008](SPEC-0008.md) | Módulo de WhatsApp | implementada em parte (nível 2 adiado) | `TASK-0039`, `0040` (adiada) |

## O que ficou para depois

| O quê | Onde | Depende de |
|---|---|---|
| WhatsApp com envio automático | `TASK-0040` (adiada), SPEC-0008 Q1–Q4 | o responsável escolher provedor e número |
| Google Agenda em tempo real e Alexa | SPEC-0006 RF-2c | deploy em produção (Fase 4) e app OAuth verificado no Google |
| Aviso ao transferir para quem não faz o serviço | SPEC-0004 Q5 | existir um cadastro de serviços por barbeiro (nova SPEC) |
| Exceções recorrentes ("não atendo às segundas de manhã") | SPEC-0004 Q4 | decisão de priorizar |
| Armazenamento de imagens validado com o Google Drive real | `TASK-0036`, [`ARMAZENAMENTO_GOOGLE_DRIVE.md`](../ARMAZENAMENTO_GOOGLE_DRIVE.md) | credenciais da conta Google da plataforma |
