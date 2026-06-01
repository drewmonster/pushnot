# Ledger Notify mobile build

This app is prepared for the first internal Android development build as `Ledger Notify`.

## App name and icons

The app name, package identifiers, app icon, Android adaptive icon and Android notification icon are build-time settings in `app.config.ts`.

Default demo tenant values:

```ts
appName: "Ledger Notify"
slug: "ledger-notify"
bundleIdentifier: "com.pushnot.ledgernotify"
packageName: "com.pushnot.ledgernotify"
appIcon: "./assets/icon.png"
notificationIconAndroid: "./assets/notification-icon.png"
```

Replace `assets/icon.png` and `assets/notification-icon.png` before a production build. Do not try to change the app name or app icon from a notification payload; those come from the installed build.

## Android development build

Configure the mobile environment:

```env
EXPO_PUBLIC_API_URL=https://<api-public-domain>
EXPO_PUBLIC_TENANT_ID=demo-tenant
EXPO_PUBLIC_APP_PUBLIC_KEY=<same-value-as-demo-tenant-public-key>
EXPO_PUBLIC_EAS_PROJECT_ID=<eas-project-id>
```

Build and install:

```bash
cd apps/mobile
eas build --profile development --platform android
```

After installing the build on a physical Android device, run the bundler:

```bash
npm run dev:mobile
```

## Testing campaign imageUrl

1. Register the Android device so the backend stores its Expo push token.
2. In the admin, create or edit a campaign with `title`, `body` and an HTTPS `imageUrl`.
3. Send a test notification to the device.
4. Confirm the backend payload includes `data.imageUrl`, `data.campaignId`, `data.deepLink` when present, and `richContent.image`.

Expo documents `richContent.image` as supported by the Expo Push Service. Android shows the image out of the box. iOS requires a Notification Service Extension or other custom native setup before remote images render as rich notifications.

Reference: https://docs.expo.dev/push-notifications/sending-notifications/#message-request-format
