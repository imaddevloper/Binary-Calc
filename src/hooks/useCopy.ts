import { useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { usePrefs } from './usePrefs';
import { useI18n } from './useI18n';
import { useToast } from '../components/Toast';

/** Copies exactly the given text, confirms with a toast, and taps lightly if haptics are enabled. */
export function useCopy() {
  const { prefs } = usePrefs();
  const { t } = useI18n();
  const toast = useToast();
  return useCallback(
    async (text: string, confirmation?: string) => {
      try {
        await Clipboard.setStringAsync(text);
        if (prefs.haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        toast.show(confirmation ?? t('common.copied'));
      } catch {
        toast.show(t('common.copyFailed'), 'error');
      }
    },
    [prefs.haptics, t, toast],
  );
}
