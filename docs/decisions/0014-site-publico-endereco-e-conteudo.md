# 0014 — Site público da barbearia: endereço `/{slug}` e conteúdo em `tenant_settings`

- **Data**: 2026-10-04
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0014`
- **Task relacionada**: `TASK-0037`

## Contexto

A [SPEC-0007](../specs/SPEC-0007.md) pede um site público por barbearia a partir de um template. Ela deixou para a implementação o endereço do site (Q1: caminho ou subdomínio) e não diz onde guardar os textos e as imagens que o admin personaliza.

## Decisão

- **Endereço: `dominio.com/{slug}`**, uma página dinâmica na raiz do App Router (`web/src/app/[slug]/page.tsx`), fora do grupo `(app)`, então sem login. As rotas estáticas do painel (`/agenda`, `/login`, `/excecoes`…) têm precedência sobre o segmento dinâmico, como define o Next.js.
- **Slugs reservados:** como consequência, um slug igual a uma rota do painel nunca seria alcançável. Hoje os slugs vêm do seed. O cadastro de barbearia (`TASK-0020`) deve recusar slugs que coincidam com rotas existentes (`agenda`, `login`, `clientes`, `api` etc.).
- **Conteúdo personalizável** em `tenant_settings`, na chave `site` ([ADR-0013](0013-configuracoes-por-tenant-chave-valor.md)): `enabled` (padrão `true`, porque toda barbearia ganha um site), `about`, `whatsapp`, `instagram`, `facebook`, `coverUrl` e `gallery`. O logo continua na coluna `tenants.logo_url`, que já existia. O resto vem dos cadastros: serviços e profissionais ativos e horários de funcionamento (do primeiro ao último período de qualquer profissional ativo, por dia da semana).
- **Privacidade:** `loadPublicSite` (`web/src/server/site/site.ts`) seleciona os campos públicos um a um e roda no contexto do tenant resolvido pelo slug. Barbearia `suspended` ou site desligado respondem 404.
- **Botão de agendar:** `wa.me` com o WhatsApp do site ou, se não houver, o telefone da barbearia (SPEC-0007, RF-3), até existir a página pública de agendamento.
- **Imagens** com `next/image` em modo `unoptimized`, porque as URLs são externas e ainda não se sabe o host (o armazenamento é a `TASK-0036`).

## Alternativas consideradas

- **Subdomínio `{slug}.dominio.com`**: endereço mais "próprio", mas exige DNS curinga, certificado curinga e um proxy que reescreva o host. O caminho funciona em qualquer deploy hoje. Dá para acrescentar o subdomínio depois, apontando para a mesma página.
- **Prefixo `dominio.com/b/{slug}`**: elimina a colisão com rotas do painel, mas deixa o link pior para divulgar. A colisão se resolve com a lista de slugs reservados.
- **Colunas novas em `tenants` para o conteúdo do site**: misturaria dados de um módulo na tabela de tenants, e cada campo novo exigiria uma migration.

## Consequências

- A tela "Meu site" (`TASK-0038`) grava a chave `site` e o logo.
- A futura página pública de agendamento (Bloco C do plano de melhorias) pode morar em `/{slug}/agendar`, reaproveitando o mesmo carregamento por slug.
- Se `next/image` passar a otimizar as imagens, o host do armazenamento escolhido na `TASK-0036` precisa entrar em `images.remotePatterns`.
