import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/spacing';

interface Props {
  header: React.ReactNode;
  children: React.ReactNode;
  /** Extra bottom space (e.g. above the tab bar). */
  bottomInset?: number;
  scroll?: boolean;
}

/**
 * Screen frame: themed background, header slot, keyboard avoidance, scrolling for short
 * screens, safe-area padding, and a readable max width on tablets.
 */
export function Screen({ header, children, bottomInset = 0, scroll = true }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const maxWidth = 720;
  const side = Math.max(spacing.lg, (width - maxWidth) / 2);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={{ alignSelf: 'center', width: '100%', maxWidth: maxWidth + spacing.lg * 2 }}>{header}</View>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {scroll ? (
          <ScrollView
            style={styles.fill}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: side,
              paddingTop: spacing.sm,
              paddingBottom: insets.bottom + spacing.xxl + bottomInset,
              gap: spacing.lg,
            }}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, { paddingHorizontal: side }]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
