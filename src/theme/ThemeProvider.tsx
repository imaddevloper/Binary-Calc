import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, useColorScheme, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import { palettes } from './colors';
import type { Palette, ThemeMode, ThemeName } from './colors';
import { usePrefs } from '../hooks/usePrefs';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Point { x: number; y: number }

interface ThemeApi {
  colors: Palette;
  name: ThemeName;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggleTheme: (origin: Point) => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);
export const REVEAL_DURATION = 3200;

interface RevealState {
  from: string;
  to: string;
  origin: Point;
}

function measure(ref: React.RefObject<View | null>): Promise<{ x: number; y: number }> {
  return new Promise((resolve) => {
    if (!ref.current) return resolve({ x: 0, y: 0 });
    ref.current.measureInWindow((x, y) => resolve({ x, y }));
  });
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { prefs, setPref } = usePrefs();
  const scheme = useColorScheme();
  const reduced = useReducedMotion();
  const rootRef = useRef<View>(null);
  const busy = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [reveal, setReveal] = useState<RevealState | null>(null);

  const mode = prefs.theme;
  const name: ThemeName = mode === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : mode;
  const setMode = useCallback((m: ThemeMode) => setPref('theme', m), [setPref]);

  const toggleTheme = useCallback((origin: Point) => {
    if (busy.current) return;
    busy.current = true;
    const next: ThemeName = name === 'dark' ? 'light' : 'dark';

    if (reduced || !rootRef.current || size.w === 0 || size.h === 0) {
      setPref('theme', next);
      busy.current = false;
      return;
    }

    void (async () => {
      try {
        const shot = { format: 'png' as const, result: 'tmpfile' as const };
        const offset = await measure(rootRef);
        const rel = { x: origin.x - offset.x, y: origin.y - offset.y };
        const from = await captureRef(rootRef, shot);

        // Keep the captured old palette visible while the live tree switches underneath.
        setReveal({ from, to: from, origin: rel });
        await nextFrame();
        setPref('theme', next);
        await nextFrame();
        await nextFrame();

        const to = await captureRef(rootRef, shot);
        setReveal({ from, to, origin: rel });
      } catch {
        setReveal(null);
        setPref('theme', next);
        busy.current = false;
      }
    })();
  }, [name, reduced, size.w, size.h, setPref]);

  const finish = useCallback(() => {
    setReveal(null);
    busy.current = false;
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s.w === width && s.h === height ? s : { w: width, h: height }));
  }, []);

  const value = useMemo<ThemeApi>(
    () => ({ colors: palettes[name], name, mode, setMode, toggleTheme }),
    [name, mode, setMode, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={styles.fill} onLayout={onLayout}>
        <View ref={rootRef} collapsable={false} style={[styles.fill, { backgroundColor: palettes[name].background }]}>
          {children}
        </View>
        {reveal && size.w > 0 ? <ThemeReveal state={reveal} width={size.w} height={size.h} onFinish={finish} /> : null}
        <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      </View>
    </ThemeContext.Provider>
  );
}

function ThemeReveal({ state, width, height, onFinish }: { state: RevealState; width: number; height: number; onFinish: () => void }) {
  const { origin } = state;
  const ready = state.to !== state.from;
  const radius = useSharedValue(0);
  const maxRadius = Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)) + 4;

  useEffect(() => {
    if (!ready) return;
    radius.value = 0;
    radius.value = withTiming(maxRadius, {
      duration: REVEAL_DURATION,
      easing: Easing.inOut(Easing.cubic),
    });
    const timer = setTimeout(onFinish, REVEAL_DURATION + 100);
    return () => clearTimeout(timer);
  }, [ready, maxRadius, radius, onFinish]);

  const circleStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: origin.x - radius.value,
    top: origin.y - radius.value,
    width: radius.value * 2,
    height: radius.value * 2,
    borderRadius: radius.value,
    overflow: 'hidden',
  }));
  const imageStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: -(origin.x - radius.value),
    top: -(origin.y - radius.value),
    width,
    height,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={{ uri: state.from }} style={StyleSheet.absoluteFill} resizeMode="stretch" fadeDuration={0} />
      {ready ? (
        <Animated.View style={circleStyle}>
          <Animated.Image source={{ uri: state.to }} style={imageStyle} resizeMode="stretch" fadeDuration={0} />
        </Animated.View>
      ) : null}
    </View>
  );
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
