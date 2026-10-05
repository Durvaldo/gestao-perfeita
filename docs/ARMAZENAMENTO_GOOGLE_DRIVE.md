# Configurar o Google Drive para as imagens do site

> Passo a passo para ligar o armazenamento de imagens ([ADR-0015](decisions/0015-armazenamento-de-arquivos-google-drive.md), `TASK-0036`). Sem esta configuração, a produção recusa uploads com "O armazenamento de arquivos não está configurado"; em dev e nos testes, os arquivos vão para o disco local (`web/.storage`).

Use uma conta Google **da plataforma** (não a pessoal de alguém), porque as imagens de todas as barbearias ficam no Drive dela. Uma conta gratuita tem 15 GB.

## 1. Projeto no Google Cloud

1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto (ex.: "Agenda da Barbearia").
2. Em **APIs e serviços → Biblioteca**, ative a **Google Drive API**.

## 2. Tela de consentimento OAuth

1. Em **APIs e serviços → Tela de consentimento OAuth** (ou "Google Auth Platform"), escolha o tipo **Externo** e preencha nome do app e e-mails.
2. Em **Escopos / Acesso a dados**, adicione só `https://www.googleapis.com/auth/drive.file`. Esse escopo é **não sensível**: o app só enxerga os arquivos que ele mesmo criou, nunca o resto do Drive.
3. **Publique o app** ("Publicar app" → status **Em produção**). Enquanto o app estiver em "Teste", o Google faz o refresh token **expirar em 7 dias**, e os uploads param de funcionar. Com escopo não sensível, a publicação não exige verificação.

## 3. Cliente OAuth

1. Em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**, escolha **Aplicativo da Web**.
2. Em **URIs de redirecionamento autorizados**, adicione `https://developers.google.com/oauthplayground`.
3. Guarde o **ID do cliente** e a **chave secreta**.

## 4. Refresh token

1. Abra o [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Na engrenagem (canto superior direito), marque **Use your own OAuth credentials** e cole o ID do cliente e a chave secreta.
3. No passo 1, digite o escopo `https://www.googleapis.com/auth/drive.file`, clique em **Authorize APIs** e entre com a **conta Google da plataforma**.
4. No passo 2, clique em **Exchange authorization code for tokens** e copie o **Refresh token**.

## 5. Variáveis de ambiente

No `.env` local e nas variáveis do deploy (no Vercel: **Settings → Environment Variables**):

```text
GOOGLE_DRIVE_CLIENT_ID="..."
GOOGLE_DRIVE_CLIENT_SECRET="..."
GOOGLE_DRIVE_REFRESH_TOKEN="..."
```

## 6. Pasta (opcional, recomendado)

Sem pasta, os arquivos vão para a raiz do Drive da conta. Para organizar numa pasta, ela precisa ser criada **pelo próprio app** (com o escopo `drive.file`, uma pasta criada à mão é invisível para ele):

```bash
cd web
npm run drive:create-folder
```

O comando imprime `GOOGLE_DRIVE_FOLDER_ID="..."`. Acrescente essa variável ao `.env` e ao deploy.

## Conferir

Faça um novo deploy (as variáveis só valem depois dele), entre como admin em **Meu site** e envie um logo. O arquivo aparece na pasta do Drive, e o site mostra a imagem por `/api/files/{id}`.
