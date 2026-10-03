---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0015 — Telas de comandas

**Task ID**: `TASK-0015`

## Objetivo

Portar `ComandasView.vue` (lista) e `ComandaDetailView.vue` (itens, adicionar serviço ou produto, remover, fechar com forma de pagamento).

## Dependências

- `TASK-0010`
- `TASK-0014`

## Critérios de conclusão

- [x] Paridade com as telas atuais, verificada no navegador: abrir comanda a partir de agendamento, adicionar produto, remover item e fechar.
- [x] Nomes dos itens aparecendo corretamente (bug histórico no Laravel: faltava carregar `itens.servico`/`itens.produto`).

## Referências

- API pronta (`TASK-0014`, [ADR-0011](../decisions/0011-comandas-estoque-e-duplicidade.md)): `/api/orders`, `/api/orders/[id]/items`, `/api/orders/[id]/items/[itemId]`, `/api/orders/[id]/close`. As mensagens 422 de estoque insuficiente, comanda duplicada, agendamento cancelado e comanda já fechada vêm no `message`. Formas de pagamento: `cash`, `pix`, `debit_card`, `credit_card` (rótulos pt-BR na tela).
- `frontend/src/views/negocio/{ComandasView,ComandaDetailView}.vue`

## Notas de progresso
- 2026-10-03 — Telas em `web/src/app/(app)/comandas/`: lista (`orders-screen.tsx`: #, cliente, barbeiro, total, status, paginação; modal "Nova comanda" avulsa com cliente e barbeiro → redireciona para o detalhe) e detalhe `comandas/[id]` (`order-detail-screen.tsx`: itens com nome, tipo, quantidade, unitário e total; adicionar serviço ou produto, este com estoque exibido no select; remover item; fechar com forma de pagamento; comanda paga mostra a forma e a data de pagamento no fuso da barbearia e esconde as ações). Rótulos pt-BR de status e formas de pagamento em `order-labels.ts`. Verificado no Chrome, ponta a ponta: agendamento → "Criar comanda" na Agenda (verifica também o pendente da `TASK-0013`) → `/comandas/3` com o item "Corte | Serviço | 1 | R$ 45,00" (nome visível, sem o bug histórico do Laravel); produto com quantidade 999 → "Estoque insuficiente: restam 20 unidades."; Pomada × 2 → total R$ 124,80; remover → R$ 45,00; fechar no Pix → "Paga", "Pix · pago em 03/10/2026", sem formulários; lista mostra a comanda paga; "Nova comanda" avulsa abre a #4. No banco: lançamento `income|venda|45.00|Comanda #3`, agendamento `completed`, estoque de volta a 20. Dados de teste removidos. `tsc` e `lint` limpos. Sem commit (o responsável vai commitar ao final).
