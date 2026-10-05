---
status: em-andamento
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0039 — WhatsApp nível 1: modelos de mensagem e botões `wa.me`

**Task ID**: `TASK-0039`

## Objetivo

Implementar o RF-1 e o RF-2 da [SPEC-0008](../specs/SPEC-0008.md), sem nenhum provedor externo:

- modelos de mensagem editáveis por barbearia, com variáveis (`{cliente}`, `{barbearia}`, `{profissional}`, `{data}`, `{hora}`, `{servicos}`) e textos padrão em pt-BR;
- botões que abrem `https://wa.me/55{telefone}?text=...`: na lista e no detalhe de clientes (conversa livre) e no agendamento ("confirmar" e "lembrar").

O botão para os agendamentos afetados por uma exceção entra na `TASK-0032`.

## Dependências

- `TASK-0034` (telefone normalizado e formatado).

## Critérios de conclusão

- [ ] Teste unitário da interpolação, com datas no fuso da barbearia, e da montagem da URL (telefone e texto codificado).
- [ ] Tela de modelos (só admin), com persistência por tenant e testes de API.
- [ ] Botões nas telas de clientes e de agenda; cliente sem telefone válido não mostra o botão.
- [ ] `npm test` e `npm run lint` passando; verificado no navegador.

## Referências

- [SPEC-0008](../specs/SPEC-0008.md) (RF-1, RF-2)
- [ADR-0009](../decisions/0009-agendamento-fuso-por-tenant-e-regras.md)

## Notas de progresso
