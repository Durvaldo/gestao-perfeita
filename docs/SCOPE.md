# Escopo e direção do projeto

> Mantido pelo usuário/time; agentes devem **ler** este arquivo antes de decisões que afetem arquitetura ou priorização, mas só **editá-lo** quando o usuário pedir explicitamente uma mudança de escopo/direção — diferente do registro de decisões técnicas em [`docs/decisions/`](decisions/), que é de responsabilidade do agente.

> ⚠️ Rascunho inicial gerado a partir dos documentos já existentes em `docs/` e do pedido de migração para Next.js (2026-10-03). Revise e ajuste.

## Escopo atual

SaaS multi-tenant de gestão de agenda para barbearias (ver [`ESPECIFICACAO.md`](ESPECIFICACAO.md)). Hoje implementado como Laravel (API) + Vue 3 (SPA), com as Fases 1–3 do [`ROADMAP_IMPLEMENTACAO.md`](ROADMAP_IMPLEMENTACAO.md) concluídas: multi-tenancy, cadastros (clientes, barbeiros e horários, serviços, produtos), agendamento, comanda/venda, financeiro e dashboard.

## Direção futura (roadmap)

1. **Migração da stack para Next.js full-stack** (sai o Laravel e o Vue): app nova em `web/`, construída em paralelo até atingir paridade com o sistema atual, e então o corte. Ver [ADR-0001](decisions/0001-migracao-full-stack-nextjs.md) e as tasks `TASK-0001`…`TASK-0019` em [`tasks/`](tasks/).
2. Depois da migração: Fase 4 do roadmap original (notificações e deploy) e os blocos de [`PLANO_MELHORIAS_BENCHMARK.md`](PLANO_MELHORIAS_BENCHMARK.md) (página pública de agendamento, fundação multi-setor etc.) — _ordem relativa à migração a definir_.

## Fora de escopo

- Durante a migração: features novas que não existem no sistema atual (a migração busca **paridade**, não evolução de produto).
- _Demais itens a definir._
