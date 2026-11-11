import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_PREFS, resetPrefs, savePref } from '../storage/prefs';
import type { Prefs } from '../storage/prefs';

interface PrefsApi {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  resetAll: (detectedLanguage: Prefs['language']) => Promise<void>;
}

const PrefsContext = createContext<PrefsApi | null>(null);

export function PrefsProvider({ initial, children }: { initial: Prefs; children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    void savePref(key, value);
  }, []);

  const resetAll = useCallback(async (detectedLanguage: Prefs['language']) => {
    await resetPrefs();
    setPrefs({ ...DEFAULT_PREFS, language: detectedLanguage });
  }, []);

  const value = useMemo(() => ({ prefs, setPref, resetAll }), [prefs, setPref, resetAll]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsApi {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider');
  return ctx;
}
