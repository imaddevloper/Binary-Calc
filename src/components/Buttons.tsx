import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, TOUCH } from '../theme/spacing';
import { AppText } from './Text';
import { Icon } from './Icon';
import type { IconName } from './Icon';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Small press-scale feedback that never changes layout (transform only). */
function usePressScale() {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return {
    style,
    onPressIn: () => { s.value = withTiming(0.97, { duration: 90 }); },
    onPressOut: () => { s.value = withTiming(1, { duration: 120 }); },
  };
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function PrimaryButton({ label, onPress, icon, disabled, loading, style, accessibilityHint }: ButtonProps) {
  const { colors } = useTheme();
  const press = usePressScale();
  const off = disabled || loading;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.btn, { backgroundColor: off ? colors.disabled : colors.primary }, press.style, style]}
    >
      {loading ? <ActivityIndicator color={colors.onPrimary} /> : icon ? <Icon name={icon} size={20} color={colors.onPrimary} /> : null}
      <AppText variant="subheading" color="onPrimary" numberOfLines={2} style={styles.btnText}>{label}</AppText>
    </AnimatedPressable>
  );
}

export function SecondaryButton({ label, onPress, icon, disabled, style, accessibilityHint }: ButtonProps) {
  const { colors } = useTheme();
  const press = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }, press.style, style]}
    >
      {icon ? <Icon name={icon} size={20} color={disabled ? colors.disabled : colors.accent} /> : null}
      <AppText variant="subheading" color={disabled ? 'secondary' : 'text'} numberOfLines={2} style={styles.btnText}>{label}</AppText>
    </AnimatedPressable>
  );
}

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const IconButton = React.forwardRef<React.ComponentRef<typeof Pressable>, IconButtonProps>(function IconButton(
  { icon, onPress, label, size = 22, color, disabled, style },
  ref,
) {
  const press = usePressScale();
  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.iconBtn, press.style, style]}
      collapsable={false}
    >
      <Icon name={icon} size={size} color={color} />
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  btn: {
    minHeight: TOUCH,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  btnText: { flexShrink: 1, textAlign: 'center' },
  iconBtn: { width: TOUCH, height: TOUCH, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
