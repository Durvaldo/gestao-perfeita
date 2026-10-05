# 0011 — Comandas: estoque nunca negativo, uma comanda por agendamento e trava por comanda

- **Data**: 2026-10-03
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0011`
- **Task relacionada**: `TASK-0014`

## Contexto

Ao portar as comandas (`ComandaController`), três comportamentos do legado podiam causar prejuízo real:

1. **Estoque negativo**: adicionar um produto baixava `estoque_qtd` sem checar o saldo, que podia ficar negativo.
2. **Comanda duplicada**: nada impedia abrir duas comandas para o mesmo agendamento (cobrança dupla), nem abrir comanda de agendamento cancelado.
3. **Corrida no fechamento**: o fechamento checava `status = aberta` e gravava depois, sem trava. Dois fechamentos simultâneos geravam **dois lançamentos de receita**. O mesmo valia para adicionar ou remover itens durante um fechamento.

O responsável decidiu, em 2026-10-03: **bloquear venda sem estoque** e **uma comanda por agendamento**. A trava contra a corrida é uma correção técnica, sem alternativa razoável.

## Decisão

- **Estoque**: produto com controle de estoque (`stock_quantity` não nulo) é baixado com um `UPDATE ... WHERE stock_quantity >= quantidade` atômico. Se nenhuma linha for afetada, a resposta é 422 em `quantity`: "Estoque insuficiente: restam N unidades.". Produto sem controle (`null`) segue ilimitado. Remover um item devolve o estoque.
- **Uma comanda por agendamento**: abrir comanda para um agendamento que já tem comanda **aberta ou paga** → 422 "Este agendamento já tem uma comanda."; para agendamento cancelado → 422 "Não é possível abrir comanda de um agendamento cancelado.". Uma comanda cancelada não conta, e é possível reabrir depois de cancelar. A checagem roda sob `pg_advisory_xact_lock(2, appointment_id)`.
- **Trava por comanda**: adicionar item, remover item e fechar rodam em transação com `pg_advisory_xact_lock(3, order_id)` e reconferem o `status` dentro dela. Há teste com 4 fechamentos simultâneos → 1 sucesso e 1 único lançamento.
- **Fechamento**:
  - recalcula `total_amount`;
  - grava `payment_method` (`cash`/`pix`/`debit_card`/`credit_card`), `status = paid` e **`paid_at`** (a data real de pagamento, usada pelo relatório de comissão, ver ADR-0003);
  - cria o lançamento `income` com categoria **`venda`** (valor de categoria é dado exibido ao usuário, então mantém o texto do legado), descrição `Comanda #<id>` e data = **hoje no fuso da barbearia** (ADR-0009);
  - marca o agendamento vinculado como `completed`.
- Paridade mantida:
  - comanda a partir de agendamento herda cliente e profissional e pré-popula um item por serviço com o `price_at_booking`;
  - comanda avulsa exige cliente e profissional;
  - item de produto usa `products.price` e item de serviço usa `services.price`;
  - o profissional cria comanda para qualquer colega, mas só vê e altera as próprias;
  - não há exclusão de comanda nem endpoint de cancelamento, como no legado;
  - mensagens em pt-BR iguais às do legado.

## Alternativas consideradas

- **Permitir estoque negativo (paridade)**: útil se o estoque cadastrado vive desatualizado, mas esconde ruptura e gera inventário incoerente. Descartada pelo responsável.
- **Unicidade de `appointment_id` no banco**: impediria também reabrir depois de uma comanda cancelada. A checagem com trava é mais flexível.
- **Transação `SERIALIZABLE`** no lugar dos advisory locks: exigiria retries e tratamento de erro de serialização.

## Consequências

- A tela de comanda (`TASK-0015`) precisa exibir as mensagens 422 de estoque e de duplicidade (vêm no `message`).
- O relatório financeiro (`TASK-0016`) deve filtrar comissões por `orders.paid_at`.
- Para cancelar uma comanda aberta, ainda não há endpoint (o legado também não tinha); se for necessário, vira uma task nova.

## Atualização — 2026-10-04 (SPEC-0001)

O item "o profissional cria comanda para qualquer colega" foi superado pela [SPEC-0001](../specs/SPEC-0001.md) (`TASK-0023`): o profissional abre comanda só para si mesmo. Na avulsa, o `professionalId` é preenchido com o dele quando não é enviado, e um colega é recusado com 403. A partir de um agendamento, só se o agendamento for dele.
