import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View, useColorScheme } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SystemUI from 'expo-system-ui';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { getLocales } from 'expo-localization';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold } from '@expo-google-fonts/cairo';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { PrefsProvider } from '../src/hooks/usePrefs';
import { DirectionView, I18nProvider } from '../src/hooks/useI18n';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { ToastProvider } from '../src/components/Toast';
import { Intro } from '../src/components/Intro';
import { loadPrefs, savePref } from '../src/storage/prefs';
import type { Prefs } from '../src/storage/prefs';
import { palettes } from '../src/theme/colors';
import { startSupabaseAuthLifecycle } from '../src/remote/supabase';
import { getRegisteredDeviceId } from '../src/remote/supabase-device';
import { processPendingSupabaseCommands } from '../src/remote/supabase-commands';

// Keep the native splash visible until fonts and saved preferences are ready.
void SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigator() {
  const { colors } = useTheme();

  return (
    <DirectionView>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 220,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </DirectionView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, JetBrainsMono_500Medium, JetBrainsMono_700Bold });
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [introVisible, setIntroVisible] = useState(true);
  const systemScheme = useColorScheme();
  const finishIntro = useCallback(() => setIntroVisible(false), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await loadPrefs();
      if (p.language === null) {
        const detected = getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';
        p.language = detected;
        void savePref('language', detected);
      }
      if (alive) setPrefs(p);
    })();
    return () => { alive = false; };
  }, []);

  const ready = prefs !== null && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (!ready || !prefs) return;
    let active = true;
    const resolvedTheme = prefs.theme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : prefs.theme;
    void SystemUI.setBackgroundColorAsync(palettes[resolvedTheme].background)
      .catch(() => undefined)
      .then(() => {
        if (active) void SplashScreen.hideAsync().catch(() => {});
      });
    return () => { active = false; };
  }, [ready, prefs, systemScheme]);

  if (!ready || !prefs) return null;

  return (
    <SafeAreaProvider>
      <PrefsProvider initial={prefs}>
        <I18nProvider>
          <ThemeProvider>
            <ToastProvider>
              <View style={styles.fill}>
                <Navigator />
                {introVisible ? <Intro onFinish={finishIntro} /> : null}
              </View>
            </ToastProvider>
          </ThemeProvider>
        </I18nProvider>
      </PrefsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
