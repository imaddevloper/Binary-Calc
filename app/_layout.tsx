import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { loadPrefs, savePref } from '../src/storage/prefs';
import type { Prefs } from '../src/storage/prefs';

// Keep the single native splash visible until fonts and saved preferences are ready.
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
    if (ready) {
      requestAnimationFrame(() => { void SplashScreen.hideAsync().catch(() => {}); });
    }
  }, [ready]);

  if (!ready || !prefs) return null;

  return (
    <SafeAreaProvider>
      <PrefsProvider initial={prefs}>
        <I18nProvider>
          <ThemeProvider>
            <ToastProvider>
              <View style={styles.fill}>
                <Navigator />
              </View>
            </ToastProvider>
          </ThemeProvider>
        </I18nProvider>
      </PrefsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
