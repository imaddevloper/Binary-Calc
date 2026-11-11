import React, { useCallback, useEffect, useState } from 'react';
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
import { Intro } from '../src/components/Intro';
import { loadPrefs, savePref } from '../src/storage/prefs';
import type { Prefs } from '../src/storage/prefs';

// Keep the native splash up until fonts and saved preferences are loaded, so the first
// frame already has the right theme and language (no wrong-theme flash).
void SplashScreen.preventAutoHideAsync().catch(() => {});

/** The branded intro plays once per cold start, never again on resume. */
let introShown = false;

function Navigator() {
  const { colors } = useTheme();
  const [showIntro, setShowIntro] = useState(!introShown);
  const finish = useCallback(() => { introShown = true; setShowIntro(false); }, []);

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
      {showIntro ? <Intro onFinish={finish} /> : null}
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
        // First launch: follow the device language once; after that the user's choice always wins.
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
      // The intro uses the same background colour as the native splash, so the hand-over doesn't flicker.
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
