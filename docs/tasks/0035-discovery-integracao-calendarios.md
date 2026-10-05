---
status: concluida
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0035 — Discovery: integração da agenda com Google Agenda e Alexa

**Task ID**: `TASK-0035`

## Objetivo

Executar o RF-1 da [SPEC-0006](../specs/SPEC-0006.md). Esta é uma task de **avaliação**, não de implementação definitiva. Comparar as três alternativas (link "Adicionar ao Google Agenda", feed ICS por profissional e sincronização pela Google Calendar API) em custo de implementação, custo de operação, configuração pelo usuário e riscos. Verificar se a Alexa lê o calendário que a alternativa recomendada produz, em especial calendários assinados por URL.

A hipótese a avaliar (Q1 da SPEC) é que o feed ICS resolve o caso principal sem OAuth.

## Dependências

- Nenhuma.

## Critérios de conclusão

- [x] Comparação e recomendação registradas nas notas desta task (ou num documento em `docs/`, linkado aqui).
- [x] Resposta sobre a Alexa, com a fonte.
- [x] ADR, se a recomendação for uma escolha real entre alternativas (não se aplica: a escolha é do responsável e ainda não foi tomada; quando for, a decisão técnica da implementação vira ADR).
- [x] Revisão da SPEC-0006 (ou SPEC nova) proposta com os requisitos de implementação, para aprovação do responsável. A implementação **não** começa nesta task.

## Referências

- [SPEC-0006](../specs/SPEC-0006.md)

## Notas de progresso
- 2026-10-04 — Discovery concluído: [`docs/DISCOVERY_CALENDARIOS_EXTERNOS.md`](../DISCOVERY_CALENDARIOS_EXTERNOS.md), com as fontes. Resultados: (1) feed ICS funciona bem no Apple Calendar (~15 min), mas o Google Agenda atualiza calendário assinado só a cada 12–24 h, sem forçar; (2) **a Alexa não lê calendários assinados por URL**, só os das contas vinculadas, então o ICS não resolve a Alexa; (3) Google em tempo real e Alexa exigem a Google Calendar API com OAuth (escopo mínimo `calendar.app.created`, app verificado pelo Google, domínio em produção). A hipótese Q1 se confirmou só em parte. Recomendação: link "Adicionar ao Google Agenda" e feed ICS agora; sincronização via API depois da Fase 4, se houver demanda. A proposta de RF-2 foi anexada à SPEC-0006, aguardando aprovação. Sem ADR: nenhuma escolha técnica foi tomada, a decisão é de produto. A implementação não começou, como a task prevê.
