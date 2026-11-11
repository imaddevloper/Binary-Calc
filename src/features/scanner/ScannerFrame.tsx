import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const FRAME_H = 96;

/** Framing guide with corner brackets and a slow scanning line (static when motion is reduced). */
export function ScannerFrame() {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);

  useEffect(() => {
    if (reduced) { cancelAnimation(p); p.value = 0.5; return; }
    p.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(p);
  }, [reduced, p]);

  const line = useAnimatedStyle(() => ({ top: p.value * (FRAME_H - 2) }));

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.frame}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
        <Animated.View style={[styles.line, line]} />
      </View>
    </View>
  );
}

const C = '#FF4D5A';
const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', direction: 'ltr' },
  frame: { width: '84%', height: FRAME_H },
  corner: { position: 'absolute', width: 26, height: 26, borderColor: C },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  line: { position: 'absolute', left: 6, right: 6, height: 2, backgroundColor: C, opacity: 0.8, borderRadius: 1 },
});
