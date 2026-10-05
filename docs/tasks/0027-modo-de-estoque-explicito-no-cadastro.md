---
status: em-andamento
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

- [ ] Produto novo abre em "Registrar quantidade"; com a quantidade vazia, a validação recusa com mensagem em pt-BR.
- [ ] "Estoque livre" grava `stockQuantity: null`; editar um produto abre na opção certa.
- [ ] Tabela com "Livre"; os testes de API de produtos e de comandas passam sem alteração.
- [ ] Teste do formulário; `npm test` e `npm run lint` passando; verificado no navegador.

## Referências

- [SPEC-0002](../specs/SPEC-0002.md) (RF-2, RF-3)
- `web/src/app/(app)/produtos/products-screen.tsx`

## Notas de progresso
