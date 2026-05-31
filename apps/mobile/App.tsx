import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Subscription } from "expo-modules-core";
import { tenantConfig, tenantId } from "./src/config/tenant";
import {
  registerForPushNotifications,
  registerNotificationOpenedListener,
  unregisterDevice,
  type RegistrationStatus
} from "./src/services/notifications";

export default function App() {
  const [status, setStatus] = useState<RegistrationStatus>({
    permissionStatus: "unavailable",
    registered: false
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let subscription: Subscription | undefined;

    if (status.deviceId) {
      void registerNotificationOpenedListener(status.deviceId).then((listener) => {
        subscription = listener;
      });
    }

    return () => {
      subscription?.remove();
    };
  }, [status.deviceId]);

  async function handleRegister() {
    setBusy(true);
    setMessage("");
    try {
      const result = await registerForPushNotifications();
      setStatus(result);
      setMessage(result.registered ? "Token registrado no backend." : "Permissão não ativa.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no registro");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnregister() {
    if (!status.deviceId) {
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      await unregisterDevice(status.deviceId);
      setStatus((current) => ({
        ...current,
        registered: false
      }));
      setMessage("Device removido do consentimento ativo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover device");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.appName}>{tenantConfig.appName}</Text>
          <Text style={styles.subtitle}>MVP de notificações consent-based</Text>
        </View>

        <View style={styles.panel}>
          <StatusRow label="Tenant atual" value={tenantId} />
          <StatusRow label="Permissão" value={status.permissionStatus} />
          <StatusRow label="Token registrado" value={status.registered ? "sim" : "não"} />
          <StatusRow label="Device ID" value={status.deviceId ?? "não registrado"} />
          <StatusRow label="Expo Push Token" value={status.token ?? "não gerado"} multiline />
        </View>

        <TouchableOpacity style={[styles.button, busy && styles.disabled]} onPress={handleRegister} disabled={busy}>
          <Text style={styles.buttonText}>Solicitar permissão e registrar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, (!status.deviceId || busy) && styles.disabled]}
          onPress={handleUnregister}
          disabled={!status.deviceId || busy}
        >
          <Text style={styles.secondaryButtonText}>Revogar consentimento no backend</Text>
        </TouchableOpacity>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.note}>
          <Text style={styles.noteText}>
            Ícones Android são definidos por iconKey previamente empacotado. O nome real do app e o ícone real do iOS exigem build white-label separado.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, multiline && styles.multiline]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: "#f6f7f9",
    flex: 1
  },
  content: {
    gap: 16,
    padding: 20
  },
  header: {
    gap: 4,
    paddingTop: 10
  },
  appName: {
    color: "#17202a",
    fontSize: 26,
    fontWeight: "700"
  },
  subtitle: {
    color: "#66717f",
    fontSize: 14
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#d8dee6",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  row: {
    borderBottomColor: "#eef1f4",
    borderBottomWidth: 1,
    gap: 6,
    padding: 14
  },
  label: {
    color: "#66717f",
    fontSize: 13
  },
  value: {
    color: "#17202a",
    fontSize: 16,
    fontWeight: "600"
  },
  multiline: {
    fontSize: 12,
    lineHeight: 18
  },
  button: {
    alignItems: "center",
    backgroundColor: "#0f766e",
    borderRadius: 6,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8dee6",
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  secondaryButtonText: {
    color: "#17202a",
    fontSize: 15,
    fontWeight: "700"
  },
  disabled: {
    opacity: 0.55
  },
  message: {
    color: "#115e59",
    fontSize: 14
  },
  note: {
    backgroundColor: "#eef1f4",
    borderRadius: 8,
    padding: 12
  },
  noteText: {
    color: "#66717f",
    fontSize: 13,
    lineHeight: 18
  }
});
