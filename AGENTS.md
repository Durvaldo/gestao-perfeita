# Projeto Agenda — instruções para agentes de IA

Leia este arquivo primeiro. Cada módulo tem o próprio `AGENTS.md` com os detalhes específicos.

## O que é este projeto

SaaS multi-tenant de gestão de agenda para barbearias: uma plataforma usada por várias barbearias (tenants), cada uma com seus barbeiros, clientes, horários, comandas e financeiro isolados ([`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md)). Hoje o sistema é um monorepo com uma API Laravel (`backend/`) e uma SPA Vue 3 (`frontend/`), com as Fases 1–3 do [roadmap](docs/ROADMAP_IMPLEMENTACAO.md) concluídas.

**Em migração:** o projeto está sendo levado para **Next.js full-stack** numa app nova em `web/`, construída em paralelo até a paridade. Depois do corte, `backend/` e `frontend/` serão removidos ([ADR-0001](docs/decisions/0001-migracao-full-stack-nextjs.md); tasks `TASK-0001`…`TASK-0019` em [`docs/tasks/`](docs/tasks/)).

## Escopo atual e direção do projeto

Leia [`docs/SCOPE.md`](docs/SCOPE.md) antes de propor mudanças de arquitetura ou de prioridade. Ele é mantido pelo usuário/time: não o edite, a menos que o usuário peça. Isso é diferente de [`docs/decisions/`](docs/decisions/), que é responsabilidade do agente. Os documentos de produto e de roadmap que detalham o escopo estão listados no fim de [`docs/AGENTS.md`](docs/AGENTS.md).

## Estrutura do repositório

| Diretório | Tipo | Descrição | Instruções |
|---|---|---|---|
| `backend/` | Projeto Composer (Laravel 13, PHP 8.3) | API REST + auth Sanctum + multi-tenancy. **Legado em migração**, mas é a referência de regras de negócio | [backend/AGENTS.md](backend/AGENTS.md) |
| `frontend/` | Projeto npm (Vue 3 + Vite) | SPA do painel admin/prestador. **Legado em migração**, mas é a referência de telas | [frontend/AGENTS.md](frontend/AGENTS.md) |
| `web/` | Projeto npm (Next.js 16, TypeScript) | App full-stack que substitui os dois acima — **em construção** (fundação pronta, `TASK-0001`–`0007`, toda a API no servidor (cadastros, agendamento, comandas, financeiro e dashboard, `TASK-0008`/`0009`/`0012`/`0014`/`0016`/`0017`), e todas as telas, `TASK-0010`/`0011`/`0013`/`0015`/`0018`; falta só o corte final, `TASK-0019`) | [web/AGENTS.md](web/AGENTS.md) |
| `docs/` | Documentação | Especificação, modelagem, roadmap, benchmark, ADRs (`decisions/`) e tasks (`tasks/`) | [docs/AGENTS.md](docs/AGENTS.md) |

Não existe build raiz: cada módulo tem o seu próprio manifesto, sem workspaces npm nem orquestração entre eles.

## Build

- **Banco**: PostgreSQL em `127.0.0.1:5433`, banco `agenda_barbearia`. Ele **não** é provisionado por este repositório (sem `docker-compose`); segundo o roadmap, é o container Docker `esus-db`, compartilhado com outro projeto.
- **backend**: `cd backend && php artisan migrate && php artisan db:seed && php artisan serve` (porta 8000). Testes: `composer test`. ⚠️ Confira `php -v` antes: sessões novas podem pegar o PHP 7.4 do PATH (ver [backend/AGENTS.md](backend/AGENTS.md)).
- **frontend**: `cd frontend && npm install && npm run dev` (porta 3000; a URL da API `http://localhost:8000` está fixa em `src/api/axios.js`).
- **web**: `cd web && cp .env.example .env` (preencha, incluindo `BETTER_AUTH_SECRET`), depois `npm install && npm run db:deploy && npm run db:seed && npm run dev` (porta 3001; logins de dev em [web/AGENTS.md](web/AGENTS.md)). Bancos `agenda_web` e `agenda_web_test` no mesmo Postgres (porta 5433). Testes: `npm test` (Vitest; exige o Postgres no ar) e `npm run test:e2e` (Playwright com o Chrome instalado). Lint: `npm run lint`.

## Regras de padronização (obrigatórias para agentes de IA)

Regras de política da Soluta SoftHouse — têm prioridade sobre qualquer padrão herdado do código existente neste repositório. Aplique-as a todo código novo e a todo trecho que você tocar; não é necessário fazer varreduras de reescrita em massa em código não relacionado à sua tarefa só para adequá-lo.

### 1. Idioma: código em inglês, documentação em português

- **Código** — identificadores (classes, funções, variáveis, parâmetros), comentários de código, mensagens de log/exceção, nomes de commit/branch: **em inglês**.
- **Documentação** — `AGENTS.md`, `README.md`, `docs/`, registros de decisão (regra 2) e qualquer material de arquitetura/processo: **em português**.
- **Exceção — texto voltado ao usuário final**: strings exibidas na UI (labels, toasts, mensagens de erro, e-mails, bundles de i18n) continuam no idioma do público do sistema (normalmente português, para usuários brasileiros) — isso é conteúdo de produto, não "código" nem "documentação" para efeito desta regra.
- Código pré-existente em português (comentários, logs) **não precisa ser retroativamente traduzido** só por causa desta regra. Ao editar um arquivo, prefira migrar para inglês o trecho que você está tocando, em vez de misturar ainda mais os dois idiomas dentro do mesmo arquivo.
- Termos de domínio do negócio (siglas do setor, nomenclatura oficial de sistemas externos com os quais o projeto integra) nunca são traduzidos.

### 2. Toda decisão relevante deve ficar documentada

Para evitar que sessões/agentes diferentes tomem decisões conflitantes (duas abordagens diferentes para o mesmo problema, reversão silenciosa de uma escolha anterior), **é responsabilidade do próprio agente registrar as decisões que tomar** — não do usuário.

- Registros ficam em `docs/decisions/`, um arquivo Markdown por decisão, numerado sequencialmente (`0001-titulo-curto.md`), em português. Template em `docs/decisions/0000-template.md`.
- **Antes** de tomar uma decisão técnica não trivial (escolha de biblioteca, padrão de arquitetura, trade-off, contorno de limitação, desvio de uma convenção já estabelecida), verifique em `docs/decisions/` se já existe algo relacionado — não contradiga uma decisão anterior sem justificar por quê.
- **Depois** de decidir, crie (ou, se for revisão de algo já registrado, atualize) um registro com: contexto, decisão tomada, alternativas consideradas e por que foram descartadas, consequências/trade-offs aceitos.
- Decisões triviais ou óbvias (nome de variável, formatação) não precisam de registro — reserve para escolhas que causariam retrabalho ou conflito se outro agente as refizesse de forma diferente.
- **Não crie uma ADR apenas para repetir um requisito que uma SPEC já prescreve de forma inequívoca** (quando o projeto usar specs formais em `docs/specs/`) — isso não é uma decisão do agente, é a SPEC sendo transcrita. Uma ADR registra uma escolha real entre alternativas, tipicamente feita durante discovery/implementação de uma task quando a SPEC deixa a questão aberta — ou, mais raramente, uma decisão arquitetural transversal tomada conscientemente já na fase de especificação. Fluxo completo em `docs/AGENTS.md`.

### 3. Testes leves e eficazes (unitários e de integração)

Objetivo: o sistema não deve quebrar a cada alteração, sem impor suíte pesada ou frágil.

- Toda mudança de comportamento (lógica de negócio, endpoint, integração) deve vir com teste(s) cobrindo o caminho principal e, quando fizer sentido, os casos de borda mais prováveis de quebrar. Prefira poucos testes de alto valor a cobertura exaustiva.
- Cada módulo documenta no seu próprio `AGENTS.md` qual framework de teste já existe (ou a ausência de um) — consulte-o antes de escrever testes; nunca assuma que existe tooling de teste sem checar `package.json`/`pom.xml`/equivalente.
- Se um módulo não tiver nenhum framework de teste configurado, configure um antes de escrever os testes (ex.: Vitest/Jest para projetos Vite/npm, JUnit/Mockito para JVM, pytest para Python) — escolha o que for nativo do ecossistema do módulo, e registre a escolha em `docs/decisions/` se houver mais de uma opção razoável.
- Evite testes frágeis (snapshots de UI inteiros, mocks excessivos que só testam o próprio mock) — prefira testar comportamento observável.
- Rode a suíte relevante antes de considerar uma tarefa concluída.

### 4. Gerenciamento de tasks padronizado (`docs/tasks/`)

A ferramenta interna de tasks da sessão do agente organiza o trabalho *dentro* de uma conversa, mas não sobrevive entre sessões. Para trabalho que não é uma edição pontual de uma sessão só, o registro persistente fica em `docs/tasks/` — mesma lógica de responsabilidade do agente que a regra 2.

- Um arquivo Markdown por task, numerado sequencialmente (`0001-titulo-curto.md`), com frontmatter `status` (`backlog`/`em-andamento`/`concluida`/`bloqueada`/`adiada`/`parcialmente-concluida`/`cancelada`), `modulo`, `owner`, `criado-em`. Template em `docs/tasks/0000-template.md`. Distinções que importam: `bloqueada` é impedimento técnico/externo (dependência pendente, falta de acesso); `adiada` é decisão consciente de sequenciamento (a task continua válida, só não deve ser selecionada automaticamente nem aguardada); `parcialmente-concluida` é quando parte dos critérios de conclusão foi entregue e o restante foi **deliberadamente** deferido, com o motivo registrado nas notas de progresso — nunca use este status para encobrir trabalho inacabado sem explicação.
- Antes de começar algo não trivial, verifique se já existe uma task relacionada (evita duplicar trabalho ou conflitar com o que outra sessão — ou outro desenvolvedor — já estava fazendo).
- Atualize `status` e as notas de progresso conforme o trabalho avança e ao final da sessão — não deixe uma task `em-andamento` desatualizada.
- Tasks vindas do roadmap devem referenciar a SPEC de origem, quando o projeto usar specs formais (`docs/specs/`), e/ou a seção correspondente de `docs/SCOPE.md`.
- **Múltiplos desenvolvedores podem trabalhar no mesmo projeto simultaneamente, cada um em sua própria task** — o limite de "uma task `em-andamento` por vez" é por `owner`, não um limite global do projeto (ver seção "Múltiplos desenvolvedores no mesmo projeto" do protocolo completo). Processo completo de claim, protocolo anti-colisão de numeração e o algoritmo de seleção/execução autônoma estão em `docs/AGENTS.md` (copiado de `assets/task-workflow-protocol.md`) — não reinvente esse mecanismo por projeto.

## Convenções gerais do projeto

- **Versionamento**: não há fonte de versão do produto. `frontend/package.json` está em `0.0.0`, e o `composer.json` ainda tem o nome/descrição do skeleton Laravel.
- **Commits**: o repositório ainda **não tem nenhum commit** (branch `master`; o branch principal configurado para PRs é `main`). Não há CONTRIBUTING. Use *Conventional Commits* com o footer `Task`/`Task-File`/`ADR`/`ADR-File`, conforme [`docs/AGENTS.md`](docs/AGENTS.md).
- **CI**: nenhuma configuração de CI no repositório.
- **Segredos**:
  - `backend/.env` contém `APP_KEY` e a senha do banco reais. Está no `backend/.gitignore`, então não é versionado; nunca o adicione ao Git nem copie valores dele para docs.
  - `backend/.env.example` só tem placeholders.
  - `backend/database/seeders/*.php` contém senhas de dev em texto (`senha123` para os usuários semeados). Elas **serão versionadas** no primeiro commit. São aceitáveis só como dados de dev; nunca as reutilize num ambiente real.
  - `backend/database/database.sqlite` existe localmente, mas é ignorado (`database/.gitignore`: `*.sqlite*`).
- **Idioma do domínio**: entidades, tabelas e rotas estão em português (`agendamentos`, `comandas`, `barbeiros`). Na stack nova o domínio está em inglês e `Barbeiro` passou a ser `Professional` ([ADR-0003](docs/decisions/0003-camada-de-dados-prisma-schema-em-ingles.md); mapeamento completo em [web/AGENTS.md](web/AGENTS.md)).

## Por onde começar, dependendo da tarefa

- **Trabalhar na migração para Next.js**: leia [ADR-0001](docs/decisions/0001-migracao-full-stack-nextjs.md) e escolha a próxima task elegível em [`docs/tasks/`](docs/tasks/), seguindo o algoritmo de seleção de [`docs/AGENTS.md`](docs/AGENTS.md). Para entender a regra que está sendo portada, use o [backend/AGENTS.md](backend/AGENTS.md) (servidor) e o [frontend/AGENTS.md](frontend/AGENTS.md) (telas).
- **Corrigir algo no sistema atual**: [backend/AGENTS.md](backend/AGENTS.md) ou [frontend/AGENTS.md](frontend/AGENTS.md). Lembre que a correção provavelmente também precisa entrar na task correspondente da migração.
- **Produto/escopo/modelagem**: [`docs/SCOPE.md`](docs/SCOPE.md), [`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md) e [`docs/MODELAGEM_BANCO.md`](docs/MODELAGEM_BANCO.md).
- **Decisões e tasks**: [`docs/AGENTS.md`](docs/AGENTS.md).
