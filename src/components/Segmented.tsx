import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, TOUCH } from '../theme/spacing';
import { AppText } from './Text';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useI18n } from '../hooks/useI18n';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  /** Spoken label if different from the visible one. */
  a11yLabel?: string;
}

interface Props<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Name of the group for screen readers. */
  groupLabel?: string;
}

/** Segmented control with an animated selection indicator. Used for bases, operations, tabs, filters. */
export function Segmented<T extends string | number>({ options, value, onChange, groupLabel }: Props<T>) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);

  const key = String(value);
  const current = layouts[key];

  useEffect(() => {
    if (!current) return;
    if (reduced || w.value === 0) {
      x.value = current.x;
      w.value = current.w;
    } else {
      x.value = withTiming(current.x, { duration: 200 });
      w.value = withTiming(current.w, { duration: 200 });
    }
  }, [current, reduced, x, w]);

  const indicator = useAnimatedStyle(() => ({ left: x.value, width: w.value }));

  const onItemLayout = (k: string) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    setLayouts((prev) => (prev[k]?.x === lx && prev[k]?.w === width ? prev : { ...prev, [k]: { x: lx, w: width } }));
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={groupLabel}
      style={[styles.wrap, { backgroundColor: colors.background, borderColor: colors.border }]}
    >
      <Animated.View pointerEvents="none" style={[styles.indicator, { backgroundColor: colors.primary }, indicator]} />
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onLayout={onItemLayout(String(o.value))}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={`${o.a11yLabel ?? o.label}${selected ? `, ${t('a11y.selected')}` : ''}`}
            accessibilityState={{ selected }}
            style={styles.item}
          >
            <AppText variant="label" color={selected ? 'onPrimary' : 'secondary'} align="center" numberOfLines={2}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, padding: 3, position: 'relative' },
  indicator: { position: 'absolute', top: 3, bottom: 3, borderRadius: radius.md - 3 },
  item: { flex: 1, minHeight: TOUCH - 6, paddingHorizontal: spacing.sm, paddingVertical: 4, alignItems: 'center', justifyContent: 'center' },
});
