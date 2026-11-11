import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { View } from 'react-native';
import { isRtl, ltr, translate } from '../i18n';
import type { Lang, Params, TKey } from '../i18n';
import { usePrefs } from './usePrefs';

interface I18nApi {
  lang: Lang;
  isRTL: boolean;
  t: (key: TKey, params?: Params) => string;
  /** Like `t`, but every parameter is isolated left-to-right (for IPs, binary, hex, formulas inside Arabic text). */
  tm: (key: TKey, params?: Params) => string;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nApi | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { prefs, setPref } = usePrefs();
  const lang: Lang = prefs.language ?? 'en';
  const t = useCallback((key: TKey, params?: Params) => translate(lang, key, params), [lang]);
  const tm = useCallback(
    (key: TKey, params?: Params) => {
      if (!params) return translate(lang, key);
      const wrapped: Params = {};
      for (const [k, v] of Object.entries(params)) wrapped[k] = ltr(v);
      return translate(lang, key, wrapped);
    },
    [lang],
  );
  const setLang = useCallback((l: Lang) => setPref('language', l), [setPref]);
  const value = useMemo(() => ({ lang, isRTL: isRtl(lang), t, tm, setLang }), [lang, t, tm, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nApi {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

/**
 * Applies the layout direction without restarting the app. The Yoga `direction`
 * style flips rows, start/end margins and alignment for everything inside.
 * Use it at the root and inside every Modal (modals render in a separate tree).
 */
export function DirectionView({ children, style }: { children: React.ReactNode; style?: React.ComponentProps<typeof View>['style'] }) {
  // Keep the app's writing/layout direction stable when the display language changes.
  return <View style={[{ flex: 1, direction: 'ltr' }, style]}>{children}</View>;
}
