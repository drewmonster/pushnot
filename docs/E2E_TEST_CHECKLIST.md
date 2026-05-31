# E2E Test Checklist

Use este checklist para validar o MVP ponta a ponta.

## Infra

- [ ] Copiar `.env.example` para `.env`.
- [ ] Copiar `apps/api/.env.example` para `apps/api/.env`.
- [ ] Subir Postgres e Redis com `npm run dev:infra` ou configurar `DATABASE_URL` e `REDIS_URL` externos.
- [ ] Confirmar que Postgres esta healthy.
- [ ] Confirmar que Redis esta healthy.

## Banco

- [ ] Rodar `npm run prisma:generate`.
- [ ] Rodar `npm run db:migrate`.
- [ ] Rodar `npm run db:seed`.
- [ ] Confirmar tenant `demo-tenant`.

## Processos

- [ ] Subir API com `npm run dev:api`.
- [ ] Subir worker com `npm run dev:worker`.
- [ ] Rodar `npm run healthcheck`.
- [ ] Subir Admin com `npm run dev:admin`.
- [ ] Subir Mobile com `npm run dev:mobile`.

## Mobile

- [ ] Abrir app Expo em dispositivo fisico.
- [ ] Solicitar permissao de notificacao.
- [ ] Confirmar token Expo gerado.
- [ ] Confirmar `deviceId` exibido.
- [ ] Confirmar tela mostrando tenant atual.
- [ ] Confirmar device registrado no backend.

## Campanha

- [ ] Abrir admin em `http://localhost:3000`.
- [ ] Criar campanha para `demo-tenant`.
- [ ] Editar titulo, mensagem, imagem, deep link e segmento.
- [ ] Informar `deviceId` especifico para teste.
- [ ] Clicar em `Enviar teste`.
- [ ] Confirmar `NotificationSend` criado no historico.
- [ ] Confirmar recebimento no celular.
- [ ] Abrir notificacao no celular.
- [ ] Confirmar `POST /events/notification-opened` registrado.
- [ ] Conferir stats no admin: tokens alvo, enviados ao provider, erros e aberturas.
- [ ] Confirmar receipt salvo como `receipt_ok` ou `receipt_error`.

## Mock provider

- [ ] Definir `PUSH_PROVIDER=mock`.
- [ ] Enviar teste para token qualquer.
- [ ] Confirmar send com sucesso simulado.
- [ ] Enviar teste para token contendo `mock-fail`.
- [ ] Confirmar erro simulado em `NotificationSend`.
- [ ] Conferir stats no admin sem depender de celular real.

## Real Device Demo

- [ ] Configurar `DATABASE_URL` com Postgres externo.
- [ ] Configurar `REDIS_URL` com Redis externo.
- [ ] Configurar `PUSH_PROVIDER=expo`.
- [ ] Configurar `ADMIN_API_TOKEN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `SESSION_SECRET`.
- [ ] Configurar `DEMO_TENANT_PUBLIC_KEY`.
- [ ] Rodar `npm run db:migrate:deploy` em staging/producao; usar `npm run db:migrate` apenas em desenvolvimento.
- [ ] Confirmar que `prisma db push` nao foi usado em staging/producao.
- [ ] Rodar `npm run db:seed`.
- [ ] API rodando com Postgres/Redis externos.
- [ ] Worker rodando com a mesma `DATABASE_URL` e `REDIS_URL`.
- [ ] `npm run healthcheck` retornando `status=ok`.
- [ ] Admin acessivel e login funcionando.
- [ ] `EXPO_PUBLIC_API_URL` apontando para API acessivel pelo celular.
- [ ] `EXPO_PUBLIC_APP_PUBLIC_KEY` igual ao public key do tenant.
- [ ] `EXPO_PUBLIC_EAS_PROJECT_ID` configurado.
- [ ] App Android instalado via EAS development build.
- [ ] Permissao de push aceita.
- [ ] ExpoPushToken registrado no backend.
- [ ] Campanha criada no admin.
- [ ] Test send recebido no celular.
- [ ] Abertura da notificacao registrada.
- [ ] Stats atualizadas no admin.
- [ ] Receipt consultado e salvo.
- [ ] Se Expo retornar token invalido, device marcado com `pushStatus=invalid` e `invalidatedAt`.
