import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText } from './Text';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../theme/spacing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
  /** Emphasised card (the two main tools). */
  featured?: boolean;
}

export function FeatureCard({ icon, title, description, onPress, featured }: Props) {
  const { colors } = useTheme();
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      onPress={onPress}
      onPressIn={() => { s.value = withTiming(0.98, { duration: 90 }); }}
      onPressOut={() => { s.value = withTiming(1, { duration: 120 }); }}
      style={[
        styles.card,
        { backgroundColor: featured ? colors.primary : colors.surface, borderColor: featured ? colors.primary : colors.border },
        anim,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: featured ? 'rgba(255,255,255,0.18)' : colors.accentSoft }]}>
        <Icon name={icon} size={24} color={featured ? colors.onPrimary : colors.accent} />
      </View>
      <View style={styles.texts}>
        <AppText variant="subheading" color={featured ? 'onPrimary' : 'text'} numberOfLines={2}>{title}</AppText>
        <AppText variant="caption" color={featured ? 'onPrimary' : 'secondary'} numberOfLines={3}>{description}</AppText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 150, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md, minHeight: 132 },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  texts: { gap: 2 },
});
