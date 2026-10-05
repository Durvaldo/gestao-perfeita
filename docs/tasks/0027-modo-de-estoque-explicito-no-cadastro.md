---
status: concluida
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0027 — Modo de estoque explícito no cadastro de produto

**Task ID**: `TASK-0027`

## Objetivo

Implementar o RF-2 e o RF-3 da [SPEC-0002](../specs/SPEC-0002.md):

- o formulário de produto troca "Estoque (vazio = sem controle)" pela escolha entre **Registrar quantidade** (quantidade obrigatória, ≥ 0) e **Estoque livre**;
- a tabela mostra "Livre" no lugar de "Sem controle";
- a API não muda: `null` continua significando estoque livre.

## Dependências

- Nenhuma.

## Critérios de conclusão

- [x] Produto novo abre em "Registrar quantidade"; com a quantidade vazia, a validação recusa com mensagem em pt-BR.
- [x] "Estoque livre" grava `stockQuantity: null`; editar um produto abre na opção certa.
- [x] Tabela com "Livre"; os testes de API de produtos e de comandas passam sem alteração.
- [x] Teste do formulário; `npm test` e `npm run lint` passando; verificado no navegador.

## Referências

- [SPEC-0002](../specs/SPEC-0002.md) (RF-2, RF-3)
- `web/src/app/(app)/produtos/products-screen.tsx`

## Notas de progresso
- 2026-10-04 — Implementado. O formulário de produto troca o campo "Estoque (vazio = sem controle)" por duas opções de rádio, **Registrar quantidade** (padrão em produto novo, mostra "Quantidade em estoque") e **Estoque livre** (esconde a quantidade). Sem quantidade em "Registrar quantidade", o formulário recusa antes de enviar: "Informe a quantidade em estoque ou escolha estoque livre.". A tabela mostra "Livre". A regra ficou em `produtos/product-form.ts` (`productToForm`, `productFormToBody`), com testes unitários. A API não mudou (os testes de API passaram sem alteração). A verificação no navegador foi feita por um E2E novo (criar com estoque livre, recusa sem quantidade, edição abre no modo certo). Verificado: `npm test`, `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (5).
