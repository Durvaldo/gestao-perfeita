---
status: concluida
modulo: web
owner: Durvaldo
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

- [x] O admin troca o logo e o texto, e o site público reflete a mudança; o profissional não acessa a tela (item de menu só para o admin).
- [x] Ligar e desligar o site funciona (desligado → 404 no público).
- [x] Testes de API das alterações e da permissão; `npm test` e `npm run lint` passando; verificado no navegador.

## Referências

- [SPEC-0007](../specs/SPEC-0007.md) (RF-2, Q3)

## Notas de progresso
- 2026-10-04 — Implementado. API `GET/PUT /api/site-settings` (só admin; `src/server/site/site-settings.ts`): site no ar, logo (`tenants.logo_url`), capa, galeria (até 8), sobre, WhatsApp (só dígitos), Instagram e Facebook (só links http/https). Imagens novas precisam ser arquivos enviados pela própria barbearia (`/api/files/{id}`); uma imagem que já estava no site, como um logo externo antigo, é mantida. Imagens trocadas ou removidas são apagadas do armazenamento depois de salvar (`deleteStoredFile`). Tela `/meu-site` (menu "Meu site", só admin): interruptor "Site no ar" com o endereço, envio de logo, capa e galeria com prévia, textos e contatos, e "Ver site". `api()` passou a aceitar `FormData`. Tamanho da personalização conforme a recomendação da Q3: logo, capa, galeria de até 8 e textos. Limitação conhecida: uma imagem enviada e descartada sem salvar fica órfã no armazenamento. Testes: 6 de API (padrões e permissão, textos e imagens no site público, troca apaga o antigo, desligar, recusas, logo externo mantido), matriz de policies, menu e um E2E (envia um PNG real → aparece e carrega no site público → desliga → 404). Verificado: `npm test` (284), `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e` (12).
