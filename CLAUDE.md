# Finora — contexto do projeto (para o Claude)

Este arquivo é lido automaticamente pelo Claude Code ao abrir o projeto. Serve para
dar contexto imediato em qualquer máquina (substitui a "memória" local, que não viaja
entre computadores).

## O que é

Plataforma de organização financeira pessoal via **WhatsApp + dashboard web**. O
diferencial é registrar gastos por mensagem natural ("gastei 50 no mercado") — um
agente de IA interpreta e organiza tudo.

## Stack

- **Frontend**: Next.js 14 (App Router, `'use client'`, estilos inline + `useTheme()`), Recharts. Deploy na **Vercel** (`www.meufinora.com.br`).
- **Backend**: NestJS (Node). Deploy no **Railway** (`finora-production-1651.up.railway.app`).
- **Banco/Auth**: Supabase (Postgres + Auth + RLS).
- **IA**: Anthropic **Claude** (haiku para parse/relatórios; opus para visão/PDF). Whisper (OpenAI) só para transcrição de áudio.
- **WhatsApp**: Evolution API.
- **Pagamentos**: Mercado Pago. **Email**: Resend.

> O backend de produção é o **Railway**. Houve um backend antigo no Render que foi
> aposentado — se o frontend voltar a apontar pra ele, rotas novas dão 404. Confira
> `NEXT_PUBLIC_API_URL` na Vercel. Vars `NEXT_PUBLIC_*` são embutidas no build → ao
> trocar, redeployar sem cache.

## Estrutura

- `backend/` — NestJS. Módulos em `src/modules/`: `whatsapp` (agente), `transactions`, `users`, `categories`, `goals`, `bills`, `reports`, `appointments`, `shopping-lists`.
- `frontend/` — Next.js. Páginas em `src/app/dashboard/`; componentes em `src/components/ui/`; libs em `src/lib/`.
- `supabase/migrations/` — schema SQL com RLS. Também `audit_rls.sql` e `fix_rls.sql` (auditoria de segurança).
- `SETUP.md` — guia de setup passo a passo (env vars, contas externas).

## Como rodar / testar / buildar

```bash
# Backend
cd backend && npm install && npm run start:dev   # http://localhost:3001 (docs em /docs)
npm run build && npx jest                          # build + testes (Jest)

# Frontend
cd frontend && npm install && npm run dev          # http://localhost:3000
npm run build && npm test                          # build + testes (Vitest)
```

Preview do Claude: há `.claude/launch.json` com o server `frontend`. As páginas do
dashboard são protegidas por login — o preview mostra a landing, não o dashboard.

## Convenções

- Combine com o código ao redor: estilos inline com o objeto de tema `c` (`c.surface`, `c.border`, `c.text`, `c.textMuted`, `c.textFaint`…), toasts via `lib/toast` (`toast`/`toastError`/`toastInfo`), confirmações via `ConfirmModal`.
- Regras puras testáveis ficam em utils próprios com `.spec.ts` (backend/Jest) ou `.test.ts` (frontend/Vitest). Ex.: `agent-guards.util.ts`, `lib/installments.ts`.
- Lógica sensível (dinheiro) tem timeout, validação de valor (`isValidAmount`: finito, >0, ≤R$1bi) e rate limit por telefone no agente.
- Ao mexer em SQL/RLS: **não aplico em produção** — entrego o `.sql` para o dono revisar e rodar no Supabase; validar depois com `audit_rls.sql`.
- Commits: mensagens em pt-BR, prefixo convencional (`feat`/`fix`/`refactor`/`test`), terminando com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Estado atual das features grandes

- **Contas compartilhadas (casal)** — modelo híbrido (caixa comum + privado), titular+1.
  Migration `supabase/migrations/005_households.sql` (colunas `shared`/`household_id`,
  RLS aditiva via `my_household_ids()`). API `/api/household`, `FamilySection` nas
  configs, toggle "Compartilhado" nos formulários, visão Casal/Meu em Transações,
  comando "compartilhado: ..." no WhatsApp. **Depende da migration 005 estar aplicada.**
- **Agente WhatsApp — mídia**: áudio (Whisper), foto (Claude Vision), PDF (enviado
  direto ao Claude via bloco `document` — `pdf-parse` só como fallback), CSV/XLSX. Todas
  as chamadas externas têm timeout (não trava sem resposta). Ver `whatsapp.service.handleMediaMessage`.
- **Observabilidade**: Sentry cabeado (backend + frontend), inerte sem DSN. Falta setar
  `SENTRY_DSN` (Railway) e `NEXT_PUBLIC_SENTRY_DSN` (Vercel).

## Dívida técnica / roadmap

- RLS auditado (17 tabelas OK). Parcelas geradas no servidor. Rate limit + validação no agente. Testes das regras críticas. (todos concluídos)
- Pendente: design tokens (extrair estilos inline); Sentry (setar DSNs); **escala**: o
  `whatsapp.service` guarda estado em memória (rate limit, confirmações pendentes,
  onboarding) → só roda em 1 instância. Para escalar horizontal, mover esse estado para
  Redis. Frontend (Vercel) e banco (Supabase) já escalam sozinhos.

## Segredos

Nunca commitados (`.gitignore` cobre `.env*`). Cada máquina precisa dos próprios `.env`
(backend) e `.env.local` (frontend) — ver `.env.example` de cada e o `SETUP.md`.
