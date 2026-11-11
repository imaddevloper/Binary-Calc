import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';
import { AppText } from './Text';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useI18n } from '../hooks/useI18n';
import { fonts } from '../theme/typography';

/** Total length of the branded intro (ms). */
export const INTRO_DURATION = 5000;

const BG = '#0B0B0F';
const RED = '#D91E2B';

const DIGITS: { t: string; x: number; y: number; s: number }[] = [
  { t: '0', x: 0.08, y: 0.1, s: 30 }, { t: '1', x: 0.82, y: 0.08, s: 26 }, { t: '0101', x: 0.62, y: 0.2, s: 20 },
  { t: '1', x: 0.12, y: 0.26, s: 22 }, { t: '10', x: 0.86, y: 0.36, s: 26 }, { t: '0', x: 0.05, y: 0.52, s: 28 },
  { t: '1101', x: 0.7, y: 0.68, s: 20 }, { t: '1', x: 0.9, y: 0.8, s: 30 }, { t: '0', x: 0.18, y: 0.78, s: 24 },
  { t: '01', x: 0.4, y: 0.9, s: 22 }, { t: '1', x: 0.3, y: 0.06, s: 20 }, { t: '0', x: 0.55, y: 0.95, s: 20 },
];

/**
 * Branded hand-off after Android's native splash: animated app name and loading line.
 * The logo is intentionally not repeated here to avoid showing it twice at launch.
 */
export function Intro({ onFinish }: { onFinish: () => void }) {
  const { height, width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const { t } = useI18n();

  const bg = useSharedValue(0);
  const title = useSharedValue(0);
  const progress = useSharedValue(0);
  const exit = useSharedValue(1);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    bg.value = withTiming(1, { duration: 350 });
    title.value = withDelay(350, withTiming(1, { duration: 900, easing: ease }));
    progress.value = withDelay(1300, withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.quad) }));
    exit.value = withDelay(4600, withTiming(0, { duration: 400 }));
    const id = setTimeout(onFinish, INTRO_DURATION);
    return () => clearTimeout(id);
  }, [bg, title, progress, exit, onFinish]);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bg.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.value,
    transform: reduced ? [] : [{ translateY: (1 - title.value) * 16 }],
  }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: exit.value }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const barW = Math.min(240, width * 0.64);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} accessibilityLabel={t('app.name')} accessibilityRole="progressbar">
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]} pointerEvents="none">
        <View style={[styles.stripe, { top: height * 0.12, left: -width * 0.2, opacity: 0.1 }]} />
        <View style={[styles.stripe, { top: height * 0.62, left: -width * 0.4, opacity: 0.07, height: 26 }]} />
        <View style={[styles.line, { top: height * 0.17, left: width * 0.06, width: width * 0.26 }]} />
        <View style={[styles.dot, { top: height * 0.17 - 4, left: width * 0.06 - 4 }]} />
        <View style={[styles.line, { top: height * 0.84, right: width * 0.05, width: width * 0.3 }]} />
        <View style={[styles.dot, { top: height * 0.84 - 4, right: width * 0.05 + width * 0.3 - 4 }]} />
        {DIGITS.map((d, i) => (
          <AppText
            key={i}
            style={{ position: 'absolute', left: d.x * width, top: d.y * height, fontFamily: fonts.mono, fontSize: d.s, color: '#FFFFFF', opacity: 0.06, writingDirection: 'ltr' }}
          >
            {d.t}
          </AppText>
        ))}
      </Animated.View>

      <Animated.View style={[styles.titleWrap, { top: height / 2 - 34 }, titleStyle]}>
        <AppText variant="title" style={styles.title} align="center">{t('app.name')}</AppText>
      </Animated.View>
      <View style={[styles.barTrack, { top: height / 2 + 28, width: barW, left: (width - barW) / 2 }]}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: BG, zIndex: 100, elevation: 100 },
  titleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  title: { color: '#FFFFFF', letterSpacing: 0.8 },
  barTrack: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: RED, borderRadius: 2 },
  stripe: { position: 'absolute', width: '160%', height: 54, backgroundColor: RED, transform: [{ rotate: '-24deg' }] },
  line: { position: 'absolute', height: 1, backgroundColor: RED, opacity: 0.35 },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: RED, opacity: 0.45 },
});
