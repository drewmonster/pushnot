import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "pushnot.deviceId";

export async function getDeviceId() {
  if (Platform.OS === "android") {
    const androidId = Application.getAndroidId();
    if (androidId) {
      return androidId;
    }
  }

  if (Platform.OS === "ios") {
    const iosId = await Application.getIosIdForVendorAsync();
    if (iosId) {
      return iosId;
    }
  }

  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const generated = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}
