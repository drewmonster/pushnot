# Staging Deploy on Railway

Este guia prepara staging real no Railway com cinco servicos:

- Postgres
- Redis
- API
- Worker
- Admin

Referencias oficiais usadas:

- Railway Build and Start Commands: https://docs.railway.com/reference/build-and-start-commands
- Railway Services and monorepo/service settings: https://docs.railway.com/develop/services
- Railway database services and private networking: https://docs.railway.com/databases/build-a-database-service

## Estrutura geral

Use o mesmo repositorio GitHub para API, Worker e Admin, todos com root directory no monorepo root.

Railway pode detectar build/start automaticamente, mas para staging configure comandos explicitamente nos services.

## 1. Postgres

Crie um database Postgres no Railway.

Configuracao:

- Public networking: desabilitado, salvo necessidade temporaria de debug.
- Use internal/private URL quando disponivel.
- Use a variavel `DATABASE_URL` exposta pelo Postgres nos servicos API e Worker.
- Nao exponha o Postgres publicamente.

## 2. Redis

Crie um database Redis no Railway.

Configuracao:

- Public networking: desabilitado.
- Use internal/private URL quando disponivel.
- Use a variavel `REDIS_URL` exposta pelo Redis nos servicos API e Worker.
- Nao exponha o Redis publicamente.

## 3. API service

Source:

- GitHub repository do monorepo.
- Root directory: repo root (`/`).

Build command:

```bash
npm run build
```

Start command:

```bash
npm run start:api
```

Dominio:

- Habilitar public domain.
- Guardar URL publica, por exemplo `https://pushnot-api-staging.up.railway.app`.

Variaveis obrigatorias:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
ADMIN_API_TOKEN=<random-long-token>
ADMIN_ORIGIN=https://<admin-public-domain>
PUSH_PROVIDER=expo
EXPO_ACCESS_TOKEN=<optional-expo-token>
DEMO_TENANT_ID=demo-tenant
DEMO_TENANT_PUBLIC_KEY=<random-public-app-key-for-demo>
```

Railway injeta `PORT`; a API usa `process.env.PORT` e escuta em `0.0.0.0`.

Migrations:

Execute antes ou depois do primeiro deploy da API:

```bash
npm run db:migrate:deploy
npm run db:seed
```

Pode rodar como Railway one-off command no API service, ou localmente com as variaveis do staging carregadas.

## 4. Worker service

Source:

- Mesmo GitHub repository.
- Root directory: repo root (`/`).

Build command:

```bash
npm run build
```

Start command:

```bash
npm run start:worker
```

Dominio:

- Nao habilitar public domain.
- Worker nao abre porta publica.

Variaveis obrigatorias:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
PUSH_PROVIDER=expo
EXPO_ACCESS_TOKEN=<optional-expo-token>
ADMIN_API_TOKEN=<same-token-as-api>
```

O worker consome:

- `notification-send`
- `expo-receipt-check`

Ele fecha BullMQ, Prisma e queues em `SIGTERM`/`SIGINT`.

## 5. Admin service

Source:

- Mesmo GitHub repository.
- Root directory: repo root (`/`).

Build command:

```bash
npm run build
```

Start command:

```bash
npm run start:admin
```

Dominio:

- Habilitar public domain.
- Usar esta URL em `ADMIN_ORIGIN` no API service.

Variaveis obrigatorias:

```env
NODE_ENV=production
ADMIN_API_URL=https://<api-public-domain>
ADMIN_API_TOKEN=<same-token-as-api>
ADMIN_EMAIL=admin@pushnot.local
ADMIN_PASSWORD=<strong-demo-password>
SESSION_SECRET=<long-random-secret>
```

Nao configure `ADMIN_API_TOKEN` como variavel `NEXT_PUBLIC_*`. O admin usa proxy server-side em `/api/backend/*`.

## 6. Smoke test

Depois do deploy:

```bash
STAGING_API_URL=https://<api-public-domain> \
ADMIN_API_TOKEN=<same-token-as-api> \
STAGING_TENANT_ID=demo-tenant \
npm run smoke:staging
```

PowerShell:

```powershell
$env:STAGING_API_URL="https://<api-public-domain>"
$env:ADMIN_API_TOKEN="<same-token-as-api>"
$env:STAGING_TENANT_ID="demo-tenant"
npm run smoke:staging
```

O smoke test valida:

- `GET /health`
- Admin endpoint sem token retorna `401`
- Admin endpoint com token retorna sucesso
- `/devices/register` sem `appPublicKey` retorna `400`
- `/devices/register` com `appPublicKey` invalida retorna `401`
- URL alvo nao e localhost

## 7. Mobile staging

Configure o app Android development build com:

```env
EXPO_PUBLIC_API_URL=https://<api-public-domain>
EXPO_PUBLIC_TENANT_ID=demo-tenant
EXPO_PUBLIC_TENANT_PUBLIC_KEY=<same-value-as-demo-tenant-public-key>
EXPO_PUBLIC_EAS_PROJECT_ID=<eas-project-id>
```

Depois gere o build:

```bash
cd apps/mobile
eas login
eas init
eas build --profile development --platform android
```

Instale o APK no device pelo link do EAS e rode:

```bash
npm run dev:mobile
```
