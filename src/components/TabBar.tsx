import React from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './Text';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, TOUCH } from '../theme/spacing';
import { useI18n } from '../hooks/useI18n';
import type { TKey } from '../i18n';

/**
 * Expo Router's tab navigation object can differ between native versions.
 * The tab bar only needs navigate(); emitting tabPress is optional.
 */
export interface TabBarProps {
  state: { index: number; routes: { key: string; name: string; params?: object }[] };
  navigation?: {
    emit?: (e: { type: 'tabPress'; target: string; canPreventDefault: boolean }) => { defaultPrevented?: boolean };
    navigate?: (name: string, params?: object) => void;
  };
}

const TABS: Record<string, { icon: IconName; label: TKey }> = {
  index: { icon: 'home', label: 'nav.home' },
  calculator: { icon: 'calculator', label: 'nav.calculator' },
  ipv4: { icon: 'globe', label: 'nav.ipv4' },
  learning: { icon: 'school', label: 'nav.learning' },
  history: { icon: 'time', label: 'nav.history' },
};

/** Custom tab bar with localized labels and RTL-aware layout direction. */
export function TabBar({ state, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('a11y.tabs')}
      style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
    >
      {state.routes.map((route, i) => {
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === i;
        const label = t(meta.label);
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              if (focused) return;
              // Some Expo Router/native navigation versions omit emit on the tab navigator.
              // Navigation must still work; dispatch the optional event only when available.
              const event = navigation?.emit?.({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (event?.defaultPrevented) return;
              if (navigation?.navigate) {
                navigation.navigate(route.name, route.params);
              } else {
                // Defensive fallback for native navigator versions that omit the tab navigation prop.
                const pathname = route.name === 'index' ? '/' : `/${route.name}`;
                router.navigate({ pathname, params: route.params } as never);
              }
            }}
            style={styles.item}
          >
            <View style={[styles.pill, focused && { backgroundColor: colors.accentSoft }]}>
              <Icon name={meta.icon} size={22} color={focused ? colors.accent : colors.textSecondary} />
            </View>
            <AppText variant="caption" color={focused ? 'accent' : 'secondary'} numberOfLines={1} style={{ fontSize: 12, lineHeight: 16 }}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: spacing.xs },
  item: { flex: 1, minHeight: TOUCH + 8, alignItems: 'center', justifyContent: 'center', gap: 2 },
  pill: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
