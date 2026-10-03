# Especificação do Sistema — Gestão de Agenda para Barbearias (SaaS)

> Documento de produto/arquitetura. Nenhum código deve ser escrito antes da validação deste documento.

## 1. Visão Geral

O projeto é um **SaaS de gestão de agenda para barbearias**: uma plataforma única que pode ser usada por várias barbearias diferentes (tenants), cada uma com seus próprios barbeiros, clientes, horários e dados financeiros, totalmente isolados entre si.

**Problema que resolve:**
- Agendamentos feitos manualmente (caderno, WhatsApp, telefone) geram conflitos de horário, esquecimentos e falta de visão sobre o negócio.
- Donos de barbearia não têm dados consolidados sobre quais serviços/produtos mais vendem, quais barbeiros têm melhor desempenho, e perdem oportunidades de relacionamento (ex: aniversários de clientes).

**Público-alvo:** donos/gerentes de barbearias (clientes do SaaS), barbeiros/prestadores de serviço que trabalham nessas barbearias, e os clientes finais que agendam horários.

**Proposta de valor:**
- Agenda online evitando conflitos de horário.
- Cliente final agenda pelo celular sem precisar ligar ou mandar mensagem.
- Dono da barbearia tem dashboard com indicadores do negócio.
- Comunicação automática com clientes (confirmação, lembrete, aniversário) via WhatsApp/Push.

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | PHP (versão mais recente) + Laravel — API REST |
| Frontend | Vue 3 (SPA) |
| Banco de dados | PostgreSQL |
| Autenticação | Laravel Sanctum (token-based, adequado para SPA + futura app mobile) |
| Processamento assíncrono | Laravel Queue (jobs) — envio de notificações (WhatsApp/Push) sem travar a requisição do usuário |
| Agendamento de tarefas | Laravel Scheduler — disparo de lembretes diários, verificação de aniversários, etc. |

---

## 3. Arquitetura Multi-tenant

Como o sistema será usado por **múltiplas barbearias** (tenants) de forma independente, a arquitetura precisa garantir isolamento de dados entre elas.

**Estratégia recomendada (v1): banco único compartilhado com `tenant_id`**
- Todas as tabelas relevantes (clientes, barbeiros, horários, agendamentos, financeiro, etc.) possuem uma coluna `tenant_id`.
- Um **Global Scope** do Eloquent aplica o filtro `tenant_id` automaticamente em todas as queries, baseado no tenant do usuário autenticado — evitando que uma query esqueça o filtro e exponha dados de outro tenant.
- Mais simples de operar (uma única instância de banco, uma migration, um deploy) e mais barato de manter do que banco-por-tenant.

**Alternativa considerada: banco de dados por tenant**
- Isolamento mais forte (impossível misturar dados entre tenants por erro de query), mas operacionalmente mais caro: cada nova barbearia exige provisionar um banco, rodar migrations separadas, e dificulta relatórios cross-tenant (ex: métricas internas do SaaS).
- Pode ser revisitado no futuro se o número de tenants crescer muito ou houver exigência contratual de isolamento físico.

**Decisão:** seguir com banco único + `tenant_id` na v1.

---

## 4. Perfis de Usuário

| Perfil | Descrição |
|---|---|
| **Super Admin** | Administra o SaaS como um todo. Cadastra/gerencia barbearias (tenants), planos de assinatura, suporte. |
| **Admin/Gerente da barbearia** | Dono ou gerente de uma barbearia específica. Gerencia barbeiros, horários, clientes, financeiro e dashboard daquele tenant. |
| **Barbeiro/Prestador de serviço** | Atende clientes, visualiza e gerencia sua própria agenda. |
| **Cliente** | Cliente final da barbearia. Agenda horários, recebe notificações. |

Tipos de usuário no sistema: `admin`, `cliente`, `prestador_de_servico` (conforme solicitado), com o Super Admin tratado como um nível acima, fora do escopo de um tenant específico.

---

## 5. Módulos Funcionais

### 5.1 Cadastro de Barbearias (Tenants) — *módulo novo, necessário por ser SaaS*
- Dados da barbearia: nome, CNPJ/CPF, endereço, telefone, logo.
- **Slug/identificador único** da barbearia, usado na URL pública de agendamento do cliente (ex: `sistema.com/barbearia-do-joao`).
- Plano associado (vínculo real com o módulo de Planos — cobrança automática em si fica para fase futura, ver Roadmap).
- Status do tenant (ativo, suspenso, em teste/trial).

### 5.2 Cadastro de Clientes
- Dados: nome, telefone (WhatsApp), e-mail, data de nascimento (para aniversários), observações.
- Histórico de atendimentos do cliente.

### 5.3 Cadastro de Horários
- Expediente de cada barbeiro (dias da semana, horário de entrada/saída, intervalos).
- Bloqueios (folgas, férias, feriados).
- Duração de cada serviço (para calcular slots disponíveis na agenda).

### 5.4 Cadastro de Barbeiros
- Dados pessoais, foto, especialidades/serviços que realiza.
- Percentual de comissão por serviço (usado no módulo Financeiro).
- Vínculo com o tenant (barbearia) e com seus horários de trabalho.

### 5.5 Cadastro de Usuários e Papéis
- Usuário do sistema com tipo: `admin`, `cliente`, `prestador_de_servico`.
- Controle de permissões por papel (o que cada tipo pode ver/fazer).

### 5.6 Cadastro de Serviços — *módulo novo, identificado na revisão*
- Catálogo de serviços oferecidos pela barbearia (ex: corte, barba, sobrancelha), com nome, descrição, duração (usada para calcular os slots da agenda) e preço.
- Cada barbeiro pode estar vinculado a um subconjunto de serviços que realiza, com comissão e/ou preço específico por barbeiro (override do padrão).

### 5.7 Cadastro de Produtos — *módulo novo, identificado na revisão*
- Catálogo de produtos vendidos pela barbearia (ex: pomada, óleo de barba), com nome, descrição, preço e quantidade em estoque.
- Base para o módulo de Comanda/Venda e para os indicadores de "produtos mais vendidos" no Dashboard.

### 5.8 Agendamento
- **Cliente** pode agendar online, escolhendo barbeiro, um ou mais serviços (ex: corte + barba no mesmo horário) e horário disponível.
- **Admin/Barbeiro** também pode criar/editar agendamentos manualmente (ex: cliente que liga ou chega sem hora marcada).
- Status do agendamento: `pendente` → `confirmado` → `concluído`, ou `cancelado`.
- Validação para impedir conflito de horários para o mesmo barbeiro.

### 5.9 Comanda / Venda — *módulo novo, identificado na revisão*
- Registro do que foi efetivamente realizado/vendido em um atendimento: serviços prestados e/ou produtos vendidos, com quantidade e preço no momento da venda.
- Pode estar vinculada a um agendamento (atendimento que veio de uma reserva) ou ser uma **venda avulsa** (ex: cliente compra um produto no balcão sem agendamento).
- Registra a **forma de pagamento** usada (dinheiro, Pix, cartão de débito, cartão de crédito) — apenas para fins de controle, já que o pagamento em si é presencial (v1 sem gateway).
- É a base para o módulo Financeiro (receitas), para o cálculo de comissão dos barbeiros e para os indicadores do Dashboard.

### 5.10 Módulo Financeiro (v1: controle interno, sem gateway de pagamento)
- Receitas vêm automaticamente das Comandas (serviços + produtos vendidos); despesas e receitas extras são lançadas manualmente.
- Relatórios financeiros por período (diário, mensal), incluindo quebra por forma de pagamento.
- Cálculo de comissão por barbeiro com base nos itens de serviço das comandas e no percentual configurado (padrão do barbeiro ou específico por serviço).
- Pagamento ao cliente final continua sendo presencial (dinheiro, Pix, maquininha); o sistema apenas registra o valor e a forma de pagamento.

### 5.11 Dashboard
- Produtos/serviços mais vendidos.
- Barbeiros que mais atenderam (ranking de atendimentos).
- Clientes mais frequentes.
- Próximos aniversários de clientes (para ação de relacionamento).

### 5.12 Mensagens / Notificações
- Camada de notificação **abstrata**: o sistema dispara eventos (ex: "agendamento confirmado", "lembrete de horário", "aniversário do cliente") e cada evento pode ser entregue por um ou mais **canais plugáveis**.
- Canais previstos: WhatsApp e Push Notification (Web Push, já que o frontend é uma SPA Vue).
- Provedor de WhatsApp (API oficial Meta Cloud API vs. terceirizado como Twilio/Z-API) **fica como decisão pendente** — a arquitetura não deve depender de um provedor específico, permitindo troca futura sem reescrever o módulo.

---

## 6. Requisitos Não Funcionais

- **Isolamento de dados entre tenants** — nenhuma barbearia deve, sob nenhuma circunstância, visualizar dados de outra.
- **Segurança e LGPD** — dados de clientes (telefone, data de nascimento, histórico) exigem cuidado com acesso e armazenamento.
- **Responsividade mobile-first** — o cliente final vai agendar principalmente pelo celular.
- **Performance da agenda em tempo real** — evitar que dois clientes agendem o mesmo horário simultaneamente (lock/validação na escrita).

---

## 7. Fluxos Principais

1. **Onboarding de uma nova barbearia (tenant)** — Super Admin cadastra a barbearia, cria o admin inicial daquele tenant.
2. **Cadastro de barbeiros e horários** — Admin da barbearia cadastra barbeiros e define expediente/serviços.
3. **Agendamento pelo cliente** — Cliente escolhe barbearia → serviço → barbeiro → horário disponível → confirma.
4. **Agendamento manual pelo admin/barbeiro** — Admin ou barbeiro cria o agendamento diretamente no sistema.
5. **Notificações** — Ao confirmar/alterar/cancelar agendamento, e em lembretes/aniversários, o sistema dispara notificação pelo(s) canal(is) configurado(s).

---

## 8. Estrutura Técnica Proposta

- **Backend (Laravel):** API REST organizada por domínio (Tenants, Users, Clientes, Barbeiros, Horarios, Agendamentos, Financeiro, Notificacoes). Autenticação via Sanctum. Global Scope de tenant aplicado nos models que possuem `tenant_id`.
- **Frontend (Vue 3):** SPA consumindo a API via Axios, com rotas protegidas por papel de usuário (admin, barbeiro, cliente).
- **Banco (PostgreSQL):** migrations Laravel, com `tenant_id` como chave estrangeira nas tabelas multi-tenant.
- **Jobs/Queue:** envio de notificações (WhatsApp/Push) processado de forma assíncrona.

---

## 9. Roadmap / Fases

**MVP (v1):**
- Cadastro de tenants, usuários, clientes, barbeiros, horários, serviços e produtos.
- Agendamento (cliente + admin/barbeiro), com suporte a múltiplos serviços por agendamento.
- Comanda/Venda (vinculada a agendamento ou avulsa), com forma de pagamento.
- Financeiro com controle interno (sem pagamento online).
- Dashboard com os indicadores listados.
- Notificações básicas (estrutura pronta, podendo iniciar com apenas 1 canal funcional).

**Fases futuras:**
- Pagamento online (Pix/cartão) integrado ao agendamento.
- WhatsApp Business API oficial (caso tenha iniciado com terceirizado).
- Cobrança de assinatura SaaS automatizada (planos pagos para as barbearias).
- App mobile nativo.

---

## 10. Pontos Abertos / Decisões Pendentes

- **Provedor de WhatsApp:** API oficial Meta Cloud API vs. terceirizado (Twilio, Z-API, Evolution API). Adiado propositalmente.
- **Onboarding de novas barbearias:** será self-service (a barbearia se cadastra sozinha) ou cadastro manual feito pelo Super Admin?
- **Cobrança de assinatura do SaaS:** haverá planos pagos desde o início ou tudo gratuito/manual na v1?
- **Múltiplas unidades dentro de uma mesma barbearia (filiais de um mesmo tenant):** fora de escopo por ora — assumido que cada tenant representa uma unidade física única.
