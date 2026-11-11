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
  /** Animated switch between light and dark, expanding from `origin` (window coordinates). */
  toggleTheme: (origin: Point) => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);

export const REVEAL_DURATION = 620;

interface RevealState {
  from: string; // snapshot URI of the old theme
  to: string; // snapshot URI of the new theme
  origin: Point; // relative to the app surface
}

function measure(ref: React.RefObject<View | null>): Promise<{ x: number; y: number }> {
  return new Promise((resolve) => {
    if (!ref.current) return resolve({ x: 0, y: 0 });
    ref.current.measureInWindow((x, y) => resolve({ x, y }));
  });
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

  const toggleTheme = useCallback(
    (origin: Point) => {
      if (busy.current) return; // ignore rapid repeated taps while a reveal is running
      busy.current = true;
      const next: ThemeName = name === 'dark' ? 'light' : 'dark';

      if (reduced || !rootRef.current || size.w === 0) {
        setPref('theme', next); // reduced motion: change theme with no expanding animation
        busy.current = false;
        return;
      }

      (async () => {
        try {
          const shot = { format: 'jpg' as const, quality: 0.85, result: 'tmpfile' as const };
          const off = await measure(rootRef);
          const rel = { x: origin.x - off.x, y: origin.y - off.y };
          const from = await captureRef(rootRef, shot);
          // Show the old look on top, switch the theme underneath, then photograph the new look.
          setReveal({ from, to: from, origin: rel });
          setPref('theme', next);
          await wait(120); // let the new theme render
          const to = await captureRef(rootRef, shot);
          setReveal({ from, to, origin: rel });
        } catch {
          setPref('theme', next);
          setReveal(null);
          busy.current = false;
        }
      })();
    },
    [name, reduced, size.w, setPref],
  );

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

/**
 * The circular reveal: the old theme (photo) covers the screen; a circle that grows from the
 * toggle shows a photo of the new theme. When the circle covers the surface, the overlay is
 * removed and the live (already switched) UI is revealed — identical to the last frame.
 */
function ThemeReveal({ state, width, height, onFinish }: { state: RevealState; width: number; height: number; onFinish: () => void }) {
  const { origin } = state;
  const ready = state.to !== state.from;
  const r = useSharedValue(0);
  const maxR = Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)) + 2;

  useEffect(() => {
    if (!ready) return;
    r.value = 0;
    r.value = withTiming(maxR, { duration: REVEAL_DURATION, easing: Easing.bezier(0.4, 0, 0.2, 1) });
    const id = setTimeout(onFinish, REVEAL_DURATION + 60);
    return () => clearTimeout(id);
  }, [ready, maxR, r, onFinish]);

  const circle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: origin.x - r.value,
    top: origin.y - r.value,
    width: r.value * 2,
    height: r.value * 2,
    borderRadius: r.value,
    overflow: 'hidden',
  }));
  const inner = useAnimatedStyle(() => ({
    position: 'absolute',
    left: -(origin.x - r.value),
    top: -(origin.y - r.value),
    width,
    height,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={{ uri: state.from }} style={{ width, height }} fadeDuration={0} />
      {ready ? (
        <Animated.View style={circle}>
          <Animated.Image source={{ uri: state.to }} style={inner} fadeDuration={0} />
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
