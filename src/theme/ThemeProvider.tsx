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
export const REVEAL_DURATION = 2500;

interface RevealState {
  from: string;
  to?: string;
  origin: Point;
  fromName: ThemeName;
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
  const transitionStarted = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [reveal, setReveal] = useState<RevealState | null>(null);

  const mode = prefs.theme;
  const name: ThemeName = mode === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : mode;
  const setMode = useCallback((m: ThemeMode) => setPref('theme', m), [setPref]);

  const toggleTheme = useCallback((origin: Point) => {
    if (busy.current) return;
    busy.current = true;
    transitionStarted.current = false;
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
        const rel = {
          x: Math.max(0, Math.min(size.w, origin.x - offset.x)),
          y: Math.max(0, Math.min(size.h, origin.y - offset.y)),
        };
        const from = await captureRef(rootRef, shot);
        // Keep the old screen visible until its captured image has actually loaded.
        setReveal({ from, origin: rel, fromName: name });
      } catch {
        setReveal(null);
        setPref('theme', next);
        busy.current = false;
      }
    })();
  }, [name, reduced, size.w, size.h, setPref]);

  const onBaseImageReady = useCallback(() => {
    if (transitionStarted.current || !busy.current) return;
    transitionStarted.current = true;
    void (async () => {
      try {
        const next: ThemeName = name === 'dark' ? 'light' : 'dark';
        setPref('theme', next);
        // Let React Native commit the new palette before capturing it.
        await nextFrame();
        await nextFrame();
        await nextFrame();
        if (!rootRef.current) throw new Error('Theme root is unavailable');
        const to = await captureRef(rootRef, { format: 'png', result: 'tmpfile' });
        setReveal((current) => current ? { ...current, to } : null);
      } catch {
        setReveal(null);
        busy.current = false;
      }
    })();
  }, [name, setPref]);

  const abortBeforeSwitch = useCallback(() => {
    const next: ThemeName = name === 'dark' ? 'light' : 'dark';
    setPref('theme', next);
    setReveal(null);
    busy.current = false;
    transitionStarted.current = false;
  }, [name, setPref]);

  const finish = useCallback(() => {
    setReveal(null);
    busy.current = false;
    transitionStarted.current = false;
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
        {reveal && size.w > 0 ? (
          <ThemeReveal
            key={reveal.from}
            state={reveal}
            width={size.w}
            height={size.h}
            onBaseReady={onBaseImageReady}
            onBaseError={abortBeforeSwitch}
            onFinish={finish}
          />
        ) : null}
        {/* Keep the status bar on the captured palette until the reveal completes. */}
        <StatusBar style={(reveal ? reveal.fromName : name) === 'dark' ? 'light' : 'dark'} />
      </View>
    </ThemeContext.Provider>
  );
}

function ThemeReveal({
  state,
  width,
  height,
  onBaseReady,
  onBaseError,
  onFinish,
}: {
  state: RevealState;
  width: number;
  height: number;
  onBaseReady: () => void;
  onBaseError: () => void;
  onFinish: () => void;
}) {
  const { origin } = state;
  const radius = useSharedValue(0);
  const [targetLoaded, setTargetLoaded] = useState(false);
  const baseReady = useRef(false);
  const maxRadius = Math.hypot(
    Math.max(origin.x, width - origin.x),
    Math.max(origin.y, height - origin.y),
  ) + 2;

  useEffect(() => {
    if (!state.to || !targetLoaded) return;
    radius.value = 0;
    radius.value = withTiming(maxRadius, {
      duration: REVEAL_DURATION,
      easing: Easing.inOut(Easing.cubic),
    });
    const timer = setTimeout(onFinish, REVEAL_DURATION + 80);
    return () => clearTimeout(timer);
  }, [state.to, targetLoaded, maxRadius, radius, onFinish]);

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
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: palettes[state.fromName].background }]}
      pointerEvents="auto"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={{ uri: state.from }}
        style={StyleSheet.absoluteFill}
        resizeMode="stretch"
        fadeDuration={0}
        onLoad={() => {
          if (baseReady.current) return;
          baseReady.current = true;
          onBaseReady();
        }}
        onError={onBaseError}
      />
      {state.to ? (
        <Animated.View style={circleStyle}>
          <Animated.Image
            source={{ uri: state.to }}
            style={imageStyle}
            resizeMode="stretch"
            fadeDuration={0}
            onLoad={() => setTargetLoaded(true)}
            onError={onFinish}
          />
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
