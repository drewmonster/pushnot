import Constants from "expo-constants";

type TenantConfig = {
  appName: string;
  slug: string;
  bundleIdentifier: string;
  packageName: string;
  appPublicKey: string;
  appIcon: string;
  notificationIconAndroid: string;
  primaryColor: string;
};

const extra = Constants.expoConfig?.extra as
  | {
      tenantId?: string;
      tenantConfig?: TenantConfig;
    }
  | undefined;

export const tenantId = process.env.EXPO_PUBLIC_TENANT_ID ?? extra?.tenantId ?? "demo-tenant";

export const tenantConfig: TenantConfig =
  extra?.tenantConfig ?? {
    appName: "Ledger Notify",
    slug: "ledger-notify",
    bundleIdentifier: "com.pushnot.ledgernotify",
    packageName: "com.pushnot.ledgernotify",
    appPublicKey:
      process.env.EXPO_PUBLIC_TENANT_PUBLIC_KEY ??
      process.env.EXPO_PUBLIC_APP_PUBLIC_KEY ??
      "demo-public-key",
    appIcon: "./assets/icon.png",
    notificationIconAndroid: "./assets/notification-icon.png",
    primaryColor: "#0f766e"
  };
