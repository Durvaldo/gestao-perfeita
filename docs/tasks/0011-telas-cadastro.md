---
status: concluida
modulo: web
owner: Durvaldo Gonçalves Marques
criado-em: 2026-10-03
---

# 0011 — Telas de cadastro: clientes, serviços, produtos e barbeiros

**Task ID**: `TASK-0011`

## Objetivo

Portar as telas `ClientesView`, `ServicosView`, `ProdutosView` e `BarbeirosView` (esta com a gestão de horários por barbeiro), no padrão tabela + modal do frontend atual.

## Dependências

- `TASK-0008`
- `TASK-0009`
- `TASK-0010`

## Critérios de conclusão

- [x] As quatro telas com listar, criar, editar e excluir, paginação e confirmação de exclusão.
- [x] Ações de escrita escondidas ou desabilitadas para `prestador_de_servico`, conforme as permissões de `TASK-0006`.
- [x] Verificado no navegador contra o seed: criar barbeiro com conta vinculada, adicionar/remover horário, editar comissão.

## Referências

- Profissionais (`TASK-0009`): `DELETE` **desativa** (ADR-0008). Na tela, use "Desativar"/"Reativar" em vez de "Excluir" e mostre o status. A criação pede nome, e-mail, senha e comissão; a edição altera só comissão, foto e ativo.
- API pronta (`TASK-0008`): `/api/customers`, `/api/services`, `/api/products` (JSON em camelCase, decimais como `"0.00"`, 422 `{ message, errors }`, 409 ao excluir registro em uso). Tabela de endpoints em `web/AGENTS.md`.
- `frontend/src/views/cadastro/*.vue`, `frontend/src/api/cadastro.js`

## Notas de progresso
- 2026-10-03 — Telas de Clientes, Serviços, Produtos e Barbeiros (`web/src/app/(app)/{clientes,servicos,produtos,barbeiros}/`), no padrão tabela + modal do legado, com paginação, confirmação de exclusão, toasts, erros do 422 por campo e preço/comissão no formato brasileiro (`DecimalInput`). Barbeiros: criar (com conta de login), editar comissão, **Desativar/Reativar** no lugar de excluir (ADR-0008) e diálogo de horários (manhã + tarde por dia, como no legado; editável pelo admin ou pelo próprio barbeiro, somente leitura para os demais). Infraestrutura compartilhada: `web/src/lib/api-client.ts` e `web/src/components/crud/` (`usePaginated`, `PageHeader`, `FormField`, `FormError`, `TableState`, `PaginationBar`); componentes shadcn table, switch, select, textarea e skeleton. Ajuste exigido pelo lint do React 19 (`set-state-in-effect`): o estado de "carregando" passou a ser derivado da chave da requisição, e o estado só é atualizado no retorno assíncrono. Verificado no Chrome: profissional (carlos) vê as listas sem ações de escrita, edita os próprios horários (adicionou e removeu sábado com manhã + tarde) e vê os do colega somente leitura; admin em Serviços: 422 com mensagem geral e por campo, criar com preço "32,50" → R$ 32,50, excluir com confirmação; Barbeiros: criar "Barbeiro Teste UI", desativar (confirmação → Inativo → botão Reativar) e reativar; Clientes: editar telefone e excluir cliente com comanda → toast 409 em pt-BR, cliente mantido; Produtos: criar com estoque vazio → "Sem controle" e excluir. A criação de barbeiro parecia não enviar; a investigação mostrou que era o clique da automação que não acertava o botão do rodapé (o `element.click()` funcionou na primeira tentativa). Lições de automação registradas no `web/AGENTS.md` (aba oculta trava as animações do Radix; credenciais salvas do Chrome não devem ser usadas). Dados de teste removidos do `agenda_web` (voltou às contagens do seed). `npm test` (168; 4 novos do `api-client`), `npx tsc --noEmit`, `npm run lint`, `npm run build`. Sem commit (nenhum solicitado).
