---
status: concluida
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

- [x] Campos novos de conteúdo do site no `Tenant` (ou numa tabela própria), via migration.
- [x] `/barbearia-centro` mostra os serviços e a equipe do seed, sem sessão; nada de outra barbearia aparece.
- [x] Teste confirmando que a resposta pública não contém campos privados (comissão, notas, e-mails).
- [x] Layout mobile-first verificado no navegador; `npm test`, `npm run lint` e `npm run build` passando.
- [x] ADR do endereço do site.

## Referências

- [SPEC-0007](../specs/SPEC-0007.md) (RF-1, RF-3, RF-4, Q1)
- [ADR-0005](../decisions/0005-isolamento-por-tenant-prisma-extension.md) (`withRequestTenant({ slug })`)

## Notas de progresso
- 2026-10-04 — Implementado ([ADR-0014](../decisions/0014-site-publico-endereco-e-conteudo.md): endereço `/{slug}`, conteúdo em `tenant_settings`/`site`). O critério "campos novos no Tenant (ou numa tabela própria), via migration" foi atendido pela tabela `tenant_settings` da `TASK-0039`, então não houve migration nova. Página `src/app/[slug]/page.tsx`, sem login e mobile-first: capa (ou gradiente), logo, nome, endereço, "Agendar pelo WhatsApp" (WhatsApp do site ou telefone da barbearia), sobre, serviços com preço e duração, equipe, galeria, horários de funcionamento e contato/redes; seções vazias somem; `generateMetadata` com título, descrição e Open Graph. `loadPublicSite` (`src/server/site/site.ts`) seleciona só campos públicos e retorna null para slug desconhecido, barbearia suspensa ou site desligado (→ 404). Testes: 5 de servidor (conteúdo, nenhum campo privado nem de outra barbearia, textos do admin, casos sem site, horários) e um E2E sem login (título, seções, link `wa.me/55…`, 404). Conferido visualmente em largura de celular (390 px). Verificado: `npm test` (267), `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (11); o `npm run build` roda dentro do E2E.
