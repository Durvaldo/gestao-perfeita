---
status: backlog
modulo: web
owner:
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
