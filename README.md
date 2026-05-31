# PushNot

MVP B2B para disparo de notificacoes mobile consent-based para testes de marketing.

## Stack

- Monorepo TypeScript com npm workspaces
- `apps/api`: Node.js + Fastify + Prisma + BullMQ + Expo Push Service
- `apps/admin`: Next.js
- `apps/mobile`: Expo React Native
- PostgreSQL e Redis via Docker local ou connection strings externas

## Variaveis de ambiente

Copie os exemplos antes do primeiro run:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
```

Variaveis principais:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pushnot?schema=public"
REDIS_URL="redis://localhost:6379"
API_PORT="4000"
API_HOST="0.0.0.0"
ADMIN_API_URL="http://localhost:4000"
MOBILE_API_URL="http://localhost:4000"
NEXT_PUBLIC_API_URL="http://localhost:4000"
EXPO_PUBLIC_API_URL="http://localhost:4000"
EXPO_PUBLIC_TENANT_ID="demo-tenant"
EXPO_PUBLIC_APP_PUBLIC_KEY="demo-public-key"
EXPO_PUBLIC_EAS_PROJECT_ID=""
PUSH_PROVIDER="mock"
PUSH_MOCK_FAILURE_RATE="0"
EXPO_ACCESS_TOKEN=""
ADMIN_ACTOR_ID="local-admin"
ADMIN_API_TOKEN="local-admin-api-token"
ADMIN_EMAIL="admin@pushnot.local"
ADMIN_PASSWORD="change-me"
SESSION_SECRET="replace-with-a-long-random-secret"
```

Use `PUSH_PROVIDER=mock` para validar admin, fila, sends e stats sem celular real. Use `PUSH_PROVIDER=expo` para envio real via Expo Push Service.

## Setup A: Docker local

1. Instale dependencias:

```bash
npm install
```

2. Suba Postgres e Redis:

```bash
npm run dev:infra
```

O `docker-compose.yml` expoe:

- Postgres em `localhost:5432`, volume `postgres-data` e healthcheck com `pg_isready`.
- Redis em `localhost:6379`, volume `redis-data` e healthcheck com `redis-cli ping`.

3. Prepare banco:

```bash
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

4. Suba os processos:

```bash
npm run dev:api
npm run dev:worker
npm run dev:admin
npm run dev:mobile
```

Rode cada comando de processo em um terminal separado.

5. Valide saude:

```bash
npm run healthcheck
```

Admin: `http://localhost:3000`
API: `http://localhost:4000`

## Setup B: Postgres/Redis externos

Use qualquer Postgres e Redis gerenciados que fornecam connection strings compativeis.

1. Configure `.env` e `apps/api/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public&sslmode=require"
REDIS_URL="rediss://default:PASSWORD@HOST:6379"
```

2. Para Neon, Supabase, Railway ou outro Postgres externo, use a connection string pooled ou direta recomendada pelo provedor. Mantenha `?schema=public` e inclua `sslmode=require` quando o provedor exigir TLS.

3. Para Upstash ou outro Redis externo, use a URL Redis TLS quando fornecida (`rediss://...`). O worker e a API usam a mesma `REDIS_URL`.

4. Rode:

```bash
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:worker
npm run dev:admin
```

Use `npm run db:migrate` apenas para desenvolvimento. Em staging e producao, aplique migrations versionadas com `npm run db:migrate:deploy` antes do seed. Nao use `prisma db push` nesses ambientes, porque ele nao registra historico em `prisma/migrations`.

Para mobile em dispositivo fisico, `EXPO_PUBLIC_API_URL` e `MOBILE_API_URL` devem apontar para uma URL acessivel pelo celular. `localhost` no celular nao aponta para sua maquina.

Guia detalhado: [docs/CLOUD_RUNTIME_SETUP.md](docs/CLOUD_RUNTIME_SETUP.md).

## Scripts

- `npm run dev:infra`: sobe Docker Compose.
- `npm run dev:api`: inicia Fastify em modo watch.
- `npm run dev:worker`: inicia o worker BullMQ.
- `npm run dev:admin`: inicia Next.js.
- `npm run dev:mobile`: inicia Expo.
- `npm run db:migrate`: cria/aplica migrations em desenvolvimento com Prisma migrate dev.
- `npm run db:migrate:deploy`: roda `prisma generate` e `prisma migrate deploy` para staging/producao.
- `npm run db:seed`: cria tenant e campanha demo.
- `npm run db:studio`: abre Prisma Studio.
- `npm run healthcheck`: chama `GET /health` e falha se a API estiver unhealthy.
- `npm run smoke:staging`: valida endpoints basicos contra API staging publica.
- `npm run test:isolation`: valida helpers de isolamento por tenant.
- `npm run typecheck`: valida TypeScript.
- `npm run build`: build de admin e API.

## Healthcheck

`GET /health` retorna:

- status geral: `ok`, `degraded` ou `error`.
- conexao com Postgres.
- conexao com Redis.
- status da fila BullMQ e contagem de jobs.
- timestamp.
- nome e versao do package.
- provider ativo (`mock` ou `expo`).

Se Postgres, Redis ou fila falharem, o endpoint retorna erro sanitizado. Quando `REDIS_URL` nao esta configurado, o status fica `degraded` e os envios rodam inline para desenvolvimento.

## Fila e worker

Com `REDIS_URL` configurado:

1. A API recebe `POST /campaigns/:id/send` ou `POST /campaigns/:id/test-send`.
2. A API cria um job BullMQ.
3. `npm run dev:worker` consome o job.
4. O worker resolve devices consentidos, cria `NotificationSend`, chama o provider e grava resultado.
5. O ticket Expo e salvo em `providerTicketId`.
6. Um job separado consulta receipts e grava `receipt_ok` ou `receipt_error`.
7. Erros do provider sao gravados em `NotificationSend.errorMessage` com sanitizacao.

Sem `REDIS_URL`, a API executa o envio inline apenas para facilitar desenvolvimento local.

## Provider de push

`PUSH_PROVIDER=mock`:

- Nao chama Expo Push Service.
- Marca sends como sucesso.
- Simula falha quando o push token contem `mock-fail`.
- Tambem pode simular falhas aleatorias com `PUSH_MOCK_FAILURE_RATE`, entre `0` e `1`.

`PUSH_PROVIDER=expo`:

- Usa Expo Push Service.
- `EXPO_ACCESS_TOKEN` e opcional, mas pode ser configurado quando o projeto Expo exigir autenticacao.

## Admin auth

O admin exige login por senha unica via env:

```env
ADMIN_EMAIL="admin@pushnot.local"
ADMIN_PASSWORD="change-me"
SESSION_SECRET="replace-with-a-long-random-secret"
ADMIN_API_TOKEN="local-admin-api-token"
```

As rotas administrativas da API (`/tenants` e `/campaigns`) exigem `ADMIN_API_TOKEN`. O app Next faz proxy server-side em `/api/backend/*`, validando sessao antes de encaminhar requests.

## App public key

`POST /devices/register`, `POST /devices/unregister` e `POST /events/notification-opened` sao publicos para o app mobile, mas exigem `appPublicKey`.

O valor precisa bater com `Tenant.publicKey`, criado pelo seed a partir de `DEMO_TENANT_PUBLIC_KEY`.

```env
DEMO_TENANT_PUBLIC_KEY="demo-public-key"
EXPO_PUBLIC_APP_PUBLIC_KEY="demo-public-key"
```

## Android development build com EAS

1. Instale e autentique o EAS CLI:

```bash
npm install -g eas-cli
eas login
```

2. Configure o projeto Expo, se ainda nao tiver `projectId`:

```bash
cd apps/mobile
eas init
```

Copie o `projectId` para `EXPO_PUBLIC_EAS_PROJECT_ID`.

3. Aponte o app para uma API acessivel pelo celular:

```env
EXPO_PUBLIC_API_URL="https://your-api.example.com"
EXPO_PUBLIC_TENANT_ID="demo-tenant"
EXPO_PUBLIC_APP_PUBLIC_KEY="demo-public-key"
EXPO_PUBLIC_TENANT_PUBLIC_KEY="demo-public-key"
EXPO_PUBLIC_EAS_PROJECT_ID="your-eas-project-id"
```

4. Crie o development build Android:

```bash
cd apps/mobile
eas build --profile development --platform android
```

5. Instale o APK no device pelo link do EAS ou via `adb install`.

6. Rode o bundler para o development client:

```bash
npm run dev:mobile
```

O app usa `Constants.easConfig.projectId` ou `extra.eas.projectId` para obter o Expo Push Token.

## Railway staging

Use [docs/STAGING_DEPLOY_RAILWAY.md](docs/STAGING_DEPLOY_RAILWAY.md) para criar API, Worker, Admin, Postgres e Redis separados no Railway.

Checklist operacional: [docs/STAGING_CHECKLIST.md](docs/STAGING_CHECKLIST.md).

## Endpoints principais

- `GET /health`
- `POST /devices/register`
- `POST /devices/unregister`
- `GET /tenants`
- `POST /campaigns`
- `GET /campaigns`
- `PUT /campaigns/:id`
- `POST /campaigns/:id/test-send`
- `POST /campaigns/:id/send`
- `GET /campaigns/:id/stats`
- `GET /campaigns/:id/sends`
- `POST /events/notification-opened`

## Consentimento e compliance

- A API so seleciona devices com `consentStatus = active` e `unregisteredAt = null`.
- A API tambem exige `pushStatus = active`; tokens `inactive` ou `invalid` nao recebem novos disparos.
- `POST /devices/unregister` revoga consentimento no backend.
- Rate limit basico: 120 requests por minuto.
- Criacao, edicao e envio de campanhas gravam `AuditLog`.
- Payload de notificacao carrega apenas identificadores operacionais.
- Secrets e URLs ficam em variaveis de ambiente.

## Limitacoes de branding

- O MVP nao altera dinamicamente o nome real do app por notificacao.
- O MVP nao altera dinamicamente o icone real no iOS.
- No Android, `androidIconKey` representa apenas chaves de icones ja empacotados no app.
- `apps/mobile/app.config.ts` prepara configuracao por tenant com `appName`, `slug`, `bundleIdentifier`, `packageName`, `appIcon`, `notificationIconAndroid` e `primaryColor`.

Builds white-label multi-tenant nao foram implementados nesta etapa.

## Segmentacao

`segment` e JSON opcional. O MVP suporta filtros simples:

```json
{
  "platform": "android",
  "locale": "pt-BR",
  "timezone": "America/Sao_Paulo"
}
```

## Checklist E2E

Use [docs/E2E_TEST_CHECKLIST.md](docs/E2E_TEST_CHECKLIST.md).
