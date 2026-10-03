# Modelagem do Banco de Dados — Pré-modelagem (PostgreSQL)

> Documento conceitual: define tabelas e relacionamentos antes da criação das migrations Laravel. Tipos de dados e índices serão refinados na implementação.

Referência de produto: ver `ESPECIFICACAO.md`.

## 1. Visão geral da estratégia multi-tenant

Banco único compartilhado: praticamente todas as tabelas operacionais possuem `tenant_id`, isolando os dados de cada barbearia via Global Scope no Eloquent (ver `ESPECIFICACAO.md`, seção 3).

## 2. Tabelas

### 2.1 `planos`
Planos de assinatura do SaaS (oferecidos para as barbearias).
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| nome | varchar | |
| descricao | text | |
| preco_mensal | decimal | |
| limite_barbeiros | int, nulo | nulo = ilimitado |
| limite_clientes | int, nulo | nulo = ilimitado |
| ativo | boolean | |

### 2.2 `tenants`
As barbearias (clientes do SaaS).
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| plano_id | bigint FK → planos | plano atual do tenant |
| nome | varchar | |
| slug | varchar, único | usado na URL pública de agendamento |
| cnpj_cpf | varchar | |
| telefone | varchar | |
| endereco | varchar | |
| logo_url | varchar, nulo | |
| status | enum(ativo, suspenso, trial) | |
| trial_ends_at | timestamp, nulo | |

### 2.3 `assinaturas_tenant` *(estrutura prevista; cobrança automática é fase futura)*
Histórico de assinaturas do tenant a um plano.
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK → tenants | |
| plano_id | bigint FK → planos | |
| status | enum(ativa, cancelada, trial) | |
| data_inicio | date | |
| data_fim | date, nulo | |

### 2.4 `users`
Autenticação e papel de cada pessoa no sistema.
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK → tenants, nulo | nulo apenas para `super_admin` |
| name | varchar | |
| email | varchar, único | |
| password | varchar (hash) | |
| tipo | enum(super_admin, admin, prestador_de_servico, cliente) | |
| telefone | varchar, nulo | usado para WhatsApp |

### 2.5 `clientes`
Perfil de cliente final, podendo ou não ter login.
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK → tenants | |
| user_id | bigint FK → users, nulo | nulo se cadastrado manualmente sem acesso ao sistema |
| nome | varchar | |
| telefone | varchar | |
| email | varchar, nulo | |
| data_nascimento | date, nulo | usado para indicador de aniversários |
| observacoes | text, nulo | |

### 2.6 `barbeiros`
Perfil de prestador de serviço.
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK → tenants | |
| user_id | bigint FK → users | barbeiro sempre tem login |
| comissao_percentual_padrao | decimal | usado se não houver override em `barbeiro_servico` |
| foto_url | varchar, nulo | |
| ativo | boolean | |

### 2.7 `servicos`
Catálogo de serviços da barbearia.
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK → tenants | |
| nome | varchar | |
| descricao | text, nulo | |
| duracao_minutos | int | usado para calcular slots da agenda |
| preco | decimal | |
| ativo | boolean | |

### 2.8 `barbeiro_servico` *(pivot N:N)*
Quais serviços cada barbeiro realiza, com possível override.
| Campo | Tipo | Observação |
|---|---|---|
| barbeiro_id | bigint FK → barbeiros | |
| servico_id | bigint FK → servicos | |
| comissao_percentual | decimal, nulo | override do padrão do barbeiro |
| preco_personalizado | decimal, nulo | override do preço padrão do serviço |

### 2.9 `produtos`
Catálogo de produtos vendidos pela barbearia.
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK → tenants | |
| nome | varchar | |
| descricao | text, nulo | |
| preco | decimal | |
| estoque_qtd | int, nulo | |
| ativo | boolean | |

### 2.10 `horarios_trabalho`
Expediente recorrente de cada barbeiro.
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| barbeiro_id | bigint FK → barbeiros | |
| dia_semana | smallint (0–6) | |
| hora_inicio | time | |
| hora_fim | time | |

### 2.11 `bloqueios_agenda`
Folgas, férias e feriados.
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK → tenants | |
| barbeiro_id | bigint FK → barbeiros, nulo | nulo = bloqueio geral do tenant (ex: feriado) |
| data_inicio | timestamp | |
| data_fim | timestamp | |
| motivo | varchar, nulo | |

### 2.12 `agendamentos`
Reserva de horário.
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK → tenants | |
| cliente_id | bigint FK → clientes | |
| barbeiro_id | bigint FK → barbeiros | |
| data_hora_inicio | timestamp | |
| data_hora_fim | timestamp | |
| status | enum(pendente, confirmado, concluido, cancelado) | |
| criado_por_user_id | bigint FK → users | identifica se foi o cliente ou um admin/barbeiro que criou |
| observacoes | text, nulo | |

### 2.13 `agendamento_servico` *(pivot N:N)*
Suporta múltiplos serviços por agendamento (ex: corte + barba).
| Campo | Tipo | Observação |
|---|---|---|
| agendamento_id | bigint FK → agendamentos | |
| servico_id | bigint FK → servicos | |
| preco_no_momento | decimal | preço congelado no momento do agendamento |

### 2.14 `comandas`
Venda/atendimento fechado — base real do financeiro.
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK → tenants | |
| agendamento_id | bigint FK → agendamentos, nulo | nulo = venda avulsa (sem agendamento) |
| cliente_id | bigint FK → clientes | |
| barbeiro_id | bigint FK → barbeiros | |
| valor_total | decimal | |
| forma_pagamento | enum(dinheiro, pix, cartao_debito, cartao_credito) | |
| status | enum(aberta, paga, cancelada) | |

### 2.15 `comanda_itens`
Itens (serviços e/ou produtos) de uma comanda.
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| comanda_id | bigint FK → comandas | |
| tipo | enum(servico, produto) | define qual FK abaixo é usada |
| servico_id | bigint FK → servicos, nulo | preenchido se tipo = servico |
| produto_id | bigint FK → produtos, nulo | preenchido se tipo = produto |
| quantidade | int | |
| preco_unitario | decimal | |
| preco_total | decimal | |

### 2.16 `financeiro_lancamentos`
Despesas e receitas extras que não vêm de uma comanda.
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK → tenants | |
| tipo | enum(receita, despesa) | |
| categoria | varchar | |
| descricao | text, nulo | |
| valor | decimal | |
| data | date | |

### 2.17 `notificacoes`
Log de notificações enviadas (WhatsApp/Push).
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK → tenants | |
| user_id | bigint FK → users | destinatário |
| canal | enum(whatsapp, push) | |
| tipo_evento | varchar | ex: confirmacao_agendamento, lembrete, aniversario, cancelamento |
| conteudo | text | |
| status | enum(pendente, enviado, falhou) | |
| enviado_em | timestamp, nulo | |

### 2.18 `push_subscriptions`
Inscrições de Web Push por usuário (navegador).
| Campo | Tipo | Observação |
|---|---|---|
| id | bigint PK | |
| user_id | bigint FK → users | |
| endpoint | varchar | |
| p256dh_key | varchar | |
| auth_key | varchar | |

**Nota sobre comissão:** não há tabela própria de comissão na v1 — o valor é calculado em tempo real a partir de `comanda_itens` (itens do tipo serviço) cruzado com `barbeiro_servico.comissao_percentual` (ou `barbeiros.comissao_percentual_padrao` quando não houver override). Evita manter dados derivados duplicados e desatualizados.

## 3. Diagrama de relacionamentos

```mermaid
erDiagram
    PLANOS ||--o{ TENANTS : "plano atual"
    PLANOS ||--o{ ASSINATURAS_TENANT : ""
    TENANTS ||--o{ ASSINATURAS_TENANT : ""
    TENANTS ||--o{ USERS : ""
    TENANTS ||--o{ CLIENTES : ""
    TENANTS ||--o{ BARBEIROS : ""
    TENANTS ||--o{ SERVICOS : ""
    TENANTS ||--o{ PRODUTOS : ""
    TENANTS ||--o{ AGENDAMENTOS : ""
    TENANTS ||--o{ COMANDAS : ""
    TENANTS ||--o{ FINANCEIRO_LANCAMENTOS : ""
    TENANTS ||--o{ NOTIFICACOES : ""
    TENANTS ||--o{ 
         : ""

    USERS ||--o| CLIENTES : "perfil cliente"
    USERS ||--o| BARBEIROS : "perfil barbeiro"
    USERS ||--o{ NOTIFICACOES : ""
    USERS ||--o{ PUSH_SUBSCRIPTIONS : ""

    BARBEIROS ||--o{ HORARIOS_TRABALHO : ""
    BARBEIROS ||--o{ BLOQUEIOS_AGENDA : ""
    BARBEIROS ||--o{ AGENDAMENTOS : ""
    BARBEIROS ||--o{ COMANDAS : ""
    BARBEIROS }o--o{ SERVICOS : "barbeiro_servico"

    CLIENTES ||--o{ AGENDAMENTOS : ""
    CLIENTES ||--o{ COMANDAS : ""

    AGENDAMENTOS }o--o{ SERVICOS : "agendamento_servico"
    AGENDAMENTOS ||--o| COMANDAS : "gera (opcional)"

    COMANDAS ||--o{ COMANDA_ITENS : ""
    SERVICOS ||--o{ COMANDA_ITENS : ""
    PRODUTOS ||--o{ COMANDA_ITENS : ""
```

## 4. Próximos passos sugeridos

1. Validar este modelo com o usuário (nomes de tabelas/campos, enums).
2. Definir tipos de dados finais e índices (ex: índice composto `tenant_id + data_hora_inicio` em `agendamentos` para performance da agenda).
3. Só então gerar as migrations Laravel + models Eloquent com os relacionamentos e o Global Scope de tenant.
