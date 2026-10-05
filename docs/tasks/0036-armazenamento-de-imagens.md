---
status: concluida
modulo: web
owner: Durvaldo
criado-em: 2026-10-04
---

# 0036 — Armazenamento de imagens enviadas pelo admin

**Task ID**: `TASK-0036`

## Objetivo

Resolver a Q2 da [SPEC-0007](../specs/SPEC-0007.md). O projeto não tem onde guardar arquivos, e o site da barbearia precisa de upload de logo, capa e galeria. Avaliar armazenamento de objetos (Vercel Blob, S3, R2) contra as outras opções, considerando o deploy da Fase 4. Depois, implementar um serviço de upload: validação de tipo (JPEG/PNG/WebP) e de tamanho, arquivos separados por tenant e exclusão do arquivo antigo ao substituir.

## Dependências

- Nenhuma.
- **Human gate possível**: se a opção escolhida exigir uma conta ou credencial de serviço externo que o agente não tem, parar e pedir ao responsável.

## Critérios de conclusão

- [x] ADR com a escolha do armazenamento e as alternativas.
- [x] Endpoint de upload autenticado (só admin) com validação; testes do caminho principal e das recusas (tipo e tamanho).
- [x] Variáveis novas documentadas no `.env.example` e no `web/AGENTS.md`; `npm test` e `npm run lint` passando.

## Referências

- [SPEC-0007](../specs/SPEC-0007.md) (RF-2, Q2)

## Notas de progresso
- 2026-10-04 — **Bloqueada antes de começar (human gate).** O armazenamento depende de onde o sistema vai rodar em produção, e isso ainda não foi decidido: a Fase 4 (deploy) não começou e não há `vercel.json`, `Dockerfile` nem ADR de deploy. Num deploy serverless (Vercel), disco local não funciona e o natural é o Vercel Blob; num servidor próprio, disco ou S3/R2 servem. As alternativas mudam materialmente e não há evidência para escolher. Além disso, o consumidor do upload (`TASK-0038`) depende da `TASK-0037`, que espera a `TASK-0034` → `TASK-0033` (bloqueada pela Q1 da SPEC-0005), então implementar agora não destrava nada. **Para desbloquear:** o responsável define o alvo de deploy (ex.: Vercel ou VPS) e, se for um serviço externo, fornece a conta/credencial.
- 2026-10-04 — Desbloqueada: o responsável respondeu às questões pendentes (ver "Decisões do responsável" na SPEC de origem).
- 2026-10-04 — Implementado com Google Drive, por decisão do responsável (SPEC-0007 Q2; [ADR-0015](../decisions/0015-armazenamento-de-arquivos-google-drive.md)). `src/server/files/storage.ts`: backend Google Drive pela API REST com `fetch` (OAuth com refresh token da conta da plataforma, escopo `drive.file`, pasta opcional criada pelo app com `npm run drive:create-folder`) e backend em disco local para dev e testes; em produção sem Drive, o upload é recusado com mensagem clara. `src/server/files/files.ts` + rotas: `POST /api/files` (admin; tipo detectado pelos bytes: JPEG/PNG/WebP; até 4 MB, abaixo do limite do Vercel), `DELETE /api/files/[id]` (admin, só do próprio tenant) e `GET /api/files/[id]` **público**, que serve os bytes com cache de um ano, para o site nunca depender do link do Drive. Tabela `stored_files` (migration `stored_files`), com id UUID aleatório. `deleteStoredFile` fica pronto para a `TASK-0038` apagar a imagem antiga ao substituir. Guia de configuração em [`docs/ARMAZENAMENTO_GOOGLE_DRIVE.md`](../ARMAZENAMENTO_GOOGLE_DRIVE.md); variáveis no `.env.example` e no `web/AGENTS.md`. Testes: protocolo do Drive com `fetch` simulado (token, upload multipart na pasta, leitura, exclusão, erro), disco local (ida e volta, chave que tenta sair da pasta) e seleção do backend; API de arquivos (upload e leitura pública com cache, tipo pelos bytes, limite, permissão, exclusão e isolamento). Verificado: `npm test` (277), `npm run lint` e `npx tsc --noEmit`. **Não verificado:** a integração com uma conta real do Google, que depende das credenciais do responsável (passo a passo no guia). **Produção:** duas migrations novas desde o último push (`tenant_settings` e `stored_files`) precisam de `prisma migrate deploy`.
