# Specs (`docs/specs/`)

Camada entre o escopo ([`SCOPE.md`](../SCOPE.md), roadmap e plano de melhorias) e as tasks ([`tasks/`](../tasks/)): cada SPEC
transforma uma demanda em requisitos verificáveis (`RF-N`, cada um com o seu aceite) e separa o que está decidido do que
ainda está em aberto. O fluxo SCOPE → SPEC → TASK → ADR está em [`docs/AGENTS.md`](../AGENTS.md).

- Um arquivo por SPEC: `SPEC-NNNN.md`, numeração sequencial; o identificador é `SPEC-NNNN`. Modelo: [`SPEC-0000-template.md`](SPEC-0000-template.md).
- **Status**: `rascunho` (ainda não revisada pelo responsável) → `aprovada` (pode virar tasks) → `em-implementação` → `implementada`, ou `superada por SPEC-NNNN`.
- Só gere tasks de uma SPEC `aprovada`. Questões em aberto marcadas como **(hipótese)** viram tasks de avaliação, nunca de "implementação definitiva".

## Índice

Todas criadas em 2026-10-04, a partir das anotações do responsável sobre o sistema.

| SPEC | Título | Tipo | Status | Depende de | Tasks |
|---|---|---|---|---|---|
| [SPEC-0001](SPEC-0001.md) | Visão do profissional restrita ao próprio trabalho | Permissões | aprovada | — | `TASK-0022`, `0023`, `0024`*, `0025`* |
| [SPEC-0002](SPEC-0002.md) | Estoque: quantidade atualizada na comanda e modo de estoque explícito | Bug + UX | aprovada | — | `TASK-0026`, `0027` |
| [SPEC-0003](SPEC-0003.md) | Agenda: sem agendamento retroativo e atendimento concluído no dashboard | Regra + bug | aprovada | — | `TASK-0028`, `0029` |
| [SPEC-0004](SPEC-0004.md) | Exceções da agenda e replanejamento dos agendamentos afetados | Feature | aprovada, com questões em aberto | SPEC-0003 | `TASK-0030`*, `0031`, `0032`* |
| [SPEC-0005](SPEC-0005.md) | Telefones só com dígitos, exibidos com máscara | Dados + UX | aprovada | — | `TASK-0033`*, `0034` |
| [SPEC-0006](SPEC-0006.md) | Integração com Google Agenda e Alexa | Discovery + feature | aprovada | — | `TASK-0035`, `0041`, `0042` |
| [SPEC-0007](SPEC-0007.md) | Site da barbearia a partir de um template | Feature | aprovada | SPEC-0005 (RF-3) | `TASK-0036`, `0037`, `0038` |
| [SPEC-0008](SPEC-0008.md) | Módulo de WhatsApp | Feature | aprovada | SPEC-0005 | `TASK-0039`, `0040`* |

\* Task `bloqueada` aguardando uma decisão do responsável sobre uma questão em aberto da SPEC. A pergunta está escrita na própria task.

### Decisões pendentes que destravam tasks

| Decisão | SPEC | Destrava |
|---|---|---|
| Profissional agenda só na própria agenda? | SPEC-0001 Q1 | `TASK-0024` |
| O que o profissional vê no dashboard? | SPEC-0001 Q2 | `TASK-0025` |
| O profissional registra a própria exceção? | SPEC-0004 Q2 | `TASK-0030` → `0031` → `0032` |
| Salvar com pendências, ação em lote, transferência sem o serviço | SPEC-0004 Q1, Q3, Q5 | `TASK-0032` |
| Telefone com ou sem o `55` | SPEC-0005 Q1 | `TASK-0033` → `0034` → `0037`, `0039` |
| Provedor, número, plano e consentimento do WhatsApp | SPEC-0008 Q1–Q4 | `TASK-0040` |

## Ordem sugerida

1. **Correções rápidas, sem questões bloqueantes**: SPEC-0002 e SPEC-0005, depois SPEC-0003 e SPEC-0001 (que têm questões de produto pequenas).
2. **SPEC-0004**, depois de responder às questões em aberto dela.
3. **SPEC-0008, Nível 1** (links `wa.me`, sem provedor), que aproveita a SPEC-0005 e a SPEC-0004.
4. **SPEC-0007** e o discovery da **SPEC-0006**.
5. **SPEC-0008, Nível 2**, depois da escolha do provedor.

A ordem é uma sugestão. A prioridade é do responsável (ver [`SCOPE.md`](../SCOPE.md)).
