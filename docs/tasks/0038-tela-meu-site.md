---
status: backlog
modulo: web
owner:
criado-em: 2026-10-04
---

# 0038 — Tela "Meu site" para personalização pelo admin

**Task ID**: `TASK-0038`

## Objetivo

Implementar o RF-2 da [SPEC-0007](../specs/SPEC-0007.md): uma tela do painel, só para o admin, para trocar o logo, a capa e a galeria, editar o sobre, o WhatsApp e as redes, ligar ou desligar o site e pré-visualizar.

O tamanho da personalização (Q3) segue a recomendação da SPEC até o responsável decidir diferente: logo, capa, galeria de até 8 fotos e textos. Paleta de cores e outros templates ficam fora.

## Dependências

- `TASK-0036`, `TASK-0037`

## Critérios de conclusão

- [ ] O admin troca o logo e o texto, e o site público reflete a mudança; o profissional não acessa a tela (item de menu só para o admin).
- [ ] Ligar e desligar o site funciona (desligado → 404 no público).
- [ ] Testes de API das alterações e da permissão; `npm test` e `npm run lint` passando; verificado no navegador.

## Referências

- [SPEC-0007](../specs/SPEC-0007.md) (RF-2, Q3)

## Notas de progresso
