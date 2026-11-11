import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../theme/spacing';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Subtle entrance (opacity + small translate). Off by default for dense lists. */
  animate?: boolean;
  tone?: 'default' | 'accent' | 'error';
}

export function Card({ children, style, animate, tone = 'default' }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const bg = tone === 'accent' ? colors.accentSoft : tone === 'error' ? colors.errorSoft : colors.surface;
  const border = tone === 'accent' ? colors.accent : tone === 'error' ? colors.error : colors.border;
  const content = [styles.card, { backgroundColor: bg, borderColor: border }, style];
  if (animate && !reduced) {
    return <Animated.View entering={FadeInDown.duration(220)} style={content}>{children}</Animated.View>;
  }
  return <View style={content}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
});
