# 0016 — Migrations aplicadas no build de produção da Vercel

- **Data**: 2026-10-05
- **Status**: aceita
- **Validade**: permanente
- **ADR ID**: `ADR-0016`
- **Task relacionada**: `TASK-0043`

## Contexto

A homologação roda na Vercel (projeto `gestao-perfeita`, endereço público `https://gestao-perfeita.vercel.app`) com um banco Prisma Postgres conectado pela integração da Vercel. A integração cria `DATABASE_URL`, `POSTGRES_URL` e `PRISMA_DATABASE_URL` nos ambientes **Production e Preview, apontando para o mesmo banco**.

Até aqui as migrations eram aplicadas na mão (`prisma migrate deploy` com a URL do banco num `.env` local). Em 2026-10-05 o código de 4 migrations novas já estava no ar enquanto o banco continuava sem elas. Além disso, a Vercel marca as variáveis do banco como sensíveis, e o `vercel env pull` não devolve o valor, então quem for aplicar precisa copiar a URL do painel.

## Decisão

- O `package.json` ganha o script **`vercel-build`** (`tsx scripts/vercel-build.ts`). A Vercel usa esse script no lugar do `build` quando ele existe. Localmente, `npm run build` continua sendo só `next build`.
- `scripts/vercel-build.ts` roda `prisma migrate deploy` e depois `next build`, **só quando `VERCEL_ENV === "production"`** (`shouldMigrateOnBuild` em `scripts/migrate-policy.ts`). Nos deploys de preview, pula as migrations e só faz o build.
- Uma migration com erro faz o build falhar: o deploy não é promovido, e a versão anterior continua no ar.

## Alternativas consideradas

- **Continuar aplicando na mão**: foi o que causou o descompasso entre código e banco, e exige copiar a URL secreta do painel.
- **Migrar em todo deploy, inclusive preview**: o preview usa o mesmo banco da homologação. Um branch com uma migration ainda não aprovada alteraria o banco de todo mundo, e o `main` sem aquela migration ficaria com o banco à frente do código.
- **Rodar as migrations no `postinstall` ou no `build` normal**: também rodaria no build local e nos testes (o E2E faz um build de produção) contra o banco do `.env`. O `vercel-build` isola o comportamento na Vercel.
- **Job separado (GitHub Actions) antes do deploy**: o repositório não tem CI, e a Vercel publica direto do GitHub. Seria mais uma peça, e mais um lugar com a URL secreta.

## Consequências

- O build de produção precisa alcançar o banco. A `DATABASE_URL` da integração é a conexão direta (`postgres://...@db.prisma.io:5432`), que é a que o `migrate deploy` usa.
- Migrations rodam **antes** do código novo ir ao ar, enquanto a versão anterior ainda atende. Toda migration precisa ser compatível com o código que está no ar: adicionar coluna ou tabela, sim; renomear ou remover algo que o código atual usa, não. Mudanças assim são feitas em dois deploys.
- Preview roda o código novo sobre o banco da homologação **sem** as migrations do branch. Um preview que dependa de uma migration nova vai falhar nas telas que usam a mudança, até ela chegar ao `main`. Se isso passar a atrapalhar, a saída é um banco separado para o Preview.
- O seed **não** roda no deploy: ele é feito uma vez, na mão, quando o banco é criado.
