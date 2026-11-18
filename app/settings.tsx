import React, { useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { getLocales } from 'expo-localization';
import { Screen } from '../src/components/Screen';
import { AppHeader } from '../src/components/AppHeader';
import { Card } from '../src/components/Card';
import { AppText } from '../src/components/Text';
import { Segmented } from '../src/components/Segmented';
import { SecondaryButton } from '../src/components/Buttons';
import { ActionRow, SettingsSection, SwitchRow } from '../src/components/Settings';
import { ConfirmationDialog, ErrorMessage, InfoMessage } from '../src/components/Feedback';
import { useToast } from '../src/components/Toast';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { useI18n } from '../src/hooks/useI18n';
import { usePrefs } from '../src/hooks/usePrefs';
import { useTheme } from '../src/theme/ThemeProvider';
import { spacing } from '../src/theme/spacing';
import { clearHistory } from '../src/storage/history';
import type { Base } from '../src/core/number-systems/index.ts';
import type { ThemeMode } from '../src/theme/colors';
import type { Lang } from '../src/i18n';

/** The developer's Instagram profile. Opening it is the only action — nothing is sent. */
const INSTAGRAM_URL = 'https://www.instagram.com/andercode1?srtk=ZDIyZjg2OXI1YmUx';

export default function SettingsScreen() {
  const { t, lang, setLang } = useI18n();
  const { prefs, setPref, resetAll } = usePrefs();
  const { name, mode, setMode, toggleTheme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const themeBox = useRef<React.ComponentRef<typeof View>>(null);
  const [confirm, setConfirm] = useState<'history' | 'reset' | null>(null);
  const [contactFailed, setContactFailed] = useState(false);

  const version = Constants.expoConfig?.version ?? t('set.unknown');
  const build = Constants.expoConfig?.android?.versionCode;

  const chooseTheme = (m: ThemeMode) => {
    // Picking the opposite of what is showing runs the circular reveal from the selector.
    if (m !== 'system' && m !== name && themeBox.current) {
      themeBox.current.measureInWindow((x, y, w, h) => toggleTheme({ x: x + w / 2, y: y + h / 2 }));
    } else {
      setMode(m);
    }
  };

  const openInstagram = async () => {
    setContactFailed(false);
    try {
      // Android opens the Instagram app if installed, otherwise the browser.
      await Linking.canOpenURL(INSTAGRAM_URL).catch(() => true);
      await Linking.openURL(INSTAGRAM_URL);
    } catch {
      setContactFailed(true);
    }
  };

  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(INSTAGRAM_URL);
      toast.show(t('set.linkCopied'));
    } catch {
      toast.show(t('common.copyFailed'), 'error');
    }
  };

  const doConfirm = async () => {
    if (confirm === 'history') {
      await clearHistory().catch(() => {});
      toast.show(t('set.historyCleared'));
    } else if (confirm === 'reset') {
      await resetAll(getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en');
      toast.show(t('set.prefsReset'));
    }
    setConfirm(null);
  };

  return (
    <Screen
      header={
        <View>
          <AppHeader back title={t('set.title')} />
        </View>
      }
    >
      <SettingsSection title={t('set.appearance')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <AppText variant="subheading" style={{ flex: 1 }}>{t('set.theme')}</AppText>
          <ThemeToggle />
        </View>
        <View ref={themeBox} collapsable={false}>
          <Segmented
            groupLabel={t('set.theme')}
            value={mode}
            onChange={chooseTheme}
            options={[
              { value: 'light', label: t('theme.light') },
              { value: 'dark', label: t('theme.dark') },
              { value: 'system', label: t('theme.system') },
            ]}
          />
        </View>
        <InfoMessage message={t('set.themeNote')} />
      </SettingsSection>

      <SettingsSection title={t('set.language')}>
        <Segmented<Lang>
          groupLabel={t('set.language')}
          value={lang}
          onChange={setLang}
          options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]}
        />
      </SettingsSection>


      <SettingsSection title={t('remote.title')}>
        <ActionRow icon="shield-checkmark" label={t('remote.heading')} description={t('remote.intro')} onPress={() => router.push('/remote')} />
      </SettingsSection>

      <SettingsSection title={t('set.calc')}>
        <AppText variant="subheading">{t('set.defaultBase')}</AppText>
        <Segmented<Base>
          groupLabel={t('set.defaultBase')}
          value={prefs.defaultBase}
          onChange={(b) => setPref('defaultBase', b)}
          options={([2, 10, 16] as Base[]).map((b) => ({ value: b, label: t(`base.short.${b}`), a11yLabel: t(`base.${b}`) }))}
        />
        <SwitchRow label={t('set.groupBinary')} description={t('set.groupBinaryDesc')} value={prefs.groupBinary} onChange={(v) => setPref('groupBinary', v)} />
        <SwitchRow label={t('set.upperHex')} description={t('set.upperHexDesc')} value={prefs.upperHex} onChange={(v) => setPref('upperHex', v)} />
        <SwitchRow label={t('set.haptics')} description={t('set.hapticsDesc')} value={prefs.haptics} onChange={(v) => setPref('haptics', v)} />
        <SwitchRow label={t('set.reduceMotion')} description={t('set.reduceMotionDesc')} value={prefs.reduceMotion} onChange={(v) => setPref('reduceMotion', v)} />
      </SettingsSection>

      <SettingsSection title={t('set.data')}>
        <AppText variant="body" color="secondary">{t('set.dataStored')}</AppText>
        <SecondaryButton icon="trash" label={t('set.clearHistory')} onPress={() => setConfirm('history')} />
        <SecondaryButton icon="refresh" label={t('set.resetPrefs')} onPress={() => setConfirm('reset')} />
      </SettingsSection>

      <SettingsSection title={t('set.about')}>
        <AppText variant="subheading">{t('app.name')}</AppText>
        <AppText variant="body" color="secondary">{t('set.aboutDesc')}</AppText>
        <AppText variant="caption" color="secondary">{`${t('set.version')}: ${version}${build ? `  ·  ${t('set.build')}: ${build}` : ''}`}</AppText>
        <AppText variant="caption" color="secondary">{t('set.libs')}</AppText>
      </SettingsSection>

      <Card>
        <ActionRow icon="help-circle" label={t('set.helpRow')} description={t('set.helpRowDesc')} onPress={() => router.push('/help')} />
        <ActionRow icon="logo-instagram" label={t('set.contact')} description={t('set.contactDesc')} onPress={() => void openInstagram()} />
        {contactFailed ? (
          <View style={{ gap: spacing.sm }}>
            <ErrorMessage message={t('set.contactFail')} />
            <SecondaryButton icon="copy" label={t('set.copyLink')} onPress={() => void copyLink()} />
          </View>
        ) : null}
      </Card>

      <ConfirmationDialog
        visible={confirm !== null}
        title={confirm === 'history' ? t('hist.clearTitle') : t('set.resetTitle')}
        body={confirm === 'history' ? t('hist.clearBody') : t('set.resetBody')}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void doConfirm()}
      />
    </Screen>
  );
}
