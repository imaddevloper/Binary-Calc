import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './Text';
import { IconButton } from './Buttons';
import { ThemeToggle } from './ThemeToggle';
import { spacing } from '../theme/spacing';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  title: string;
  subtitle?: string;
  /** Show a back button (stack screens). */
  back?: boolean;
  /** Show theme toggle + settings (main screens). */
  tools?: boolean;
  onHelp?: () => void;
}

export function AppHeader({ title, subtitle, back, tools, onHelp }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useI18n();
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}>
      {back ? (
        <IconButton
          icon={isRTL ? 'chevron-forward' : 'chevron-back'}
          label={t('common.back')}
          color={colors.text}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      ) : null}
      <View style={styles.titles}>
        <AppText variant="title" numberOfLines={2} accessibilityRole="header">{title}</AppText>
        {subtitle ? <AppText variant="caption" color="secondary" numberOfLines={2}>{subtitle}</AppText> : null}
      </View>
      {onHelp ? <IconButton icon="help-circle" label={t('nav.help')} onPress={onHelp} /> : null}
      {tools ? (
        <>
          <ThemeToggle />
          <IconButton icon="settings" label={t('nav.settings')} onPress={() => router.push('/settings')} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  titles: { flex: 1, paddingHorizontal: spacing.xs },
});
