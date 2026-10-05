---
status: em-andamento
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0037 — Site público da barbearia (template)

**Task ID**: `TASK-0037`

## Objetivo

Implementar o RF-1, o RF-3 e o RF-4 da [SPEC-0007](../specs/SPEC-0007.md):

- página pública sem login, montada a partir dos dados já cadastrados: logo, capa, sobre, serviços, equipe, horários, endereço, contato e redes;
- seções vazias ocultas;
- botão de agendar via `wa.me`;
- só campos públicos expostos;
- SEO e Open Graph básicos;
- barbearia suspensa ou com o site desligado → 404.

A Q1 (caminho `/{slug}` ou subdomínio) é técnica: decidir aqui, registrar em ADR. Recomendação da SPEC: caminho.

## Dependências

- `TASK-0034` (telefone normalizado e formatado, para o `wa.me` e a exibição).

## Critérios de conclusão

- [ ] Campos novos de conteúdo do site no `Tenant` (ou numa tabela própria), via migration.
- [ ] `/barbearia-centro` mostra os serviços e a equipe do seed, sem sessão; nada de outra barbearia aparece.
- [ ] Teste confirmando que a resposta pública não contém campos privados (comissão, notas, e-mails).
- [ ] Layout mobile-first verificado no navegador; `npm test`, `npm run lint` e `npm run build` passando.
- [ ] ADR do endereço do site.

## Referências

- [SPEC-0007](../specs/SPEC-0007.md) (RF-1, RF-3, RF-4, Q1)
- [ADR-0005](../decisions/0005-isolamento-por-tenant-prisma-extension.md) (`withRequestTenant({ slug })`)

## Notas de progresso
