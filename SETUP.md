# Finora — Guia de Setup Completo

## Pré-requisitos

- Node.js 20+ → https://nodejs.org
- Conta no Supabase → https://supabase.com (gratuito)
- Conta na OpenAI → https://platform.openai.com (pague por uso)
- Evolution API rodando (WhatsApp) → veja seção abaixo

---

## 1. Supabase

### 1.1 Criar projeto
1. Acesse https://supabase.com → New Project
2. Anote: **Project URL** e as duas chaves (**anon** e **service_role**)

### 1.2 Rodar as migrations
No painel do Supabase → SQL Editor, execute **em ordem**:
```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_bills_and_recurring.sql
supabase/migrations/003_add_paid_to_profiles.sql
supabase/migrations/004_appointments.sql
supabase/migrations/005_households.sql        # contas compartilhadas (casal)
```

> Algumas tabelas (wallets, shopping_lists, etc.) foram criadas direto no painel do
> Supabase e não têm migration. Ao clonar num projeto Supabase novo do zero, elas
> precisam ser recriadas. Depois de tudo, rode `supabase/audit_rls.sql` (query #1) para
> conferir que todas as tabelas estão com RLS habilitado.

### 1.3 (Opcional) Dados de exemplo
Crie um usuário via Authentication → Add User, copie o UUID e substitua em `supabase/seed.sql`, depois execute o arquivo.

---

## 2. Backend (NestJS)

```bash
cd backend
cp .env.example .env
```

Edite `.env`:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=sua-service-role-key
ANTHROPIC_API_KEY=sk-ant-...        # IA principal (parse, relatórios, visão/PDF)
OPENAI_API_KEY=sk-...               # só para transcrição de áudio (Whisper)
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-api-key
EVOLUTION_INSTANCE=finora
WEBHOOK_SECRET=qualquer-string-secreta
FRONTEND_URL=http://localhost:3000
SENTRY_DSN=                         # opcional (monitoramento de erros)
```

```bash
npm install
npm run start:dev
# Rodando em http://localhost:3001
# Docs: http://localhost:3001/docs
```

---

## 3. Frontend (Next.js)

```bash
cd frontend
cp .env.local.example .env.local
```

Edite `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

```bash
npm install
npm run dev
# Rodando em http://localhost:3000
```

---

## 4. Evolution API (WhatsApp)

### Opção A — Docker (recomendado)
```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua-chave \
  atendai/evolution-api:latest
```

### Opção B — Serviço gerenciado
Use https://evolution-api.com ou instâncias em Railway/Render.

### Configurar webhook
No painel da Evolution API, configure o webhook:
- **URL:** `https://seu-backend.com/api/webhook/whatsapp`
- **Eventos:** `messages.upsert`
- **API Key:** o mesmo valor de `WEBHOOK_SECRET` no backend

---

## 5. Deploy

### Frontend → Vercel
```bash
cd frontend
npx vercel --prod
# Configure as variáveis de ambiente no painel da Vercel
```

### Backend → Railway
1. Crie projeto em https://railway.app
2. Deploy via GitHub ou:
```bash
cd backend
railway up
```
3. Configure as variáveis de ambiente no painel

---

## 6. Estrutura do projeto

```
Finora/
├── backend/
│   └── src/
│       ├── modules/
│       │   ├── transactions/   # CRUD de transações
│       │   ├── categories/     # Categorias + orçamento
│       │   ├── goals/          # Metas de economia
│       │   ├── bills/          # Contas a pagar
│       │   ├── reports/        # Relatórios e dados para IA
│       │   ├── users/          # Perfis
│       │   └── whatsapp/       # Webhook + IA
│       └── config/
│           └── supabase.module.ts
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx               # Landing
│       │   ├── auth/login/            # Login/cadastro
│       │   └── dashboard/
│       │       ├── page.tsx           # Visão geral
│       │       ├── transactions/      # Lista + filtros
│       │       ├── categories/        # Gerenciar categorias
│       │       ├── goals/             # Metas
│       │       ├── reports/           # Relatórios + export CSV
│       │       └── settings/          # Configurações
│       ├── components/
│       │   ├── charts/                # Recharts
│       │   ├── layout/                # Sidebar
│       │   └── ui/                    # Componentes reutilizáveis
│       └── middleware.ts              # Auth redirect
└── supabase/
    ├── migrations/                    # Schema SQL
    └── seed.sql                       # Dados de exemplo
```

---

## 7. Fluxo WhatsApp

```
Usuário → WhatsApp → Evolution API → Webhook POST /api/webhook/whatsapp
                                            ↓
                                     WhatsappService
                                            ↓
                                       AiService (Claude — haiku/opus)
                                            ↓
                               { action, transaction, query }
                                            ↓
                             TransactionsService → Supabase
                                            ↓
                              Resposta → Evolution API → WhatsApp
```

## 8. Exemplos de mensagens WhatsApp

| Mensagem | Resultado |
|---|---|
| "Gastei 45 no mercado" | Registra R$45 em Alimentação |
| "Paguei 120 de internet" | Registra R$120 em Internet/Telefone |
| "Recebi 3500 de salário" | Registra R$3.500 em Salário |
| "Quanto gastei hoje?" | Relatório do dia |
| "Resumo do mês" | Resumo financeiro mensal |
| "Maior despesa este mês?" | Consulta via IA |
