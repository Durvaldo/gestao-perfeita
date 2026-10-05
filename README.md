# Gestão Perfeita — Agenda para barbearias

SaaS **multi-empresa** de gestão para barbearias: agenda dos barbeiros, comandas (vendas de serviços e produtos), controle financeiro com comissões e um dashboard com os números da barbearia. Várias barbearias usam a mesma plataforma, e os dados de cada uma ficam totalmente isolados das demais.

> O sistema nasceu em Laravel + Vue e foi **migrado para uma aplicação Next.js full-stack**, com paridade funcional. O código antigo foi removido, mas continua no histórico do Git, no commit [`7446d48`](https://github.com/Durvaldo/gestao-perfeita/commit/7446d48).

---

## O que o sistema faz

| Módulo | O que tem |
|---|---|
| **Login e acesso** | Login por e-mail e senha. Dois papéis no painel: **administrador**, que vê e faz tudo, e **profissional** (barbeiro), que vê a própria agenda e as próprias comandas. |
| **Cadastros** | Clientes, serviços (duração e preço), produtos (com ou sem controle de estoque) e barbeiros (comissão e horários de trabalho em turnos de manhã e tarde). |
| **Agenda** | Calendário por semana ou dia, com o expediente destacado. Clique num horário livre para agendar. Bloqueia horário fora do expediente e conflito com outro agendamento, e calcula o fim pela duração dos serviços. |
| **Comandas** | Abertas a partir do agendamento (já vêm com os serviços) ou avulsas. Adicione serviços e produtos (com baixa de estoque) e feche com a forma de pagamento: dinheiro, Pix, débito ou crédito. |
| **Financeiro** | Lançamentos de receita e despesa e relatório por período (receitas, despesas, saldo e **comissão por barbeiro**). Toda comanda fechada vira uma receita automaticamente. Visível só para o administrador. |
| **Dashboard** | Serviços e produtos mais vendidos, ranking de barbeiros por faturamento, clientes mais frequentes e próximos aniversários. |

Algumas regras que valem a pena conhecer:

- **Fuso horário por barbearia**: os horários aparecem sempre no fuso da barbearia (padrão: São Paulo), independentemente do fuso do computador de quem acessa.
- **Sem agendamento ou cobrança em duplicidade**: dois agendamentos no mesmo horário, ou dois fechamentos da mesma comanda feitos ao mesmo tempo, são bloqueados. Cada agendamento tem no máximo uma comanda.
- **Estoque nunca fica negativo**: vender mais do que há em estoque mostra "Estoque insuficiente".
- **Barbeiro é desativado, não excluído**: o histórico é mantido e o acesso dele ao sistema é bloqueado na hora.
- **Preço congelado**: o valor de um serviço fica gravado no agendamento e na comanda. Mudar o preço depois não altera vendas passadas.

---

## Tecnologias

- **[Next.js 16](https://nextjs.org/)** (App Router) + **React 19** + **TypeScript**
- **PostgreSQL** + **[Prisma 7](https://www.prisma.io/)** (ORM e migrations)
- **[Better Auth](https://www.better-auth.com/)** (autenticação com sessão no banco)
- **[Zod 4](https://zod.dev/)** (validação, com mensagens em português)
- **Tailwind CSS 4** + **[shadcn/ui](https://ui.shadcn.com/)** (componentes) + ícones **lucide**
- **Vitest** + Testing Library (testes unitários e de integração) e **Playwright** (testes ponta a ponta)

---

## Estrutura do repositório

```text
.
├── web/                 # A aplicação (único projeto de código)
│   ├── src/app/         # Páginas (painel e login) e rotas da API (src/app/api)
│   ├── src/server/      # Regras de negócio de cada módulo (agenda, comandas, financeiro...)
│   ├── src/lib/         # Banco, autenticação, multi-empresa, permissões, fuso horário, formatação
│   ├── src/components/  # Componentes de interface (shadcn/ui e próprios)
│   ├── prisma/          # Schema do banco, migrations e dados de desenvolvimento (seed)
│   ├── e2e/             # Testes ponta a ponta (Playwright)
│   └── tests/           # Utilitários dos testes
├── docs/                # Documentação: especificação, roadmap, decisões (ADRs) e tarefas
├── AGENTS.md            # Guia do projeto (para pessoas e agentes de IA)
└── README.md
```

---

## Como rodar localmente

### Pré-requisitos

- **Node.js 24**
- **PostgreSQL** acessível (o ambiente de desenvolvimento usa um Postgres em Docker na porta **5433**), com dois bancos vazios: um para o sistema e outro, separado, para os testes. Por exemplo:

  ```bash
  createdb agenda_web
  createdb agenda_web_test
  ```

### Passo a passo

```bash
cd web
cp .env.example .env     # preencha os valores (veja abaixo)
npm install              # também gera o client do Prisma
npm run db:deploy        # cria as tabelas
npm run db:seed          # carrega os dados de desenvolvimento
npm run dev              # http://localhost:3001
```

Variáveis do `web/.env`:

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | Banco do sistema (ex.: `postgresql://usuario:senha@127.0.0.1:5433/agenda_web`) |
| `TEST_DATABASE_URL` | Banco dos testes. **É apagado a cada execução**, então precisa ser diferente do `DATABASE_URL` |
| `BETTER_AUTH_SECRET` | Segredo das sessões. Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `BETTER_AUTH_URL` | Endereço da aplicação (`http://localhost:3001` em desenvolvimento) |

O arquivo `.env` nunca vai para o Git.

### Logins de desenvolvimento

O seed cria duas barbearias de exemplo. Todos os usuários usam a senha **`senha123`** (só para desenvolvimento):

| E-mail | Papel |
|---|---|
| `admin@barbearia-centro.com` | Administrador da Barbearia Centro |
| `carlos@barbearia-centro.com`, `rafael@barbearia-centro.com` | Barbeiros da Barbearia Centro |
| `admin@barbearia-zona-sul.com` | Administrador da Barbearia Zona Sul |
| `bruno@barbearia-zona-sul.com`, `diego@barbearia-zona-sul.com` | Barbeiros da Barbearia Zona Sul |
| `superadmin@agenda.com` | Super administrador (sem barbearia) |

---

## Homologação

A homologação está na Vercel, em **https://gestao-perfeita.vercel.app**, com banco Prisma Postgres. Todo push no `main` publica uma versão nova, e as migrations pendentes são aplicadas sozinhas antes do build ([ADR-0016](docs/decisions/0016-migrations-no-build-de-producao-da-vercel.md)). Detalhes em [`web/AGENTS.md`](web/AGENTS.md#deploy-homologação-na-vercel).

> Os logins de desenvolvimento também existem na homologação, com a mesma senha pública. Não use dados reais lá.

---

## Comandos úteis (dentro de `web/`)

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em http://localhost:3001 |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm test` | Testes unitários e de integração (Vitest). Precisa do Postgres no ar |
| `npm run test:e2e` | Testes ponta a ponta (Playwright) no Chrome instalado, em um servidor separado (porta 3002) com o banco de teste |
| `npm run lint` | Lint (ESLint) |
| `npm run db:migrate` | Cria uma migration nova a partir do schema (desenvolvimento) |
| `npm run db:deploy` | Aplica as migrations pendentes |
| `npm run db:seed` | Carrega os dados de desenvolvimento. Pode rodar quantas vezes quiser, sem duplicar |
| `npm run db:studio` | Abre o Prisma Studio para navegar no banco |

> Depois de mudar o `prisma/schema.prisma`, rode `npm run db:generate` e **reinicie o `npm run dev`**.

---

## Testes

- **196 testes** unitários e de integração cobrem as regras de negócio, as permissões, o isolamento entre barbearias, a API e os componentes.
- **3 testes ponta a ponta** percorrem o ciclo principal pela interface: login → agendar → abrir comanda → adicionar produto → fechar → conferir no financeiro e no dashboard. Também conferem a visão restrita do barbeiro e o erro de login. O navegador dos testes roda em outro fuso horário de propósito, para garantir que a agenda sempre mostra o horário da barbearia.

---

## Documentação

| Onde | O quê |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Visão geral, regras do projeto (código em inglês, documentação em português, decisões, testes, tarefas) |
| [`web/AGENTS.md`](web/AGENTS.md) | Guia técnico da aplicação: estrutura, convenções da API e das telas, multi-empresa, permissões, testes e endpoints |
| [`docs/decisions/`](docs/decisions/) | Decisões de arquitetura (ADRs 0001–0016), com o porquê de cada escolha |
| [`docs/tasks/`](docs/tasks/) | Tarefas do projeto e o andamento de cada uma |
| [`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md) · [`docs/ROADMAP_IMPLEMENTACAO.md`](docs/ROADMAP_IMPLEMENTACAO.md) | Especificação do produto e roadmap |

---

## Situação atual e próximos passos

- ✅ **Pronto:** cadastros, agenda, comandas, financeiro, dashboard, login e permissões, isolamento entre barbearias, migração completa para Next.js.
- 🔜 **Próximos passos:**
  - Fase 4 do roadmap: notificações (lembretes de agendamento) e deploy;
  - cadastro self-service de novas barbearias;
  - recuperação de senha e verificação de e-mail;
  - página pública de agendamento e demais melhorias do [plano de melhorias](docs/PLANO_MELHORIAS_BENCHMARK.md).
