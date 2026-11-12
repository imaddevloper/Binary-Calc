import React, { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform, View } from "react-native";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import { Screen } from "../src/components/Screen";
import { AppHeader } from "../src/components/AppHeader";
import { Card } from "../src/components/Card";
import { AppText } from "../src/components/Text";
import { PrimaryButton, SecondaryButton } from "../src/components/Buttons";
import { ErrorMessage, InfoMessage } from "../src/components/Feedback";
import { useToast } from "../src/components/Toast";
import { useI18n } from "../src/hooks/useI18n";
import type { TKey } from "../src/i18n";
import { spacing } from "../src/theme/spacing";
import { useTheme } from "../src/theme/ThemeProvider";
import {
  completePendingPairing,
  createPairingSession,
  hasPairedDevice,
  loadPendingPairing,
  pollDeviceCommands,
  RemoteApiError,
  revokeThisDevice,
  type PendingPairing,
} from "../src/remote/client";

const DASHBOARD_URL = "https://binary-calc-remote.binary-calc-remote.workers.dev/";

export default function RemoteScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const [pending, setPending] = useState<PendingPairing | null>(null);
  const [paired, setPaired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const [isPaired, pendingPairing] = await Promise.all([
      hasPairedDevice(),
      loadPendingPairing(),
    ]);
    setPaired(isPaired);
    setPending(pendingPairing);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setError(t("remote.loadFailed")));
  }, [refresh, t]);
  useEffect(() => {
    if (!paired) {
      setLastSyncAt(null);
      return;
    }

    let alive = true;
    const poll = async () => {
      if (AppState.currentState !== "active") return;
      try {
        await pollDeviceCommands();
        if (alive) {
          setLastSyncAt(Date.now());
          setError(null);
        }
      } catch (cause) {
        if (!alive) return;
        if (cause instanceof RemoteApiError && ["unauthorized", "not_paired"].includes(cause.code)) {
          setPaired(false);
        }
        setError(errorMessage(cause, t));
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 15_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void poll();
    });

    return () => {
      alive = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [paired, t]);

  const createCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const deviceName = Constants.deviceName || (Platform.OS === "android" ? "Android device" : "Mobile device");
      const created = await createPairingSession(deviceName);
      setPending(created);
      setPaired(false);
    } catch (cause) {
      setError(errorMessage(cause, t));
    } finally {
      setBusy(false);
    }
  };

  const verifyPairing = async () => {
    setBusy(true);
    setError(null);
    try {
      await completePendingPairing();
      setPending(null);
      setPaired(true);
      toast.show(t("remote.pairedToast"));
    } catch (cause) {
      setError(errorMessage(cause, t));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await revokeThisDevice();
      setPending(null);
      setPaired(false);
      toast.show(t("remote.disconnectedToast"));
    } catch (cause) {
      setError(errorMessage(cause, t));
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!pending) return;
    await Clipboard.setStringAsync(pending.pairCode);
    toast.show(t("common.copied"));
  };

  const openDashboard = async () => {
    try {
      await Linking.openURL(DASHBOARD_URL);
    } catch {
      setError(t("remote.openDashboardFailed"));
    }
  };

  const remainingSeconds = pending ? Math.max(0, Math.ceil((pending.expiresAt - Date.now()) / 1000)) : 0;

  return (
    <Screen header={<AppHeader back title={t("remote.title")} />}>
      <Card>
        <AppText variant="heading">{t("remote.heading")}</AppText>
        <AppText variant="body" color="secondary">{t("remote.intro")}</AppText>
        <InfoMessage message={t("remote.securityNote")} />
        <ErrorMessage message={error} />

        {paired ? (
          <View style={{ gap: spacing.md }}>
            <InfoMessage message={t("remote.pairedStatus")} tone="success" />
            {lastSyncAt ? <AppText variant="caption" color="secondary">{t("remote.lastSync", { time: new Date(lastSyncAt).toLocaleTimeString() })}</AppText> : null}
            <AppText variant="caption" color="secondary">{t("remote.pairedLimitations")}</AppText>
            <SecondaryButton label={t("remote.disconnect")} icon="shield-checkmark" onPress={() => void disconnect()} disabled={busy} />
          </View>
        ) : pending ? (
          <View style={{ gap: spacing.md }}>
            <AppText variant="label" color="secondary">{t("remote.pairCodeLabel")}</AppText>
            <View style={{ padding: spacing.lg, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: spacing.sm }}>
              <AppText variant="monoLarge" style={{ fontSize: 34, letterSpacing: 8 }}>{pending.pairCode}</AppText>
              <AppText variant="caption" color="secondary">{t("remote.expiresIn", { seconds: remainingSeconds })}</AppText>
              <SecondaryButton label={t("common.copy")} icon="copy" onPress={() => void copyCode()} />
            </View>
            <PrimaryButton label={t("remote.openDashboard")} onPress={() => void openDashboard()} />
            <SecondaryButton label={t("remote.verifyPairing")} onPress={() => void verifyPairing()} disabled={busy} />
            <AppText variant="caption" color="secondary">{t("remote.pairInstructions")}</AppText>
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <InfoMessage message={t("remote.notPaired")} />
            <PrimaryButton label={t("remote.createCode")} icon="shield-checkmark" onPress={() => void createCode()} loading={busy} disabled={busy} />
          </View>
        )}
      </Card>

      <Card>
        <AppText variant="subheading">{t("remote.freeHeading")}</AppText>
        <AppText variant="body" color="secondary">{t("remote.freeDescription")}</AppText>
        <AppText variant="caption" color="secondary">{t("remote.backgroundWarning")}</AppText>
      </Card>
    </Screen>
  );
}

function errorMessage(cause: unknown, t: (key: TKey) => string): string {
  const code = typeof cause === "object" && cause !== null && "code" in cause
    ? String((cause as { code: unknown }).code)
    : "";
  const keys: Record<string, string> = {
    network_error: "remote.networkError",
    secure_storage_unavailable: "remote.secureStoreUnavailable",
    secure_storage_write_failed: "remote.secureStoreWriteFailed",
    pairing_expired: "remote.pairingExpired",
    pairing_already_pending: "remote.pairingAlreadyPending",
    device_already_paired: "remote.deviceAlreadyPaired",
    pairing_temporarily_locked: "remote.pairingLocked",
    pairing_rate_limited: "remote.pairingRateLimited",
    unauthorized: "remote.unauthorized",
  };
  return t((keys[code] ?? "remote.genericError") as TKey);
}
