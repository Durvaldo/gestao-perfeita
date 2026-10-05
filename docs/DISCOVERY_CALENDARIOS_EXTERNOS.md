# Discovery — integração da agenda com Google Agenda e Alexa

> Resultado da [`TASK-0035`](tasks/0035-discovery-integracao-calendarios.md) para a [SPEC-0006](specs/SPEC-0006.md). Pesquisa feita em 2026-10-04. Nada foi implementado. A escolha final é do responsável.

## Resumo

- A hipótese da SPEC ("o feed ICS resolve o caso principal sem OAuth") **se confirma só em parte**:
  - no **Apple Calendar** (iPhone) e no Outlook, o feed ICS funciona bem;
  - no **Google Agenda**, o calendário assinado por URL só atualiza **a cada 12 a 24 horas**, e não há botão para forçar. Um encaixe feito de manhã pode não aparecer no celular do barbeiro no mesmo dia.
- **A Alexa não lê calendários assinados por URL.** Ela só lê calendários das contas vinculadas (Google, Microsoft, Apple). Ou seja, o feed ICS **não** resolve a Alexa, nem passando pelo Google.
- Para Google em tempo real e para a Alexa, o caminho é a **Google Calendar API**: o sistema grava os agendamentos num calendário da própria conta Google do profissional. Isso exige um app OAuth verificado pelo Google.

## Alternativas avaliadas

| | 1. Link "Adicionar ao Google Agenda" | 2. Feed ICS por profissional | 3. Google Calendar API (OAuth) |
|---|---|---|---|
| Como funciona | Botão em cada agendamento abre o Google Agenda com o evento preenchido | URL secreta `/api/calendar/{token}.ics` que o profissional assina uma vez | O profissional conecta a conta Google; o sistema cria e atualiza os eventos na hora |
| Atualização | Manual, um agendamento por vez; remarcação e cancelamento não chegam | Apple: ~15 min. **Google: 12–24 h** | Imediata |
| Alexa | Sim, se o evento for salvo no calendário principal, mas manual | **Não** | Sim (calendário da conta vinculada; ver "A confirmar") |
| Custo de implementação | Muito baixo (montar uma URL) | Baixo: um endpoint que gera ICS, um token por profissional e a tela para copiar o link | Médio/alto: OAuth, guarda e renovação de tokens, sincronização em fila, tratamento de revogação e de falha |
| Custo de operação | Nenhum | Nenhum (um GET por assinante de tempos em tempos) | Cota gratuita folgada (600 requisições/min por usuário); o custo real é manter a verificação do app |
| O que o usuário configura | Nada | Colar a URL no calendário uma vez | Clicar em "Conectar Google" e autorizar |
| Riscos | Eventos desatualizados | O link vaza = a agenda vaza (mitigar com token revogável); atraso do Google | Depende da verificação do Google; tokens são dados sensíveis (LGPD); a API muda |
| Dependências externas | Nenhuma | Nenhuma | Projeto no Google Cloud, **verificação do app** (escopo sensível: vídeo de demonstração, política de privacidade e domínio próprio, de 3 a 5 dias úteis depois do envio), deploy em produção (Fase 4) |

## Escopo OAuth (se a alternativa 3 for escolhida)

- Pela regra de escopo mínimo do Google, o certo é **`calendar.app.created`**: o app cria **um calendário secundário próprio** ("Agenda da Barbearia") e só mexe nele. Não precisa ler nem alterar o resto da agenda pessoal do profissional.
- `calendar.events` ("ver e editar eventos em todas as agendas") é escopo **sensível** e mais amplo que o necessário. Só faria sentido para a sincronização bidirecional (bloquear a agenda do sistema com eventos pessoais do Google), que exigiria também ler a agenda pessoal.

## A confirmar antes de implementar a alternativa 3

- Se a Alexa lê um **calendário secundário criado pelo app** na conta vinculada. A configuração da Alexa permite escolher calendários da conta, então tudo indica que sim, mas os relatos encontrados falam de calendários *assinados* e *compartilhados*, não de secundários próprios. Testar com uma conta real.
- A classificação de sensibilidade de `calendar.app.created` no Cloud Console. A documentação pública não a traz.

## Recomendação

1. **Agora, sem dependência externa**: o **link "Adicionar ao Google Agenda"** (alternativa 1) no detalhe do agendamento e o **feed ICS** por profissional (alternativa 2), anunciado como "funciona na hora no iPhone; no Google Agenda pode demorar algumas horas". Os dois são baratos e cobrem quem usa o calendário do iPhone.
2. **Depois do deploy em produção (Fase 4)**, se houver demanda por Google em tempo real ou pela Alexa: a **sincronização pela Google Calendar API**, só de ida (do sistema para o Google), num calendário secundário com `calendar.app.created`. Isso exige criar o projeto no Google Cloud e passar pela verificação, que são decisão e conta do responsável.
3. **Não** fazer uma skill própria da Alexa: a alternativa 3 já entrega a Alexa sem ela.

## Fontes

- Atualização dos calendários assinados no Google: [Carly — Google Calendar ICS refresh rate](https://usecarly.com/blog/google-calendar-ics-refresh-rate/), [Nocal — Why subscribed calendars don't update instantly](https://nocal.app/help/ics-and-subscriptions/why-subscribed-calendars-dont-update-instantly), [UW–Madison KB — Subscribe to a published calendar](https://kb.wisc.edu/education/154693).
- Alexa e calendários assinados ou compartilhados: [Amazon Forum — How can I get Alexa to read events from a "subscribed to" calendar?](https://www.amazonforum.com/s/question/0D54P00007T2n95SAB/how-can-i-get-alexa-to-read-events-from-a-subscribed-to-calendar), [Carly — How to sync your calendar with Alexa](https://www.usecarly.com/blog/how-to-sync-calendars-with-alexa/), [CalendarBridge — Sync calendars with Alexa](https://calendarbridge.com/blog/how-to-sync-calendars-with-amazon-alexa/).
- Escopos e verificação do Google: [Google — Calendar API scopes](https://developers.google.com/calendar/api/auth), [Google — Sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification), [Nylas — Google verification guide](https://developer.nylas.com/docs/dev-guide/provider-guides/google/google-verification-security-assessment-guide).
- Cota da Calendar API: [Nylas CLI — Google Calendar API quotas](https://cli.nylas.com/guides/google-calendar-api-quotas).
