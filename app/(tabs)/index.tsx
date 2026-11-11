import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppHeader } from '../../src/components/AppHeader';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { AppText } from '../../src/components/Text';
import { FeatureCard } from '../../src/components/FeatureCard';
import { InputField } from '../../src/components/InputField';
import { Segmented } from '../../src/components/Segmented';
import { ResultCard } from '../../src/components/ResultCard';
import { SecondaryButton } from '../../src/components/Buttons';
import { EmptyState } from '../../src/components/Feedback';
import { HistoryItem } from '../../src/features/history/HistoryItem';
import { useI18n } from '../../src/hooks/useI18n';
import { usePrefs } from '../../src/hooks/usePrefs';
import { spacing } from '../../src/theme/spacing';
import { convertBetweenBases, parseIntegerInput } from '../../src/core/number-systems/index.ts';
import type { Base } from '../../src/core/number-systems/index.ts';
import { listHistory } from '../../src/storage/history';
import type { HistoryEntry } from '../../src/storage/history';
import { canonical, display } from '../../src/utils/format';
import { numberError } from '../../src/features/messages';

const BASES: Base[] = [2, 10, 16];

export default function Home() {
  const { t } = useI18n();
  const { prefs } = usePrefs();
  const router = useRouter();
  const [recent, setRecent] = useState<HistoryEntry[]>([]);
  const [from, setFrom] = useState<Base>(prefs.defaultBase);
  const [to, setTo] = useState<Base>(prefs.defaultBase === 2 ? 10 : 2);
  const [raw, setRaw] = useState('');

  useFocusEffect(useCallback(() => {
    listHistory(3).then(setRecent).catch(() => setRecent([]));
  }, []));

  const quick = useMemo(() => {
    if (raw.trim() === '') return null;
    const p = parseIntegerInput(raw, from);
    if (!p.ok) return { error: numberError(p.error, t) };
    return { value: convertBetweenBases(raw, from, to) };
  }, [raw, from, to, t]);

  const opts = { group: prefs.groupBinary, upperHex: prefs.upperHex };
  const result = quick && 'value' in quick && quick.value && quick.value.ok ? quick.value : null;
  const resultText = result ? result.output : null;

  const go = (pathname: string, params?: Record<string, string>) => router.navigate({ pathname, params } as never);

  return (
    <Screen
      bottomInset={72}
      header={<AppHeader tools title={t('app.name')} subtitle={t('app.subtitle')} />}
    >
      <Card animate>
        <AppText variant="heading">{t('home.welcome')}</AppText>
        <AppText variant="body" color="secondary">{t('home.intro')}</AppText>
      </Card>

      <View style={styles.grid}>
        <FeatureCard featured icon="swap-horizontal" title={t('home.f.converter')} description={t('home.f.converterDesc')} onPress={() => go('/calculator', { mode: 'convert' })} />
        <FeatureCard featured icon="calculator" title={t('home.f.arith')} description={t('home.f.arithDesc')} onPress={() => go('/calculator', { mode: 'arith' })} />
        <FeatureCard icon="globe" title={t('home.f.ipv4')} description={t('home.f.ipv4Desc')} onPress={() => go('/ipv4')} />
        <FeatureCard icon="camera" title={t('home.f.scan')} description={t('home.f.scanDesc')} onPress={() => router.push('/scanner')} />
        <FeatureCard icon="school" title={t('home.f.learn')} description={t('home.f.learnDesc')} onPress={() => go('/learning')} />
        <FeatureCard icon="time" title={t('home.f.history')} description={t('home.f.historyDesc')} onPress={() => go('/history')} />
      </View>

      <Card>
        <AppText variant="heading">{t('home.quick')}</AppText>
        <AppText variant="caption" color="secondary">{t('home.quickHint')}</AppText>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="label" color="secondary">{t('home.quickFrom')}</AppText>
          <Segmented groupLabel={t('home.quickFrom')} value={from} onChange={setFrom} options={BASES.map((b) => ({ value: b, label: t(`base.chip.${b}`), a11yLabel: t(`base.${b}`) }))} />
        </View>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="label" color="secondary">{t('home.quickTo')}</AppText>
          <Segmented groupLabel={t('home.quickTo')} value={to} onChange={setTo} options={BASES.map((b) => ({ value: b, label: t(`base.chip.${b}`), a11yLabel: t(`base.${b}`) }))} />
        </View>
        <InputField
          label={t('conv.input')}
          value={raw}
          onChangeText={setRaw}
          placeholder={t(`conv.placeholder.${from}`)}
          keyboardType={from === 16 ? 'default' : 'numeric'}
          autoCapitalize={from === 16 ? 'characters' : 'none'}
          error={quick && 'error' in quick ? quick.error : null}
        />
        {resultText !== null ? (
          <ResultCard
            label={`${t('home.quickResult')} · ${t(`base.short.${to}`)}`}
            value={display(resultText, to, opts)}
            copyValue={canonical(resultText, to, prefs.upperHex)}
          />
        ) : null}
        <SecondaryButton
          label={t('home.quickOpen')}
          onPress={() => go('/calculator', { mode: 'convert', base: String(from), value: raw })}
        />
      </Card>

      <View style={{ gap: spacing.md }}>
        <View style={styles.rowHead}>
          <AppText variant="heading" style={{ flex: 1 }}>{t('home.recent')}</AppText>
          {recent.length > 0 ? <SecondaryButton label={t('home.viewAll')} onPress={() => go('/history')} /> : null}
        </View>
        {recent.length === 0 ? (
          <Card>
            <EmptyState icon="time" title={t('home.recentEmpty')} description={t('home.recentEmptyDesc')} />
          </Card>
        ) : (
          recent.map((e) => (
            <HistoryItem
              key={e.id}
              entry={e}
              onOpen={() => go('/history', { open: String(e.id) })}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
