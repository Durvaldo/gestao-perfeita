---
status: em-andamento
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

- [ ] ADR com a escolha do armazenamento e as alternativas.
- [ ] Endpoint de upload autenticado (só admin) com validação; testes do caminho principal e das recusas (tipo e tamanho).
- [ ] Variáveis novas documentadas no `.env.example` e no `web/AGENTS.md`; `npm test` e `npm run lint` passando.

## Referências

- [SPEC-0007](../specs/SPEC-0007.md) (RF-2, Q2)

## Notas de progresso
- 2026-10-04 — **Bloqueada antes de começar (human gate).** O armazenamento depende de onde o sistema vai rodar em produção, e isso ainda não foi decidido: a Fase 4 (deploy) não começou e não há `vercel.json`, `Dockerfile` nem ADR de deploy. Num deploy serverless (Vercel), disco local não funciona e o natural é o Vercel Blob; num servidor próprio, disco ou S3/R2 servem. As alternativas mudam materialmente e não há evidência para escolher. Além disso, o consumidor do upload (`TASK-0038`) depende da `TASK-0037`, que espera a `TASK-0034` → `TASK-0033` (bloqueada pela Q1 da SPEC-0005), então implementar agora não destrava nada. **Para desbloquear:** o responsável define o alvo de deploy (ex.: Vercel ou VPS) e, se for um serviço externo, fornece a conta/credencial.
- 2026-10-04 — Desbloqueada: o responsável respondeu às questões pendentes (ver "Decisões do responsável" na SPEC de origem).
