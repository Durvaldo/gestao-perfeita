# Análise do Concorrente: Ageendly (ageendly.com)

> Análise realizada em 15/07/2026 navegando no painel administrativo (`dashboard.ageendly.com`, loja de teste "Teste Barbearia") e no site público de agendamento (`ageendly.com/teste-barbearia`), incluindo testes práticos do fluxo de agendamento do cliente.

---

## 1. Resumo executivo

O Ageendly é uma plataforma de agendamento **verticalizada para barbearias e salões de beleza** (não é uma ferramenta genérica de agenda). O produto é composto por três peças:

1. **Painel administrativo** (dashboard) para o dono/profissionais gerenciarem agenda, clientes, serviços, produtos, finanças e o site.
2. **Site público de agendamento** gerado automaticamente para cada loja (`ageendly.com/slug-da-loja`), com editor visual no-code.
3. **Área do cliente** (self-service) para o cliente ver/cancelar agendamentos, sem necessidade de senha — a identidade é o número de telefone.

O grande diferencial que você pediu para investigar — **o agendamento reconhece o cliente pelo telefone e pula a etapa de nome** — foi confirmado e é a peça central da baixa fricção do produto. Detalhes na seção 4.

---

## 2. O fluxo de agendamento do cliente (o pedido principal)

Testado em `ageendly.com/teste-barbearia`, simulando um cliente real, com o site em modo anônimo (cookies limpos) entre os testes para garantir resultados fiéis.

### Passo a passo (cliente novo, primeira vez na loja)
1. Landing page do salão → botão **"Agendar"** ou botão "Agendar" dentro do card de cada serviço.
2. Modal **"Selecione os serviços"**: lista todos os serviços com preço e duração, permite selecionar **múltiplos serviços** no mesmo agendamento (soma tempo e preço automaticamente).
3. Modal **"Selecione uma Data e horário"**: carrossel de dias (mostra "Hoje", depois dias da semana abreviados), dias sem expediente aparecem riscados/desabilitados (ex.: sábado, pois o profissional de teste não atende aos fins de semana). Ao escolher o dia, aparecem os horários livres em grade (ex.: 15:45, 16:00, 16:30...). **Horários já ocupados por outro agendamento somem da lista automaticamente** (testamos e confirmamos isso em tempo real).
4. Modal **"Digite seu Número de Telefone"**: único campo, com máscara automática brasileira `(99) 99999-9999`.
5. Modal **"Digite seu Nome"** — **só aparece se o telefone digitado for novo/desconhecido para a loja**. Mostra o aviso "Ao avançar, seu agendamento será confirmado."
6. Tela final **"Agendamento confirmado!"** com resumo (serviço, profissional, data/hora, total) e três ações:
   - **"Adicionar à agenda"** → link direto para Google Calendar (evento pré-preenchido).
   - **"Falar com profissional"** → link `wa.me` do WhatsApp do profissional, com mensagem pronta ("Olá [Nome]! Tenho um agendamento de [Serviço] no dia [data] às [hora].").
   - **"Cancelar agendamento"** → cancelamento self-service imediato.

Não há e-mail, senha, CPF, nem qualquer etapa de pagamento antecipado. Do clique em "Agendar" até a confirmação: **4 telas, ~15-20 segundos, só telefone (+ nome na 1ª vez)**.

### Passo a passo (cliente que já tem telefone cadastrado na loja) — o comportamento que você pediu para investigar
Repetimos o fluxo completo em uma aba/sessão **sem cookies** (simulando um "novo dispositivo") usando o telefone de uma cliente já existente no CRM da loja (Paula Vadão, `(14) 99678-5059`):

- Etapas 1-3 (serviço, data, horário): idênticas.
- Etapa 4 (telefone): pedida normalmente, pois é sessão nova sem cookie.
- **Etapa 5 (nome): pulada por completo.** Ao clicar "Próximo" depois do telefone, foi direto para a tela "Agendamento confirmado!", já teria usado o nome "Paula Vadão" salvo no cadastro.

Ou seja, a regra é: **o backend identifica o cliente pelo número de telefone (independente de cookie/sessão do navegador) e, se já existe um cadastro com aquele número na loja, pula a etapa de nome.** Isso é reconhecimento no servidor, não apenas "lembrar no navegador".

Também testamos o caso de **mesma sessão/navegador**, repetindo um agendamento com um telefone que tínhamos acabado de cadastrar: nesse caso, a segunda vez **pulou tanto o telefone quanto o nome** — o site foi direto de "escolher horário" para "confirmado". Isso indica que, além do reconhecimento por telefone no servidor, existe uma camada de sessão local (cookie/localStorage) que mantém o cliente "logado" no navegador após o primeiro agendamento, evitando digitar o telefone de novo.

### ⚠️ Ponto de atenção (segurança/privacidade) a observar, não necessariamente a copiar
Não há nenhuma verificação do número de telefone (sem OTP/SMS de confirmação). Ao digitar o telefone de "Paula Vadão" no fluxo de agendamento, o site não só pulou o nome como também **logou automaticamente a sessão como Paula Vadão** — abri a página "Sua Conta" e caiu direto no perfil dela, com nome, telefone, agendamentos futuros e histórico visíveis, sem pedir nenhuma confirmação. Ou seja, **qualquer pessoa que souber o telefone de um cliente pode ver e mexer na conta dele** (cancelar agendamentos, ver histórico, editar dados). Isso é uma troca consciente de segurança por fricção zero — vale decidirmos deliberadamente se replicamos esse nível de risco ou adicionamos um mínimo de verificação (ex.: SMS OTP) sem comprometer muito a velocidade do fluxo.

---

## 3. Área "Sua Conta" do cliente (self-service)

Acessível pelo menu do site público (`/teste-barbearia/account`), sem login formal — a identidade vem do telefone reconhecido na sessão:

- Editar nome, telefone e **data de aniversário** (aniversário só pode ser preenchida uma vez — provavelmente para impedir abuso do fluxo de "cupom de aniversário").
- Toggle **"Repetir último agendamento"**: liga uma opção de repetir o último serviço/horário rapidamente em agendamentos futuros.
- Lista de **"Agendamentos"** futuros, com opção de gerenciar/cancelar cada um (ícone de menu por item).
- **"Histórico"**: agendamentos passados e cancelados.
- Botão "Sair".

---

## 4. Site público / Editor de site (Personalizar Site)

- Site de página única (landing page) gerado automaticamente por loja, com seções: Início (hero + destaque "Fade Premium"), Serviços (cards com preço/duração e botão Agendar), Contato.
- **Editor visual (WYSIWYG) no próprio dashboard**, com preview ao vivo lado a lado:
  - Escolha de "Tipo de interface": **"Website + Chat"** (marcado com coroa 👑, ou seja, recurso pago/premium).
  - Escolha de modelo/template ("Modelo Minimalista" era o único visível no teste).
  - Cor primária customizável (color picker).
  - Toggle "Botões de Edição" — ativa ícones de lápis sobre cada bloco de texto/imagem da página para edição inline, direto no preview.
  - Toggle "Mostrar Chatbot" — prévia de um chatbot no site (ícone de robô aparece no header do site também).
  - Aviso proativo: "Configure seu Instagram, número da loja e endereço para o modelo ficar completo", com link direto para a página de configuração faltante.
- Link customizável (slug da URL da loja), QR code para divulgação, botão de compartilhar direto no WhatsApp com mensagem/template pré-configurável (com variáveis como Nome da Loja e Link da Loja).

---

## 5. Painel administrativo — funcionalidades por seção

| Seção | O que faz |
|---|---|
| **Painel Gerencial** | Dashboard inicial: agendamentos de hoje, produtos vendidos, atalhos (Novo Agendamento, Vender Produto, Relatório), próximos horários, caixa de lembretes/notificações internas, card de compartilhamento da loja. |
| **Caixa de Entrada** | Feed de notificações internas em tempo real (ex.: "Novo agendamento marcado! Paula Vadão marcou Pezinho... há 3 minutos"), com contagem de não lidas. |
| **Perfil Profissional** | Dados pessoais visíveis ao cliente (nome, e-mail, telefone, descrição/bio), toggle de notificações no navegador, atalho para editar horário de atendimento, e **"Zona de Perigo" com apagar conta**. |
| **Assinatura** | Gestão de plano e cobrança (ver seção 7 — planos e preços). |
| **Agendamentos (Agenda)** | Visão de calendário por dia (semana em abas Dom-Sáb), toggle para "visão compacta"/lista, criação manual de agendamento via painel lateral (profissional, serviços, data/hora, valor pago), totais de receita do dia/semana. |
| **Relatório** | Dashboard de BI: faturamento, recebido vs. a receber (pendente), total de agendamentos com breakdown (concluídos/pendentes/cancelados), tempo total em atividade e média por atendimento, desempenho por serviço, produtos mais vendidos, despesas — tudo filtrável por profissional e período, com **exportação em PDF**. |
| **Despesas** | Controle financeiro de custos do negócio (não explorado a fundo). |
| **Clientes (CRM)** | Lista de clientes com busca por nome/telefone e filtros: "Ativos", "Aniversariantes", **"Sem agendar há [7/15/20/30/45/60/90 dias]"** (ótimo para campanhas de reativação). Perfil individual do cliente mostra: nota privada ("o dono vê, o cliente não"), toggle "Está banido", toggle de notificações por cliente, campo de "dias para remarketing" customizado por cliente, ticket médio, tempo total, número de cancelamentos, e histórico de serviços realizados com quantidade. |
| **Serviços** | CRUD de serviços com nome, preço, duração e categorias. |
| **Produtos** | Controle de estoque com "Movimentações" (entradas/saídas), venda de produtos avulsa (separada do agendamento de serviço). |
| **Horários Fechados** | Bloqueio de datas/horários (feriados, folgas) — não explorado a fundo, mas existe como seção própria separada dos horários de expediente. |
| **Profissionais** | Gestão de equipe: convites pendentes, capacidade do plano (ex.: "1/15" profissionais), e por profissional: % de comissão, quais serviços realiza, e **horário de atendimento próprio** (dia a dia, com horário de início/fim e pausa para almoço configuráveis, e toggle aberto/fechado por dia). |
| **Personalizar Site** | Ver seção 4. |
| **Configurar Lembretes (Notificações)** | Canal de notificação ao cliente: **apenas "Desativado" ou "Notificações Push"** no plano testado (WhatsApp aparece como recurso dos planos pagos, ver seção 7, mas não estava disponível para seleção no teste — possivelmente requer configuração adicional). Eventos automáticos configuráveis (liga/desliga): Confirmação de Agendamento, Cancelamento (para profissional e para cliente), Lembrete de Agendamento, **Aniversário (parabeniza + oferece desconto especial)**, e **Remarketing (convida cliente de volta após período sem agendar)**. |
| **Compartilhar** | Link da loja, QR code, botão "Compartilhar no WhatsApp", customização do slug da URL e da mensagem de compartilhamento. |
| **Dados da Loja** | Identidade (nome, link, segmento: Barbearia/Salão de Beleza), contato (telefone, Instagram, endereço completo com CEP/estado), e bloco **"Agendamento e Privacidade"**: toggle "Loja Pública" (desligar tira o site do ar para clientes), "Janela de Agendamento" (quantos dias no futuro o cliente pode marcar), "Antecedência Mínima para Agendamento" (de 5 min a 7 dias), "Permitir Cancelamento" (cliente pode cancelar sozinho) e "Antecedência para Cancelamento" (até quanto tempo antes). |

---

## 6. Criação de agendamento pelo lado do profissional (painel)

Ao clicar em "Novo Agendamento" no painel, abre um drawer lateral com: seleção de Profissional, seleção de Serviços (múltiplos), Data e Horário, e bloco de Pagamento com "Valor Pago" e campo de desconto — ou seja, o profissional pode registrar manualmente um agendamento (walk-in) e já lançar o pagamento recebido.

---

## 7. Planos e preços (Assinatura)

A loja de teste estava em **período de trial (15 dias restantes)**. Três planos:

| Plano | Preço | Limite de profissionais | Recursos extras |
|---|---|---|---|
| **Solo** | R$ 29,90/mês | 1 profissional | Agenda online ilimitada, site personalizado, suporte por e-mail |
| **Premium** | R$ 59,90/mês | Até 4 profissionais | **Notificações por WhatsApp**, modelos premium exclusivos de site, suporte prioritário |
| **Completo** | R$ 149,90/mês | Até 15 profissionais | WhatsApp ilimitado, **site exclusivo feito sob medida**, suporte individual |

Ponto relevante: **notificação via WhatsApp é feature paga** (Premium+), enquanto o plano de entrada só oferece push notification (gratuita, mas depende do cliente permitir notificações no navegador/PWA — canal mais frágil que WhatsApp/SMS no público brasileiro).

---

## 8. Principais pontos fortes do Ageendly (o que vale estudar/copiar)

1. **Fricção mínima no agendamento**: telefone é a única credencial; nome só na primeira vez; sem senha, sem e-mail, sem pagamento obrigatório antes.
2. **Reconhecimento de cliente recorrente pelo telefone no servidor** (não só cookie), poupando digitação toda vez que o mesmo número agenda de qualquer dispositivo.
3. **Ações pós-confirmação bem pensadas**: calendário (Google Calendar), WhatsApp direto com o profissional com mensagem pronta, e cancelamento self-service — tudo na mesma tela, sem precisar caçar em outro lugar.
4. **CRM com filtro de inatividade** ("sem agendar há X dias") pronto para campanhas de reativação, e remarketing automático configurável por evento (aniversário, sumiço do cliente).
5. **Editor de site no-code com preview ao vivo e edição inline** — reduz a barreira para o dono personalizar o site sem depender de suporte técnico.
6. **Configurações finas de política de agendamento**: janela máxima de antecedência, antecedência mínima, política de cancelamento — tudo pelo lojista, sem precisar de código.
7. **Compartilhamento pronto para uso**: link + QR code + mensagem de WhatsApp pré-formatada — facilita a divulgação boca a boca, que é o canal mais comum desse nicho.
8. **Relatórios com exportação em PDF e granularidade por profissional** — útil para donos de barbearia com equipe e comissionamento.

## 9. Pontos fracos / oportunidades de diferenciação

1. **Sem verificação real do número de telefone** (falha de segurança/privacidade, ver seção 2) — poderíamos nos diferenciar oferecendo o mesmo nível de fricção baixa, mas com um mínimo de verificação (ex.: código por SMS apenas na primeira vez, e depois cookie de confiança).
2. **Notificação ao cliente limitada a push no plano de entrada** — push é pouco confiável no Brasil (depende de PWA instalado/permissão concedida); WhatsApp deveria ser algo mais acessível, já que é o canal que o público realmente usa e verifica.
3. **Segmento fechado (só Barbearia/Salão de Beleza)** no campo "Segmento" observado — se o nosso produto mirar em nichos adjacentes (studios de tatuagem, clínicas, personal trainers etc.), isso é um espaço aberto.
4. **Nenhum passo de pagamento/sinal antecipado no fluxo público** — pode ser proposital (evitar fricção), mas para negócios que sofrem com no-show, oferecer sinal opcional (ex.: Pix) seria um diferencial forte.
5. **Um único profissional "logado" por vez no drawer de novo agendamento manual** parece simples, mas não avaliamos fluxos com múltiplos profissionais simultâneos em detalhe — vale investigar mais se formos competir no segmento de salões maiores.

---

## 10. Sugestão de próximos passos

Recomendo confrontar esta análise com o `ESPECIFICACAO.md` e `ROADMAP_IMPLEMENTACAO.md` já existentes no projeto para mapear quais desses pontos já estão cobertos, quais entram no roadmap, e decidir conscientemente sobre o trade-off de segurança do reconhecimento por telefone (item 2 e 9.1) antes de replicar.
