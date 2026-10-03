# Fluxo de trabalho: SCOPE → SPEC → TASK → ADR → Implementação → Commit

Formaliza como o trabalho de qualquer natureza (roadmap, bug, pedido pontual não trivial) se
traduz em trabalho executável e rastreável entre sessões de agente diferentes — e entre
**desenvolvedores diferentes trabalhando no mesmo projeto ao mesmo tempo**. Isto **complementa**
as regras 2 e 4 do `AGENTS.md` raiz — não as substitui.

```text
SCOPE / ROADMAP (docs/SCOPE.md, se o projeto tiver um)
   ↓
SPEC (docs/specs/, quando o projeto usar specs formais)
   ↓
TASKS
   ↓
DISCOVERY / SPIKE, quando necessário
   ↓
ADR, quando existir uma decisão técnica ainda não definida
   ↓
IMPLEMENTAÇÃO
   ↓
TESTES
   ↓
COMMIT(S)
   ↓
TASK CONCLUÍDA
```

Responsabilidade de cada camada:

- **Scope/roadmap** (`docs/SCOPE.md` e qualquer roadmap arquitetural específico do projeto) — direção e ordem da evolução; nunca é implementado diretamente, só referenciado pelas SPECs/tasks. Mantido pelo usuário/time, não pelo agente.
- **SPEC** (`docs/specs/`, quando o projeto usar specs formais) — traduz uma parte do scope/roadmap em requisitos técnicos detalhados de um componente. Uma SPEC pode manter deliberadamente uma questão como hipótese/experimento em vez de fechá-la — isso é uma decisão editorial da própria SPEC, não uma lacuna a preencher durante a decomposição em tasks. Ver "SPEC → TASK" abaixo.
- **Task** (`docs/tasks/`) — unidade persistente de trabalho, retomável entre sessões e entre desenvolvedores; é o que efetivamente "está sendo feito agora", e por quem. Operacionaliza uma parte específica de uma SPEC (ou, na ausência de SPEC formal, do roadmap/scope diretamente).
- **Discovery/Spike** — investigação/benchmark necessário antes de fechar uma decisão que a SPEC deixou aberta. Pode ou não gerar um documento próprio, mas deve gerar uma nota de progresso na task; se concluir que a hipótese já documentada se confirma sem exigir uma escolha nova, não é obrigatório criar ADR — registre o resultado na task mesmo assim.
- **ADR** (`docs/decisions/`) — decisão técnica real tomada e por quê, quando a SPEC não a havia prescrito. Não é o mesmo que a task ("o que fazer e o andamento") nem um resumo da SPEC ("o que a SPEC já disse"). Ver "Quando criar uma ADR (e quando não criar)" abaixo.
- **Implementação/Testes/Commits** — mudança verificável no repositório, vinculada explicitamente à task (e ao ADR, quando houver) via footer do commit — ver "Padrão de commits vinculados a tasks/ADRs" abaixo.

Uma task pode gerar vários commits e, quando aplicável, um ou mais ADRs.

## SPEC → TASK

Regras que a decomposição de uma SPEC em tasks (manual ou assistida por skill) deve preservar:

- **Uma TASK transforma parte da SPEC em trabalho executável. Ela não cria nova direção arquitetural ou de produto.** Se a task precisar de uma decisão que a SPEC não tomou, a task registra que essa decisão será tomada em discovery/implementação (e documentada em ADR quando aplicável) — ela não decide isso silenciosamente durante a própria geração da task.
- **Requisitos já prescritos por uma SPEC de forma inequívoca não devem ser reinterpretados pelo executor sem motivo técnico documentado.** Se a SPEC prescreve algo sem alternativa real, a task/implementação segue isso — desviar exige justificativa registrada (tipicamente uma ADR marcando a SPEC como superada nesse ponto), não uma escolha silenciosa do executor.
- **Se a SPEC mantém uma questão como hipótese/experimento, a task deve preservar essa abertura.** Uma task derivada de uma hipótese deve ser redigida como "implementar/avaliar a hipótese X", nunca como "implementar a arquitetura definitiva X". Isso vale tanto para o texto da task quanto para qualquer ADR que a acompanhe (ver campo `Validade` no template de ADR, para marcar uma decisão como válida apenas enquanto a hipótese correspondente não for resolvida).
- **Granularidade**: uma task deve representar uma unidade de trabalho suficientemente delimitada para execução por um agente/sessão. Se uma entrega envolver múltiplos experimentos independentes, múltiplos componentes substanciais, vários critérios de aceite que poderiam ser concluídos separadamente, ou trabalho de pesquisa/ML claramente maior que uma unidade de sessão, prefira dividir em tasks menores — mas não divida artificialmente um trabalho coeso apenas para aumentar a contagem de tasks.
- **Dependências**: declare na task todos os pré-requisitos reais necessários para que seus critérios de aceite possam ser executados — não apenas a task imediatamente anterior, se outras também forem necessárias. Dependências meramente transitivas (uma dependência da sua dependência) não precisam ser repetidas, desde que a cadeia já declarada impeça corretamente a reivindicação prematura da task.

## Identificadores

- **Task**: `TASK-<número do arquivo>` — ex. `docs/tasks/0004-titulo.md` → `TASK-0004`.
- **ADR**: `ADR-<número do arquivo>` — ex. `docs/decisions/0002-titulo.md` → `ADR-0002`.
- **SPEC**: `SPEC-<número do arquivo>` — ex. `docs/specs/SPEC-0004.md` → `SPEC-0004`, quando o projeto usar specs formais.

Não introduza UUID, Jira ID ou qualquer identificador externo — a numeração sequencial do
próprio arquivo já é o identificador estável.

## Múltiplos desenvolvedores no mesmo projeto

Um projeto real quase nunca tem um único desenvolvedor (humano ou agente) trabalhando por vez.
Este mecanismo existe para que várias pessoas — cada uma com sua própria sessão de agente —
avancem em tasks diferentes sem duplicar trabalho, sem sobrescrever a claim umas das outras, e
sem colidir na numeração sequencial de arquivos.

### Campo `owner`

Toda task tem um campo `owner` no frontmatter (ver template). Identifica quem está com a task
ativamente — prefira a identidade real do desenvolvedor (nome/handle já usado no `git config
user.name`/e-mail do repositório), não um identificador genérico como "agente" ou "IA". Uma
task sem dono ativo tem `owner` vazio ou aponta o último dono histórico (não é obrigatório
limpar o campo quando a task volta para `backlog`/`bloqueada` — o `status` já indica que não
está mais ativa; o `owner` anterior é só um dado histórico útil).

### "Uma task `em-andamento` por vez" é por `owner`, não do projeto

A regra 4 do `AGENTS.md` raiz ("uma task `em-andamento` por vez") é sobre **concorrência de
um mesmo owner**, não um limite global do projeto. Vários desenvolvedores podem, cada um, ter
sua própria task `em-andamento` simultaneamente — isso é o objetivo deste mecanismo, não uma
exceção a ele. O que continua proibido: o mesmo `owner` reivindicar uma segunda task enquanto já
tem outra `em-andamento`.

### Protocolo de claim (reivindicar uma task)

Antes de mudar o `status` de uma task para `em-andamento`:

1. **Sincronize primeiro** — `git fetch`/`pull` do branch de trabalho antes de olhar
   `docs/tasks/`, para ver o estado mais recente (outro desenvolvedor pode ter reivindicado ou
   concluído algo há poucos minutos).
2. **Verifique que não está reivindicada** — se `status: em-andamento` e `owner` já preenchido
   com outra pessoa, não a inicie. Escolha outra task elegível, ou combine diretamente com esse
   `owner` se precisar especificamente daquela.
3. **Reivindique rápido, em um commit isolado** — mude só `owner` e `status` no frontmatter
   dessa task, comite isso **sozinho** (não junto com código), com uma mensagem curta como
   `docs: claim TASK-0031 (<owner>)`, e dê push imediatamente. Isolar esse commit minimiza a
   janela de corrida com outro desenvolvedor tentando reivindicar a mesma task ao mesmo tempo.
4. **Se o push for rejeitado** (alguém venceu a corrida, ou o arquivo mudou no remoto): puxe de
   novo e reconfira o `owner`. Se outra claim já venceu, desista dessa task e escolha outra —
   nunca sobrescreva a claim de outra pessoa.
5. Só depois de a claim estar confirmada (push aceito), comece de fato o trabalho.

### Evitando colisão ao criar um novo arquivo de task/ADR

Numeração sequencial (`0001`, `0002`, ...) tem risco real de colisão quando dois
desenvolvedores criam um arquivo novo quase ao mesmo tempo, cada um calculando "o próximo
número" localmente antes de dar push.

- Sempre `git pull` antes de decidir qual é o próximo número livre em `docs/tasks/`ou
  `docs/decisions/`.
- Se o seu push for rejeitado porque alguém já usou o mesmo número enquanto você trabalhava,
  **renumere o seu arquivo** (nunca o do outro) para o próximo número livre depois de puxar de
  novo, ajuste as referências internas (`TASK-000X`/`ADR-000X` dentro do próprio arquivo, se
  citadas), e então dê push de novo.
- Prefira criar e dar push do arquivo novo (mesmo que ainda incompleto, com "Objetivo" já
  preenchido) **antes** de investir tempo escrevendo o resto — isso reduz a janela em que dois
  arquivos com o mesmo número podem existir sem que ninguém tenha visto o outro ainda.

### Evitando conflito de trabalho, não só de arquivo

Antes de reivindicar uma task tecnicamente elegível (dependências satisfeitas), verifique
também se ela não colide na prática com uma task que **outro owner já tem `em-andamento`** —
mesmo módulo, mesmos arquivos-fonte, mesma área do sistema. Colisão de arquivo o Git resolve
(merge/conflito); colisão de *trabalho* (duas pessoas resolvendo o mesmo problema de formas
diferentes ao mesmo tempo) o Git não resolve — prefira escolher outra task elegível ou combinar
com o outro `owner` antes de duplicar esforço.

## Padrão de commits vinculados a tasks/ADRs

Mantém *Conventional Commits* (já exigido no `AGENTS.md` raiz). Subject:

```text
<type>(<scope>): <description>
```

Exemplos:

```text
feat(connector-server): add tenant connection registry
test(connector-server): verify tenant isolation
refactor(connector-server): decouple database listener
docs: record tenant identity decision
ci: add connector server build
```

Não inclua o identificador da task no subject — vincule via footer:

```text
Task: TASK-0010
Task-File: docs/tasks/0010-implement-tenant-readonly-capability.md
```

Quando houver ADR diretamente relacionado ao commit, inclua também:

```text
ADR: ADR-0004
ADR-File: docs/decisions/0004-titulo.md
```

Exemplo completo:

```text
feat(connector-server): add tenant connection registry

Task: TASK-0010
Task-File: docs/tasks/0010-implement-tenant-readonly-capability.md
ADR: ADR-0004
ADR-File: docs/decisions/0004-titulo.md
```

Para mudanças cross-module, o `scope` pode ser omitido (`feat: ...`, `test: ...`).

### Checkpoints de commit

Crie commits em **checkpoints semanticamente completos** — não é necessário esperar o fim de
uma task grande para o primeiro commit, nem espremer tudo em um único commit gigante ao final.
Uma mesma task pode gerar vários commits, todos vinculados a ela, por exemplo:

```text
docs: record persistence decision
feat(connector-server): add tenant datasource registry
test(connector-server): verify cross-tenant isolation
refactor(connector-server): migrate hospitalar repository
```

Evite o extremo oposto — commits microscópicos sem valor semântico (ex. um commit por linha
alterada).

### Progresso dentro da task

As notas de progresso (seção "Notas de progresso" do template) devem registrar eventos
relevantes da execução, incluindo o hash curto de commits já realizados, quando útil para
retomada:

```text
- 2026-08-07 — Registry inicial implementado. Commit: `abc1234`
- 2026-08-07 — Testes de isolamento adicionados. Commit: `def5678`
```

Não é possível (nem necessário) registrar dentro da mensagem de um commit o hash do próprio
commit sendo criado — esse registro acontece depois, como uma atualização de nota de progresso
(que pode, por sua vez, gerar seu próprio commit, também vinculado à task).

## Workflow completo para trabalho não trivial

1. Ler o roadmap/scope relevante, se o projeto tiver um.
2. Localizar a task correspondente (ou confirmar que não existe uma e criar, se for trabalho
   novo) — sincronizando primeiro, ver "Múltiplos desenvolvedores" acima.
3. Ler a task e suas referências.
4. Ler ADRs relacionados, se existirem.
5. Reivindicar a task (protocolo de claim acima) e marcá-la como `em-andamento`.
6. Fazer discovery/spike quando necessário.
7. Criar/atualizar ADR quando houver decisão arquitetural.
8. Implementar em checkpoints coerentes.
9. Testar (regra 3 do `AGENTS.md` raiz).
10. Criar commits vinculados à task (e ao ADR, quando aplicável).
11. Registrar progresso relevante na task.
12. Validar os critérios de conclusão.
13. Marcar a task como `concluida` (ou `parcialmente-concluida`, com o motivo explícito, se parte
    do escopo foi deliberadamente deferida).

## Execução autônoma de múltiplas tasks

Estende o workflow acima para sessões longas em que um agente executa **várias tasks em
sequência** sem que o usuário precise pedir cada `TASK-NNNN` manualmente. Não é um mecanismo
paralelo — é o mesmo fluxo (roadmap/scope → task → discovery/ADR → implementação → testes →
commits → task concluída) encadeado automaticamente de uma task para a próxima elegível, **pelo
mesmo owner**.

**A regra "uma task `em-andamento` por vez" é sobre concorrência do mesmo owner, não sobre
continuidade nem sobre o projeto como um todo**: nunca duas tasks `em-andamento` ao mesmo tempo
pelo mesmo owner — mas depois de concluir integralmente uma task, o agente pode (e deve, em
execução autônoma) selecionar e iniciar automaticamente a próxima task elegível para aquele
owner, na mesma sessão, sem esperar um novo pedido do usuário. Outros owners, em outras sessões,
podem estar fazendo exatamente o mesmo em paralelo, cada um em sua própria task.

### O loop

```text
sincronizar (pull) o estado de docs/tasks/
        ↓
há task em-andamento deste owner?
   sim → continuar
   não
        ↓
encontrar próxima task elegível (não reivindicada por outro owner)
        ↓
reivindicar (protocolo de claim) e marcar em-andamento
        ↓
executar discovery/spike
        ↓
ADR quando necessário
        ↓
implementar
        ↓
testar/verificar
        ↓
commitar em checkpoints
        ↓
validar critérios de conclusão
        ↓
atualizar task
        ↓
marcar concluída (ou parcialmente-concluida, com motivo)
        ↓
commit de encerramento quando necessário
        ↓
selecionar próxima task elegível
        ↓
repetir
```

O loop para (não continua para a próxima task) quando: não há task elegível para este owner
(ver "Bloqueios" abaixo), ou a execução atinge um dos "Human gates" listados adiante.

### Seleção automática da próxima task

Quando não existir task `em-andamento` deste owner, uma task em `docs/tasks/` é **elegível**
quando, simultaneamente:

- está em `backlog`;
- **não está `adiada`** — uma task adiada é uma exceção deliberada (ver "Tasks adiadas" abaixo), não um candidato de baixa prioridade;
- não está `em-andamento` reivindicada por **outro** owner (ver "Múltiplos desenvolvedores");
- todas as tasks listadas em sua seção "Dependências" estão `concluida` (ou `parcialmente-concluida`, se o critério pendente não afeta esta task específica — julgue com cuidado, documentando a decisão);
- não possui bloqueio explicitamente registrado (nem nela, nem numa dependência ainda `bloqueada`).

Entre as tasks elegíveis, prefira nesta ordem:

1. **dependências necessárias para o próximo milestone**, se o projeto tiver um roadmap com marcos definidos;
2. **ordem definida pelo roadmap/grafo de dependências**, se existir;
3. **prioridade da task** (quando registrada explicitamente na task, ex. `**Prioridade**: crítica`);
4. **menor número da task** como critério de desempate final.

**A numeração do arquivo (`0001`, `0002`, ...) não implica ordem de execução obrigatória** — é
só o identificador estável (`TASK-NNNN`). A ordem real de execução é sempre determinada por
este algoritmo (dependências → roadmap → prioridade → número), não pela sequência numérica dos
arquivos.

Se **nenhuma** task estiver elegível para este owner (todas as `backlog` restantes têm
dependência pendente, estão reivindicadas por outro owner, ou tudo já está
`concluida`/`bloqueada`/`adiada`/`cancelada`), o agente deve **parar** e explicar ao usuário o
grafo de bloqueio — quais tasks faltam, o que cada uma espera, e por que nenhuma pode começar
agora. Não invente trabalho fora de `docs/tasks/` só para preencher a sessão.

### Tasks adiadas

Uma task pode ser marcada `status: adiada` quando o responsável pelo projeto decide
conscientemente adiar sua execução, mesmo que ela continue tecnicamente válida, necessária e
(possivelmente) crítica em severidade. Diferença importante em relação a simplesmente ter baixa
prioridade: uma task adiada **não entra na disputa de prioridade nenhuma** — ela é removida do
conjunto de tasks elegíveis até que a decisão de adiamento seja revista.

Regras:

- Uma task `adiada` **nunca** é selecionada automaticamente pelo algoritmo acima, independentemente de severidade/prioridade registrada nela.
- Uma task `adiada` **não bloqueia** nenhuma outra task — se alguma task viesse a depender dela, essa dependência precisaria ser resolvida separadamente.
- Não repita a pergunta sobre executar uma task adiada a cada execução — a decisão já foi tomada e registrada; só volte a perguntar se o próprio usuário trouxer o assunto de volta.
- Uma task adiada só é executada por: (a) solicitação explícita do usuário, ou (b) o roadmap chegar ao ponto/milestone definido para ela, se existir.
- **O adiamento não é resolução**: o programa de trabalho como um todo não deve ser considerado encerrado enquanto existir uma task `adiada` sem uma decisão final registrada (executada, ou formalmente replanejada/cancelada com justificativa) — ver "Encerramento do programa" abaixo.
- Ao marcar uma task como `adiada`, registre nas notas de progresso: quem decidiu adiar, por quê, e sob qual condição volta a ser considerada.

### `parcialmente-concluida`: diferente de `bloqueada` e de `concluida`

Use este status quando parte real dos critérios de conclusão foi entregue e validada, e o
restante foi **deliberadamente** deferido — não porque algo travou (isso é `bloqueada`), mas
porque concluir o resto agora seria arriscado, prematuro, ou depende de uma decisão que ainda
não tem evidência suficiente. Sempre acompanhado, nas notas de progresso, de:

- exatamente quais critérios foram cumpridos e quais não;
- o motivo específico do diferimento (não "faltou tempo" genérico);
- se o restante foi desmembrado em uma task nova (`TASK-NNNN`, referenciada aqui) ou permanece
  como pendência nesta mesma task para retomada futura.

Nunca marque `concluida` uma task com critérios reais não atendidos só para "fechar o ciclo" —
`parcialmente-concluida` existe exatamente para não forçar essa escolha binária.

### Encerramento do programa

Antes de declarar um programa de trabalho (ex. um roadmap inteiro, ou um marco relevante dele)
como concluído, verifique se existe alguma task `adiada` ou `parcialmente-concluida` sem
decisão final registrada. Se existir, o programa **não** está encerrado — está encerrado *com
uma exceção pendente*, e isso precisa ser dito explicitamente ao usuário, não omitido.

### Commits e push durante execução autônoma

Mesmo padrão de sempre (ver "Padrão de commits vinculados a tasks/ADRs" acima), com estes
pontos reforçados especificamente para sessões longas e autônomas:

- Conventional Commits, footer `Task`/`Task-File`/`ADR`/`ADR-File` vinculado à task real em andamento.
- Commits em checkpoints semanticamente completos — uma task pode (e frequentemente deve) gerar vários commits.
- Atualize as notas de progresso quando útil para retomada, incluindo hash curto de commits relevantes.
- **Push**: depois de checkpoints concluídos, faça push — desde que isso seja compatível com as regras já vigentes do repositório (branch atual, sem mudar de branch, sem criar branch nova). Se algo no ambiente impedir concluir isso com segurança (ex. upstream divergente, conflito), trate como um ponto a esclarecer, não como algo a forçar.
- **Nunca** force push.
- **Nunca** amend/rebase de histórico compartilhado sem autorização explícita do usuário — isso vale mesmo em execução autônoma; a autonomia é sobre encadear tasks, não sobre reescrever histórico.
- Só marque uma task como `concluida` depois de validar **todos** os critérios de conclusão listados nela — nunca por inferência ou porque "já deu pra entender que funciona".

### ADRs dentro do loop

Quando uma task exigir decisão arquitetural, o agente **não deve parar a execução autônoma só
porque um ADR precisa ser criado**. Em vez disso:

1. Faça o discovery/spike necessário (ver "Discovery/Spike" acima).
2. Confronte as alternativas com o roadmap/scope e a arquitetura documentada do projeto, quando existirem — a decisão precisa ser sustentada pelo que já está documentado, não inventada do zero.
3. Crie o ADR conforme as regras já existentes ("Registro de decisões" abaixo).
4. Registre a relação com a task (campo `Task relacionada` no ADR; link nas notas de progresso da task).
5. **Continue automaticamente** se houver evidência suficiente para uma decisão responsável.

Só pare para pedir decisão humana quando a escolha não tiver evidência suficiente para ser
tomada de forma responsável — ver "Human gates" a seguir, especificamente o segundo item.

### Human gates

A execução autônoma para e solicita decisão/intervenção humana **somente** quando ocorrer algo
como:

- decisão de produto não definida por nenhuma fonte do projeto (roadmap, architecture docs, scope, ADRs existentes);
- alternativas arquiteturais materialmente diferentes sem evidência suficiente para escolher com responsabilidade;
- operação destrutiva ou irreversível;
- risco real de perda ou corrupção de dados;
- alteração de infraestrutura externa/produção que exija autorização;
- rotação de credenciais/secrets reais em serviço externo;
- necessidade de reescrever histórico Git;
- necessidade de credencial ou acesso que o agente não possui;
- contradição relevante entre roadmap, task e ADR que não pode ser resolvida só com leitura mais cuidadosa;
- critério de aceite impossível de cumprir sem mudar o escopo da task;
- qualquer ação com impacto externo que não possa ser revertida de forma razoável.

**Não use human gate para decisões triviais de implementação.** Prefira sempre resolver
autonomamente questões técnicas reversíveis que já estejam sustentadas pelas regras e pela
arquitetura aprovada — parar para perguntar algo que já está respondido na documentação do
projeto quebra o propósito da execução autônoma.

### Bloqueios

Se uma task específica bloquear durante a execução:

1. Registre o motivo do bloqueio na própria task (seção "Notas de progresso") — não é necessário um campo novo no template, use o que já existe.
2. Mude o `status` da task para `bloqueada` quando apropriado (bloqueio que não se resolve dentro da sessão atual).
3. Verifique se existe outra task elegível **independente** desse bloqueio, para este mesmo owner (ver "Seleção automática da próxima task").
4. Se existir, continue nela normalmente.
5. Se não existir, **pare** e apresente o bloqueio ao usuário — mesma regra de "nenhuma task elegível" acima.

**Nunca contorne uma dependência apenas para continuar trabalhando** — implementar algo fora de
ordem porque a task dependente parece "fácil de adiantar" quebra a garantia que o grafo de
dependências existe para dar.

### Verificação entre tasks

Antes de avançar automaticamente de uma task concluída para a próxima, confirme que:

- a working tree está em estado conhecido (sem mudanças soltas não commitadas e não intencionais);
- os commits da task anterior foram de fato criados (não só planejados);
- os testes/verificações aplicáveis àquela task passam;
- todos os critérios de conclusão da task anterior estão atendidos (ou o diferimento parcial está documentado, ver `parcialmente-concluida`);
- a task anterior está atualizada (`status` correto, notas de progresso finais);
- nenhum side effect inesperado permanece (ex. processo em background, arquivo temporário, estado de teste não revertido).

**Uma falha não resolvida não pode ser escondida simplesmente avançando para outra task
dependente.** Se algo dessa lista não está OK, isso é o próprio bloqueio a resolver (ver
"Bloqueios" acima) — não um detalhe a ignorar para manter o loop rodando.

### Contexto mínimo por task

Ao iniciar cada task dentro do loop, recarregue apenas o necessário para aquela task específica:

```text
AGENTS.md aplicáveis (raiz + módulo tocado)
+
docs/SCOPE.md + docs/ROADMAP_IMPLEMENTACAO.md (e a seção relevante de docs/ESPECIFICACAO.md)
+
task atual (docs/tasks/NNNN-*.md)
+
documentos de arquitetura referenciados na seção "Referências" daquela task
+
ADRs relacionados (se houver)
```

**Não carregue toda a documentação de arquitetura do projeto indiscriminadamente a cada task**
— se o projeto divide documentação temática por domínio, isso existe exatamente para evitar
esse desperdício. Uma sessão autônoma executando várias tasks em sequência precisa preservar
contexto ao longo de toda a execução; recarregar documentação irrelevante à task atual é o
jeito mais rápido de esgotar esse orçamento antes da última task do lote.

## Registro de decisões (`docs/decisions/`)

Mecanismo de registro de decisões técnicas (ADR — *Architecture Decision Record*, formato
leve), exigido pela regra 2 do `AGENTS.md` raiz. **É responsabilidade do agente manter isso
atualizado**, não do usuário — o objetivo é que uma sessão futura (do mesmo agente, de outro,
ou de outro desenvolvedor) não tome uma decisão que contradiga silenciosamente uma já tomada.

- Um arquivo Markdown por decisão, em português, nomeado `NNNN-titulo-curto-em-kebab-case.md`, numeração sequencial começando em `0001` (o `0000-template.md` é só o modelo, não uma decisão real). Identificador estável: `ADR-<número>`.
- Use o template em `0000-template.md` (seções: Contexto, Decisão, Alternativas consideradas, Consequências; mais os campos `ADR ID`, `Task relacionada` e `Validade` no cabeçalho).
- **Antes** de tomar esse tipo de decisão, procure nesta pasta se já existe algo relacionado ao mesmo problema/módulo — sincronize (`git pull`) primeiro, outro desenvolvedor pode ter registrado algo recentemente.
- Se uma decisão antiga for revertida ou substituída, não a apague — marque o `Status` dela como `substituída por 000X` e crie o novo registro, preservando o histórico do porquê.

### Quando criar uma ADR (e quando não criar)

**Não crie uma ADR apenas para repetir um requisito que uma SPEC já prescreve de forma
inequívoca.** Se a SPEC já diz, sem ambiguidade, "usar X" ou "não fazer Y", isso não é uma
decisão do agente — é a SPEC sendo transcrita em formato de ADR, o que infla `docs/decisions/`
sem registrar nenhuma escolha que outro agente pudesse ter tomado diferente por falta de
informação (o problema que este mecanismo existe para evitar).

Fluxo esperado para o caso comum (decisão nascida de uma questão que a SPEC deixou aberta):

```text
SPEC deixa questão aberta (hipótese/experimento, ou "decidir na implementação")
        ↓
discovery / implementação / benchmark
        ↓
alternativas reais avaliadas
        ↓
decisão
        ↓
ADR
```

Também é válido criar uma ADR para uma **decisão arquitetural transversal relevante**, tomada
conscientemente já durante a fase de especificação (ex. um princípio que atravessa várias
SPECs, ou uma escolha de stack/convenção de dados feita antes de qualquer discovery) — desde que
seja de fato uma escolha entre alternativas reais, não apenas a citação de uma regra que a SPEC
já fixa sem alternativa.

**Não crie registro para decisões triviais** (nome de variável, formatação, escolha óbvia sem
alternativa real) — reserve ADRs para escolhas que causariam retrabalho ou conflito se outro
agente as refizesse de forma diferente.

Esta régua vale para decisões novas a partir de agora — **não** é motivo para apagar, consolidar
ou reescrever ADRs já existentes num projeto quando esta skill for executada como refresh; ADRs
antigas que pareceriam desnecessárias sob este critério permanecem válidas como estão.

### Validade contextual (`Validade` no cabeçalho)

O cabeçalho de uma ADR pode declarar `Validade: permanente` (padrão, decisão estrutural sem
prazo previsto) ou `Validade: <fase/contexto>` (ex. `Validade: Phase 0`) para decisões
deliberadamente temporárias — por exemplo, uma escolha de v0 sujeita a mudança com evidência
futura, ou uma decisão que herda uma hipótese experimental ainda não confirmada. Isso é
independente do campo `Status` (`proposta`/`aceita`/`substituída por 000X`): uma ADR pode estar
`Status: aceita` e ainda assim `Validade: Phase 0` — aceita como base de trabalho atual, mas não
necessariamente permanente. Não é obrigatório preencher `Validade` retroativamente em ADRs já
existentes de um projeto; use o campo a partir de agora quando fizer sentido.

## Gerenciamento de tasks (`docs/tasks/`)

Padrão exigido pela regra 4 do `AGENTS.md` raiz para que o trabalho continue coerente entre
sessões diferentes de agente e entre desenvolvedores diferentes — a ferramenta interna de tasks
da sessão é efêmera e não sobrevive ao fim da conversa; `docs/tasks/` é a persistência entre
sessões e entre pessoas.

- Um arquivo Markdown por task, nomeado `NNNN-titulo-curto-em-kebab-case.md`, numeração sequencial começando em `0001` (`0000-template.md` é só o modelo). Use o template em `0000-template.md` (seções: Objetivo, Dependências, Critérios de conclusão, Referências, Notas de progresso). Identificador estável: `TASK-<número>`.
- Frontmatter YAML com `status` (`backlog` | `em-andamento` | `concluida` | `bloqueada` | `adiada` | `parcialmente-concluida` | `cancelada`), `modulo` (qual diretório/`AGENTS.md` ela toca), `owner` (quem está com ela, ver "Múltiplos desenvolvedores") e `criado-em`.
- **Dependências**: liste outras tasks (`TASK-NNNN`) que precisam estar concluídas antes desta começar. Uma task com dependências pendentes deve permanecer `backlog`, não `em-andamento`.
- **Referências**: aponte só para os documentos necessários àquela task especificamente — não copie conteúdo extenso do roadmap para dentro da task.
- **Ao iniciar trabalho em algo não trivial**: sincronize (`git pull`) e verifique se já existe uma task relacionada em `docs/tasks/` antes de criar uma nova — evita duplicar ou trabalhar em paralelo/conflito com outra sessão ou outro desenvolvedor.
- **Ao longo do trabalho e ao final da sessão**: atualize o `status` e adicione uma entrada em "Notas de progresso" — isso é responsabilidade do agente, não do usuário. Nunca deixe uma task como `em-andamento` sem notas de progresso recentes.
- Task concluída não é apagada — muda `status` para `concluida` (ou `parcialmente-concluida`) e permanece como histórico.
- Diferença para `docs/decisions/`: uma task registra **o que precisa ser feito e o andamento**; uma decisão registra **uma escolha técnica e por quê**. Uma task pode gerar uma ou mais decisões — linke-as nas notas de progresso (e, no ADR, use o campo `Task relacionada`).

## Documentos de produto e roadmap deste projeto

Este projeto não usa specs formais (`docs/specs/`). A camada equivalente a "scope/roadmap" é:

- [`docs/SCOPE.md`](SCOPE.md) — escopo atual e direção (mantido pelo usuário/time).
- [`docs/ESPECIFICACAO.md`](ESPECIFICACAO.md) — especificação de produto (módulos funcionais, perfis, multi-tenant).
- [`docs/MODELAGEM_BANCO.md`](MODELAGEM_BANCO.md) — pré-modelagem do banco (PostgreSQL).
- [`docs/ROADMAP_IMPLEMENTACAO.md`](ROADMAP_IMPLEMENTACAO.md) — roadmap original por fases, com checklist de progresso.
- [`docs/PLANO_MELHORIAS_BENCHMARK.md`](PLANO_MELHORIAS_BENCHMARK.md) — evolução do produto pós-benchmark (com base em [`ANALISE_CONCORRENTE_AGEENDLY.md`](ANALISE_CONCORRENTE_AGEENDLY.md)).
- [`docs/REFORMULACAO_FRONTEND.md`](REFORMULACAO_FRONTEND.md) — padrões visuais do frontend Vue atual.

Registros persistentes: decisões em [`docs/decisions/`](decisions/) (regra 2 do [`AGENTS.md` raiz](../AGENTS.md)) e tasks em [`docs/tasks/`](tasks/) (regra 4).
