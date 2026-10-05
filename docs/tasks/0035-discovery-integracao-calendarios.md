---
status: em-andamento
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

- [ ] Comparação e recomendação registradas nas notas desta task (ou num documento em `docs/`, linkado aqui).
- [ ] Resposta sobre a Alexa, com a fonte.
- [ ] ADR, se a recomendação for uma escolha real entre alternativas.
- [ ] Revisão da SPEC-0006 (ou SPEC nova) proposta com os requisitos de implementação, para aprovação do responsável. A implementação **não** começa nesta task.

## Referências

- [SPEC-0006](../specs/SPEC-0006.md)

## Notas de progresso
