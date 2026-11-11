import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../theme/spacing';
import { AppText } from './Text';
import { Icon } from './Icon';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface ToastApi { show: (message: string, tone?: 'success' | 'error') => void }
const ToastContext = createContext<ToastApi>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [toast, setToast] = useState<{ id: number; message: string; tone: 'success' | 'error' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    AccessibilityInfo.announceForAccessibility(message);
    timer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 88 }]}>
          <Animated.View
            key={toast.id}
            entering={reduced ? undefined : FadeInDown.duration(180)}
            exiting={reduced ? undefined : FadeOut.duration(160)}
            style={[styles.toast, { backgroundColor: colors.elevated, borderColor: colors.border }]}
          >
            <Icon name={toast.tone === 'success' ? 'checkmark-circle' : 'alert-circle'} size={20} color={toast.tone === 'success' ? colors.success : colors.error} />
            <AppText variant="label" style={{ flexShrink: 1 }}>{toast.message}</AppText>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: spacing.lg },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: '100%',
    elevation: 4,
  },
});
