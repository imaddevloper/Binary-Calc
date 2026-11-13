import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { Screen } from "../src/components/Screen";
import { AppHeader } from "../src/components/AppHeader";
import { Card } from "../src/components/Card";
import { AppText } from "../src/components/Text";
import { PrimaryButton, SecondaryButton } from "../src/components/Buttons";
import { ErrorMessage, InfoMessage } from "../src/components/Feedback";
import { useTheme } from "../src/theme/ThemeProvider";
import { spacing } from "../src/theme/spacing";
import { supabase } from "../src/remote/supabase";
import { processPendingSupabaseCommands } from "../src/remote/supabase-commands";
import { registerCurrentDevice, updateCurrentDeviceHeartbeat, syncFolderGrantMetadata, enableRemotePushNotifications } from "../src/remote/supabase-device";
import { addFolderGrant, listFolderGrants, removeFolderGrant } from "../src/remote/storage";
import type { FolderGrantSummary } from "../src/remote/storage";

export default function RemoteScreen() {
  const { colors } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderGrantSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setLoadingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError(null);
      if (!nextSession?.user?.id) {
        setDeviceId(null);
        setFolders([]);
      }
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const refreshFolders = useCallback(async () => {
    setFolders(await listFolderGrants());
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    let alive = true;
    void Promise.resolve().then(() => {
      if (!alive) return null;
      setBusy(true);
      setMessage("تسجيل هذا الهاتف في حسابك...");
      return registerCurrentDevice();
    })
      .then(async (id) => {
        if (!alive || !id) return;
        setDeviceId(id);
        await refreshFolders();
        setMessage("تم تسجيل هذا الهاتف. يمكنك الآن إدارة المجلدات التي اخترتها.");
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : "تعذر تسجيل الجهاز");
      })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [session?.user?.id, refreshFolders]);

  const submitAuth = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage("تم إنشاء الحساب. افتح بريدك الإلكتروني وأكّد الحساب، ثم سجّل الدخول.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذرت المصادقة");
    } finally {
      setBusy(false);
    }
  };

  const addFolder = async () => {
    if (!deviceId) return;
    setBusy(true); setError(null);
    try {
      const grant = await addFolderGrant();
      if (grant) {
        await syncFolderGrantMetadata(deviceId, session?.user.id);
        await refreshFolders();
        setMessage("تم حفظ صلاحية المجلد ومزامنة بياناته الآمنة.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر منح صلاحية المجلد");
    } finally { setBusy(false); }
  };

  const deleteFolder = async (id: string) => {
    if (!deviceId) return;
    setBusy(true); setError(null);
    try {
      await removeFolderGrant(id);
      await syncFolderGrantMetadata(deviceId, session?.user.id);
      await refreshFolders();
      setMessage("تم إلغاء صلاحية المجلد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إلغاء صلاحية المجلد");
    } finally { setBusy(false); }
  };

  const signOut = async () => {
    setBusy(true);
    const { error: signOutError } = await supabase.auth.signOut();
    setBusy(false);
    if (signOutError) setError(signOutError.message);
    else setMessage("تم تسجيل الخروج من هذا الهاتف.");
  };

  if (loadingSession) {
    return <Screen header={<AppHeader back title="الوصول البعيد" />}>
      <Card><AppText variant="body">جارٍ تحميل جلسة الحساب...</AppText></Card>
    </Screen>;
  }

  return (
    <Screen header={<AppHeader back title="الوصول البعيد عبر Supabase" />}>
      {!session ? (
        <Card>
          <AppText variant="heading">{mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}</AppText>
          <AppText variant="body" color="secondary">
            استخدم البريد وكلمة المرور نفسيهما في لوحة الويب وعلى جميع هواتفك. كل هاتف سيظهر كجهاز مستقل.
          </AppText>
          <ErrorMessage message={error} />
          {message ? <InfoMessage message={message} tone="success" /> : null}
          <View style={styles.field}>
            <AppText variant="label">البريد الإلكتروني</AppText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="name@example.com"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            />
          </View>
          <View style={styles.field}>
            <AppText variant="label">كلمة المرور</AppText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType={mode === "signin" ? "password" : "newPassword"}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            />
          </View>
          <PrimaryButton label={busy ? "يرجى الانتظار..." : mode === "signin" ? "تسجيل الدخول" : "إنشاء الحساب"} onPress={() => void submitAuth()} disabled={busy || !email.trim() || password.length < 6} loading={busy} />
          <SecondaryButton label={mode === "signin" ? "ليس لديك حساب؟ إنشاء حساب" : "لديك حساب؟ تسجيل الدخول"} onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setMessage(null); }} disabled={busy} />
          <InfoMessage message="تُحفظ جلسة الهاتف في SecureStore. لا تضع مفاتيح سرية داخل التطبيق." />
        </Card>
      ) : (
        <>
          <Card>
            <AppText variant="heading">هذا الهاتف مرتبط بحسابك</AppText>
            <AppText variant="body" color="secondary">{session.user.email}</AppText>
            <InfoMessage message={deviceId ? "تم تسجيل هذا التثبيت كجهاز مستقل." : "جارٍ تسجيل الجهاز..."} tone={deviceId ? "success" : "secondary"} />
            {deviceId ? <AppText variant="caption" color="secondary">Device ID: {deviceId}</AppText> : null}
            {lastSync ? <AppText variant="caption" color="secondary">آخر مزامنة: {lastSync.toLocaleTimeString()}</AppText> : null}
            <ErrorMessage message={error} />
            {message ? <InfoMessage message={message} /> : null}
            <SecondaryButton label="تحديث الآن" onPress={() => deviceId ? void updateCurrentDeviceHeartbeat(deviceId).then(() => processPendingSupabaseCommands(deviceId)).then(() => setLastSync(new Date())).catch(cause => setError(cause instanceof Error ? cause.message : "فشل التحديث")) : undefined} disabled={!deviceId || busy} />
            <SecondaryButton label="تفعيل إشعارات الأوامر (FCM)" onPress={() => deviceId ? void enableRemotePushNotifications(deviceId).then(() => setMessage("تم حفظ رمز إشعارات هذا الهاتف.")).catch(cause => setError(cause instanceof Error ? cause.message : "تعذر تفعيل الإشعارات")) : undefined} disabled={!deviceId || busy} />
            <SecondaryButton label="تسجيل الخروج" onPress={() => void signOut()} disabled={busy} />
          </Card>
          <Card>
            <AppText variant="subheading">المجلدات التي سمحت بالوصول إليها</AppText>
            <AppText variant="body" color="secondary">اختر المجلد يدوياً من نافذة Android. يُحفظ عنوان SAF على الهاتف فقط، ويُرسل إلى الخادم اسم المجلد وبصمة غير قابلة للاستخدام كمسار.</AppText>
            {folders.length === 0 ? <AppText variant="caption" color="secondary">لم تختر أي مجلد بعد.</AppText> : folders.map(folder => (
              <View key={folder.id} style={styles.folderRow}>
                <AppText variant="body" style={{ flex: 1 }}>{folder.name}</AppText>
                <SecondaryButton label="إلغاء" onPress={() => void deleteFolder(folder.id)} disabled={busy} />
              </View>
            ))}
            <PrimaryButton label="اختيار مجلد ومنح الوصول" onPress={() => void addFolder()} disabled={busy || !deviceId || folders.length >= 3} loading={busy} />
            <AppText variant="caption" color="secondary">الحد الحالي 3 مجلدات لكل هاتف. لا يتيح التطبيق الوصول إلى ملفات التطبيقات الأخرى.</AppText>
          </Card>
          <Card>
            <AppText variant="subheading">قيود الاتصال في الخلفية</AppText>
            <AppText variant="body" color="secondary">الأوامر تُعالج تلقائياً أثناء تشغيل التطبيق عبر Realtime والفحص الدوري. إشعارات FCM تحتاج إعداد سر Firebase في Supabase، وقد يتأخر التنفيذ بالخلفية. الهاتف المطفي أو التطبيق الذي أُجبر على الإيقاف لا يمكنه استقبال أمر.</AppText>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, fontSize: 14, writingDirection: "ltr", textAlign: "left" },
  folderRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
});
