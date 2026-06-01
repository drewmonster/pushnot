import type { ExpoConfig } from "expo/config";

type TenantBuildConfig = {
  appName: string;
  slug: string;
  bundleIdentifier: string;
  packageName: string;
  appPublicKey: string;
  appIcon: string;
  notificationIconAndroid: string;
  primaryColor: string;
};

export const TENANT_CONFIGS: Record<string, TenantBuildConfig> = {
  "demo-tenant": {
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
  }
};

const tenantId = process.env.EXPO_PUBLIC_TENANT_ID ?? "demo-tenant";
const tenantConfig = TENANT_CONFIGS[tenantId] ?? TENANT_CONFIGS["demo-tenant"];
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: tenantConfig.appName,
  slug: tenantConfig.slug,
  icon: tenantConfig.appIcon,
  version: "0.1.0",
  scheme: "pushnot",
  orientation: "portrait",
  userInterfaceStyle: "light",
  extra: {
    tenantId,
    tenantConfig,
    eas: {
      projectId
    }
  },
  ios: {
    bundleIdentifier: tenantConfig.bundleIdentifier,
    supportsTablet: true
  },
  android: {
    package: tenantConfig.packageName,
    adaptiveIcon: {
      foregroundImage: tenantConfig.appIcon,
      backgroundColor: tenantConfig.primaryColor
    }
  },
  plugins: [
    [
      "expo-notifications",
      {
        icon: tenantConfig.notificationIconAndroid,
        color: tenantConfig.primaryColor,
        defaultChannel: "default"
      }
    ]
  ]
};

export default config;
