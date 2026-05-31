# Cloud Runtime Setup

Este guia roda a demo sem Docker local, usando Postgres e Redis externos.

## 1. Servicos externos

Crie:

- Um Postgres gerenciado, por exemplo Neon, Supabase, Railway ou Render.
- Um Redis gerenciado, por exemplo Upstash, Railway ou Render.

Configure as URLs:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public&sslmode=require"
REDIS_URL="rediss://default:PASSWORD@HOST:6379"
```

Notas:

- Use `sslmode=require` quando o provedor Postgres exigir TLS.
- Use `rediss://` quando o provedor Redis fornecer TLS.
- API e worker devem usar a mesma `DATABASE_URL` e a mesma `REDIS_URL`.

## 2. Env da API e worker

Use `.env.demo.example` como base:

```env
PUSH_PROVIDER="expo"
EXPO_ACCESS_TOKEN=""
ADMIN_API_TOKEN="replace-with-random-api-token"
DEMO_TENANT_ID="demo-tenant"
DEMO_TENANT_PUBLIC_KEY="replace-with-demo-public-app-key"
```

`DEMO_TENANT_PUBLIC_KEY` precisa ser igual a `EXPO_PUBLIC_APP_PUBLIC_KEY` no app mobile.

## 3. Preparar banco

Rode no ambiente que tem acesso ao Postgres externo:

```bash
npm install
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

O seed cria:

- Tenant `demo-tenant`, ou o valor de `DEMO_TENANT_ID`.
- Public app key usando `DEMO_TENANT_PUBLIC_KEY`.
- Uma campanha demo.

## 4. Rodar API e worker

Em processos separados:

```bash
npm run dev:api
npm run dev:worker
```

Para healthcheck local:

```bash
npm run healthcheck
```

Para healthcheck remoto:

```bash
ADMIN_API_URL="https://your-api.example.com" npm run healthcheck
```

PowerShell:

```powershell
$env:ADMIN_API_URL="https://your-api.example.com"; npm run healthcheck
```

## 5. Rodar admin

Configure:

```env
ADMIN_API_URL="https://your-api.example.com"
ADMIN_API_TOKEN="same-token-used-by-api"
ADMIN_EMAIL="admin@pushnot.local"
ADMIN_PASSWORD="replace-with-demo-password"
SESSION_SECRET="replace-with-long-random-session-secret"
```

Suba:

```bash
npm run dev:admin
```

O admin faz proxy server-side para a API e nao expoe `ADMIN_API_TOKEN` no browser.

## 6. Mobile real

Configure:

```env
EXPO_PUBLIC_API_URL="https://your-api.example.com"
EXPO_PUBLIC_TENANT_ID="demo-tenant"
EXPO_PUBLIC_APP_PUBLIC_KEY="same-value-as-demo-tenant-public-key"
EXPO_PUBLIC_EAS_PROJECT_ID="your-eas-project-id"
```

Use uma URL acessivel pelo celular. `localhost` no celular nao aponta para sua maquina.

## 7. Receipts Expo

Com `PUSH_PROVIDER=expo`, o worker:

1. Envia para Expo Push Service.
2. Salva `providerTicketId`.
3. Agenda job separado na fila `expo-receipt-check`.
4. Consulta receipts.
5. Atualiza `NotificationSend.status` para `receipt_ok` ou `receipt_error`.
6. Marca device como `pushStatus=invalid` e `invalidatedAt` quando Expo reporta token invalido.
