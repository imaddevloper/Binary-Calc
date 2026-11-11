import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { usePrefs } from './usePrefs';

/** True when the user chose "Reduce motion" in the app OR Android's "Remove animations" is on. */
export function useReducedMotion(): boolean {
  const { prefs } = usePrefs();
  const [system, setSystem] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setSystem(v);
    }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return prefs.reduceMotion || system;
}
