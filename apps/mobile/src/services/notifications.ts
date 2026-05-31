import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { tenantConfig, tenantId } from "../config/tenant";
import { apiPost } from "./api";
import { getDeviceId } from "./deviceIdentity";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true
  })
});

export type RegistrationStatus = {
  permissionStatus: Notifications.PermissionStatus | "unavailable";
  token?: string;
  deviceId?: string;
  registered: boolean;
  error?: string;
};

export async function registerForPushNotifications(): Promise<RegistrationStatus> {
  if (!Device.isDevice) {
    return {
      permissionStatus: "unavailable",
      registered: false,
      error: "Push notifications require a physical device."
    };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  const finalPermission =
    existingPermission.status === "granted"
      ? existingPermission
      : await Notifications.requestPermissionsAsync();

  const deviceId = await getDeviceId();

  if (finalPermission.status !== "granted") {
    await apiPost("/devices/register", {
      tenantId,
      appPublicKey: tenantConfig.appPublicKey,
      deviceId,
      pushToken: "permission-not-granted",
      platform: normalizePlatform(),
      appVersion: getAppVersion(),
      locale: getLocale(),
      timezone: getTimezone(),
      consentStatus: "revoked"
    });

    return {
      permissionStatus: finalPermission.status,
      deviceId,
      registered: false
    };
  }

  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;

  await apiPost("/devices/register", {
    tenantId,
    appPublicKey: tenantConfig.appPublicKey,
    deviceId,
    pushToken: token,
    platform: normalizePlatform(),
    appVersion: getAppVersion(),
    locale: getLocale(),
    timezone: getTimezone(),
    consentStatus: "active"
  });

  return {
    permissionStatus: finalPermission.status,
    token,
    deviceId,
    registered: true
  };
}

export async function unregisterDevice(deviceId: string) {
  await apiPost("/devices/unregister", {
    tenantId,
    appPublicKey: tenantConfig.appPublicKey,
    deviceId
  });
}

export async function registerNotificationOpenedListener(deviceId: string) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      campaignId?: string;
      sendId?: string;
      tenantId?: string;
      [key: string]: unknown;
    };

    if (!data.campaignId) {
      return;
    }

    void apiPost("/events/notification-opened", {
      tenantId: data.tenantId ?? tenantId,
      appPublicKey: tenantConfig.appPublicKey,
      campaignId: data.campaignId,
      sendId: data.sendId,
      deviceId,
      payload: {
        source: "expo-notification-response"
      }
    }).catch((error) => {
      console.warn("Failed to register notification open", error);
    });
  });
}

function normalizePlatform() {
  return Platform.OS === "ios" ? "ios" : "android";
}

function getAppVersion() {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "0.1.0";
}

function getLocale() {
  return Intl.DateTimeFormat().resolvedOptions().locale || "unknown";
}

function getTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
