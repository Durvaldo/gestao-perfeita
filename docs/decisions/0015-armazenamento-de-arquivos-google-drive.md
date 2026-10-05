# 0015 — Armazenamento de arquivos no Google Drive, servidos por `/api/files/{id}`

- **Data**: 2026-10-04
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0015`
- **Task relacionada**: `TASK-0036`

## Contexto

O site da barbearia ([SPEC-0007](../specs/SPEC-0007.md)) precisa de upload de logo, capa e galeria, e o projeto não tinha onde guardar arquivos. O alvo de deploy ainda não está decidido (hoje há um deploy no Vercel, serverless, sem disco durável). O responsável escolheu o **Google Drive** (Q2 da SPEC-0007), para funcionar em qualquer deploy, mesmo depois de o agente apontar as limitações do Drive para servir imagens: link direto instável e limitado, e conta de serviço sem espaço próprio. Como armazenamento de objetos, o agente recomendou o Cloudflare R2.

## Decisão

- **Backend Google Drive pela API REST v3 com `fetch`** (`web/src/server/files/storage.ts`), sem a biblioteca `googleapis`, que é grande para três chamadas (upload multipart, download com `alt=media` e exclusão).
- **Credenciais OAuth da conta Google da plataforma** (client id, client secret e refresh token), com o escopo **`drive.file`**, não sensível: o app só enxerga os arquivos que ele mesmo criou. Conta de serviço foi descartada porque não tem espaço fora de um Drive Compartilhado, que exige Workspace pago. A pasta (`GOOGLE_DRIVE_FOLDER_ID`) é opcional e, por causa do `drive.file`, precisa ser criada pelo app (`npm run drive:create-folder`). Passo a passo em [`ARMAZENAMENTO_GOOGLE_DRIVE.md`](../ARMAZENAMENTO_GOOGLE_DRIVE.md).
- **O site nunca usa o link do Drive.** Cada arquivo tem um registro em `stored_files` (id UUID aleatório, tenant, chave no backend, tipo, tamanho), e a URL pública é **`/api/files/{id}`**: a rota busca os bytes no backend e responde com `Cache-Control: public, max-age=31536000, immutable`. Um arquivo nunca muda sob o mesmo id (substituir cria um novo), então navegador e CDN guardam a imagem e quase não chegam ao Drive. Isso contorna o link direto instável e o limite de acesso.
- **A rota pública lê sem tenant (`unscopedDb`) de propósito**: as imagens do site são públicas por natureza, e o UUID aleatório é a chave de acesso. Upload e exclusão continuam no contexto do tenant e só para o admin (policy `file`); excluir arquivo de outra barbearia responde 404.
- **Validação**: o tipo vem dos bytes do arquivo (JPEG, PNG ou WebP), não do tipo declarado pelo navegador; tamanho máximo de **4 MB**, abaixo do limite de 4,5 MB do corpo da requisição no Vercel.
- **Sem Drive configurado**: em dev e nos testes, o backend é o disco local (`LOCAL_FILE_STORAGE_DIR`, padrão `web/.storage`, no `.gitignore`). Em produção, o upload é recusado com mensagem clara, a menos que `ALLOW_LOCAL_FILE_STORAGE=true` (usado só no build do E2E).

## Alternativas consideradas

- **Cloudflare R2 / S3 / Vercel Blob**: são feitos para servir arquivos (CDN, URL estável) e seriam a escolha técnica natural. Ficaram de fora pela decisão do responsável. Trocar depois exige só um novo `StorageBackend` (o campo `stored_files.backend` permite conviver com arquivos antigos).
- **Link de compartilhamento do Drive direto no site**: instável (o Google já mudou o formato), com limite de acesso e dependente de deixar arquivos públicos no Drive.
- **Biblioteca `googleapis`**: completa, mas pesada para o bundle do servidor, e as três chamadas são simples.

## Consequências

- **A integração real com o Google não foi testada contra a conta**, porque as credenciais dependem do responsável. Os testes cobrem o protocolo com um `fetch` simulado e o fluxo completo com o disco local. Validar com uma conta real é o primeiro passo depois de configurar.
- Cada visualização de imagem que não está em cache passa pelo servidor da aplicação e pelo Drive. Com o cache de um ano, isso acontece pouco, mas é mais lento que uma CDN de objetos.
- Ao substituir uma imagem, quem a substitui (tela "Meu site", `TASK-0038`) deve apagar o arquivo antigo com `deleteStoredFile`.
