# Staging Checklist

## Railway services

- [ ] Projeto Railway criado.
- [ ] Postgres criado.
- [ ] Redis criado.
- [ ] API criada a partir do monorepo.
- [ ] Worker criado a partir do monorepo.
- [ ] Admin criado a partir do monorepo.
- [ ] API com public domain habilitado.
- [ ] Admin com public domain habilitado.
- [ ] Worker sem public domain.
- [ ] Postgres sem public networking.
- [ ] Redis sem public networking.

## API variables

- [ ] `NODE_ENV=production`.
- [ ] `DATABASE_URL` apontando para Postgres Railway.
- [ ] `REDIS_URL` apontando para Redis Railway.
- [ ] `ADMIN_API_TOKEN` configurado.
- [ ] `ADMIN_ORIGIN` apontando para o dominio publico do Admin.
- [ ] `PUSH_PROVIDER=expo`.
- [ ] `EXPO_ACCESS_TOKEN` configurado se necessario.
- [ ] `DEMO_TENANT_ID=demo-tenant`.
- [ ] `DEMO_TENANT_PUBLIC_KEY` configurado.

## Worker variables

- [ ] `NODE_ENV=production`.
- [ ] `DATABASE_URL` igual ao da API.
- [ ] `REDIS_URL` igual ao da API.
- [ ] `PUSH_PROVIDER=expo`.
- [ ] `EXPO_ACCESS_TOKEN` configurado se necessario.

## Admin variables

- [ ] `NODE_ENV=production`.
- [ ] `ADMIN_API_URL` apontando para o dominio publico da API.
- [ ] `ADMIN_API_TOKEN` igual ao da API.
- [ ] `ADMIN_EMAIL` configurado.
- [ ] `ADMIN_PASSWORD` configurado.
- [ ] `SESSION_SECRET` configurado.

## Database

- [ ] Migrations executadas com `npm run db:migrate:deploy`.
- [ ] Nenhuma alteracao aplicada em staging/producao com `prisma db push`.
- [ ] Seed executado com `npm run db:seed`.
- [ ] Tenant demo criado.
- [ ] Tenant public key igual ao usado no mobile.

## Health and smoke

- [ ] `/health` da API retorna Postgres `ok`.
- [ ] `/health` da API retorna Redis `ok`.
- [ ] `/health` da API retorna queue `ok`.
- [ ] `npm run smoke:staging` passando contra a URL publica da API.

## Admin

- [ ] Admin login funcionando.
- [ ] Lista de tenants carrega apos login.
- [ ] Campanha criada pelo Admin.
- [ ] Envio teste dispara job.

## Mobile real

- [ ] App Android dev build instalado.
- [ ] `EXPO_PUBLIC_API_URL` aponta para API staging publica.
- [ ] `EXPO_PUBLIC_TENANT_ID` configurado.
- [ ] `EXPO_PUBLIC_TENANT_PUBLIC_KEY` configurado.
- [ ] Permissao de push aceita.
- [ ] Device registrado.
- [ ] ExpoPushToken salvo no backend.
- [ ] Test send recebido no celular.
- [ ] Receipt processado.
- [ ] Open event registrado.
- [ ] Stats atualizadas no Admin.
