# web

Aplicação Next.js full-stack do projeto (substituiu o antigo Laravel + Vue) — ver [ADR-0001](../docs/decisions/0001-migracao-full-stack-nextjs.md).

```bash
npm install
cp .env.example .env        # DATABASE_URL e TEST_DATABASE_URL
npm run db:deploy
npm run db:seed     # dados de dev (logins em AGENTS.md)
npm run dev   # http://localhost:3001
npm test
```

Instruções completas para desenvolvedores e agentes: [AGENTS.md](AGENTS.md).
