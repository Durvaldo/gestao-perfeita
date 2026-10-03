---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0014 — Comandas no servidor

**Task ID**: `TASK-0014`

## Objetivo

Portar o fluxo de comanda/venda, todo em transação:

- **Abrir**: a partir de um agendamento (herda cliente e barbeiro e pré-popula um item de serviço para cada serviço do agendamento, com `preco_no_momento`) ou avulsa (cliente e barbeiro informados).
- **Adicionar item** (só com a comanda `aberta`): produto usa `produtos.preco` e decrementa `estoque_qtd` quando ele não é nulo; serviço usa `servicos.preco`. `preco_total = preco_unitario × quantidade`, com quantidade padrão 1.
- **Remover item** (só com a comanda `aberta`; o item precisa pertencer à comanda, senão 404): devolve o estoque do produto quando houver controle.
- **Fechar** (só com a comanda `aberta` e ao menos 1 item):
  - recalcula `valor_total`;
  - grava `forma_pagamento` (`dinheiro` | `pix` | `cartao_debito` | `cartao_credito`) e marca `status = paga`;
  - cria um lançamento financeiro `receita`/`venda`, com descrição `Comanda #<id>` e data de hoje;
  - marca o agendamento vinculado como `concluido`.
- `valor_total` é sempre a soma de `comanda_itens.preco_total`.
- Listagem paginada, mais recentes primeiro; o prestador vê só as próprias.

## Dependências

- `TASK-0012`

## Critérios de conclusão

- [x] Regras acima, com as mesmas mensagens em pt-BR (`Esta comanda já foi fechada.` e `Adicione ao menos um item antes de fechar a comanda.`).
- [x] Testes portando `backend/tests/Feature/Negocio/ComandaApiTest.php`, incluindo o estoque depois de adicionar/remover e o lançamento gerado no fechamento.

## Referências

- [ADR-0003](../decisions/0003-camada-de-dados-prisma-schema-em-ingles.md): no schema novo a comanda é `Order`/`OrderItem`, e o fechamento deve preencher a coluna nova `orders.paid_at`.
- `backend/app/Http/Controllers/ComandaController.php`, `backend/app/Http/Requests/Comanda*.php`, `backend/app/Policies/ComandaPolicy.php`

## Notas de progresso
- 2026-10-03 — Decisões do responsável: bloquear venda sem estoque e uma comanda por agendamento (também sem comanda de agendamento cancelado). Registradas em [ADR-0011](../decisions/0011-comandas-estoque-e-duplicidade.md), junto com a trava por comanda (advisory lock), que corrige a corrida do legado em que dois fechamentos simultâneos geravam dois lançamentos. Implementado `/api/orders` (`web/src/server/orders/orders.ts`): abrir avulsa ou de agendamento (itens com o preço congelado), adicionar/remover item com estoque atômico, fechar (`paid`, `paidAt`, lançamento `income`/`venda` com data no fuso da barbearia, agendamento `completed`), listagem paginada com visibilidade do profissional, mensagens pt-BR do legado. Verificado: `npm test` (180; 12 novos em `orders.test.ts`, que portam os 4 do `ComandaApiTest` e acrescentam agendamento → `completed`, item de outra comanda 404, remoção em comanda fechada 422, estoque insuficiente e estoque ilimitado, duplicidade e cancelado, 4 fechamentos simultâneos → 1 lançamento, validações, FK de outro tenant, profissional nas próprias comandas e isolamento por tenant); `npx tsc --noEmit`, `npm run lint`, `npm run build`; teste HTTP no dev server (abrir, item, fechar → lançamento `income|venda|59.80`, estoque 30 → 28), com os dados de teste removidos. Sem commit (nenhum solicitado).
