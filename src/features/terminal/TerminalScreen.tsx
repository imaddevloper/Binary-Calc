import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, NativeModules, Platform, StyleSheet, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { AppText } from '../../components/Text';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { Screen } from '../../components/Screen';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, radius } from '../../theme/spacing';
import { TermuxNativeView } from './TermuxNativeView';

type RuntimeStatus = 'checking' | 'missing' | 'installing' | 'ready' | 'unsupported' | 'error';

interface RuntimeInfo {
  installed: boolean;
  prefix: string;
  architecture: string;
}

interface EmbeddedTermuxBridge {
  getRuntimeStatus: () => Promise<RuntimeInfo>;
  installBootstrap: () => Promise<RuntimeInfo>;
}

export function TerminalScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [status, setStatus] = useState<RuntimeStatus>('checking');
  const [architecture, setArchitecture] = useState('');
  const [error, setError] = useState('');

  const inspectRuntime = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setStatus('unsupported');
      return;
    }
    const bridge = NativeModules.EmbeddedTermux as EmbeddedTermuxBridge | undefined;
    if (!bridge) {
      setError('EmbeddedTermux native module is unavailable. Build the Android app with the embedded Termux config plugin.');
      setStatus('error');
      return;
    }
    setStatus('checking');
    setError('');
    try {
      const runtime = await bridge.getRuntimeStatus();
      setArchitecture(runtime.architecture);
      setStatus(runtime.installed ? 'ready' : 'missing');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void inspectRuntime();
  }, [inspectRuntime]);

  const install = useCallback(async () => {
    const bridge = NativeModules.EmbeddedTermux as EmbeddedTermuxBridge | undefined;
    if (!bridge) {
      setStatus('error');
      setError('EmbeddedTermux native module is unavailable.');
      return;
    }
    setStatus('installing');
    setError('');
    try {
      const runtime = await bridge.installBootstrap();
      setArchitecture(runtime.architecture);
      setStatus('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setStatus('error');
    }
  }, []);

  const panel = (children: React.ReactNode) => (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {children}
    </View>
  );

  return (
    <Screen
      scroll={false}
      header={<AppHeader back title={t('terminal.title')} subtitle={t('terminal.subtitle')} />}
    >
      <View style={styles.content}>
        <View style={styles.intro}>
          <AppText variant="body" color="secondary">{t('terminal.description')}</AppText>
          {status === 'ready' ? (
            <View style={[styles.status, { backgroundColor: colors.accentSoft }]}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <AppText variant="caption" color="accent">{t('terminal.ready')}</AppText>
            </View>
          ) : null}
        </View>

        {status === 'ready' && TermuxNativeView ? (
          <View style={styles.terminalWrap}>
            <View style={styles.terminalHeader}>
              <View style={styles.trafficLights}>
                <View style={[styles.trafficLight, { backgroundColor: '#FF5F57' }]} />
                <View style={[styles.trafficLight, { backgroundColor: '#FEBC2E' }]} />
                <View style={[styles.trafficLight, { backgroundColor: '#28C840' }]} />
              </View>
              <AppText variant="caption" color="secondary">BASH · {architecture.toUpperCase()}</AppText>
              <View style={{ width: 38 }} />
            </View>
            <TermuxNativeView
              style={styles.terminal}
              fontSize={14}
              autoStart
              accessible
              accessibilityLabel="Embedded Termux terminal"
            />
            <View style={styles.terminalFooter}>
              <AppText variant="caption" color="secondary">{t('terminal.shellHint')}</AppText>
            </View>
          </View>
        ) : (
          <View style={styles.center}>
            {status === 'checking' || status === 'installing' ? (
              panel(
                <>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <AppText variant="subheading" textAlign="center">
                    {status === 'checking' ? t('terminal.checking') : t('terminal.installing')}
                  </AppText>
                  <AppText variant="caption" color="secondary" textAlign="center">{t('terminal.installHint')}</AppText>
                </>
              )
            ) : status === 'missing' ? (
              panel(
                <>
                  <AppText variant="subheading" textAlign="center">{t('terminal.missing')}</AppText>
                  <AppText variant="caption" color="secondary" textAlign="center">{t('terminal.installHint')}</AppText>
                  <AppText variant="caption" color="secondary" textAlign="center">
                    {t('terminal.architecture', { arch: architecture || 'ARM' })}
                  </AppText>
                  <PrimaryButton label={t('terminal.install')} onPress={() => void install()} />
                </>
              )
            ) : status === 'unsupported' ? (
              panel(<AppText variant="body" color="secondary" textAlign="center">{t('terminal.unsupported')}</AppText>)
            ) : (
              panel(
                <>
                  <AppText variant="subheading" textAlign="center">{t('terminal.errorTitle')}</AppText>
                  <AppText variant="caption" color="secondary" textAlign="center">{error || t('terminal.bootstrapFailed')}</AppText>
                  <SecondaryButton label={t('terminal.retry')} onPress={() => void inspectRuntime()} />
                  {Platform.OS === 'android' ? (
                    <PrimaryButton label={t('terminal.install')} onPress={() => void install()} />
                  ) : null}
                </>
              )
            )}
          </View>
        )}

        {status === 'ready' ? (
          <AppText variant="caption" color="secondary" style={styles.tip}>{t('terminal.firstRun')}</AppText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  intro: { gap: spacing.sm },
  status: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  dot: { width: 7, height: 7, borderRadius: radius.pill },
  center: { flex: 1, justifyContent: 'center' },
  panel: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, alignItems: 'stretch' },
  terminalWrap: { flex: 1, minHeight: 260, borderRadius: radius.lg, borderWidth: 1, borderColor: '#292934', overflow: 'hidden', backgroundColor: '#0B0B0F' },
  terminalHeader: { height: 42, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#17171F', borderBottomWidth: 1, borderBottomColor: '#292934' },
  trafficLights: { width: 38, flexDirection: 'row', alignItems: 'center', gap: 5 },
  trafficLight: { width: 8, height: 8, borderRadius: 4 },
  terminal: { flex: 1, width: '100%', backgroundColor: '#0B0B0F' },
  terminalFooter: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: '#292934', backgroundColor: '#14141A' },
  tip: { paddingBottom: spacing.xs },
});
