---
status: backlog
modulo: web
owner:
criado-em: 2026-10-04
---

# 0026 — Estoque atualizado no select da comanda

**Task ID**: `TASK-0026`

## Objetivo

Corrigir o bug do RF-1 da [SPEC-0002](../specs/SPEC-0002.md). A tela de detalhe da comanda carrega os produtos uma vez só (o `useEffect` com `apiAll` em `order-detail-screen.tsx`) e não os recarrega depois de adicionar ou remover um item. Por isso o "estoque N" do select fica velho. Recarregar a lista junto com o `reload()` da comanda e desabilitar, com a indicação "sem estoque", o produto controlado que chegou a zero.

## Dependências

- Nenhuma.

## Critérios de conclusão

- [ ] Produto com estoque 3: adicionar 2 → o select mostra `estoque 1` sem recarregar a página; adicionar 1 → desabilitado, "sem estoque"; remover → volta a `estoque 1`.
- [ ] Produto com estoque livre (`null`) continua sempre selecionável.
- [ ] Teste de componente ou E2E cobrindo a atualização; `npm test` e `npm run lint` passando.

## Referências

- [SPEC-0002](../specs/SPEC-0002.md) (RF-1)
- `web/src/app/(app)/comandas/[id]/order-detail-screen.tsx`

## Notas de progresso
