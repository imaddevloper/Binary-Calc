import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../components/Card';
import { AppText } from '../../components/Text';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { useI18n } from '../../hooks/useI18n';
import { spacing } from '../../theme/spacing';
import { LESSON_COUNT, LESSON_TRY } from './lessons';
import { ChallengeQuestion } from '../challenges/ChallengeQuestion';
import { generateChallenge } from '../../core/challenges/index.ts';
import { loadCompletedLessons, saveCompletedLessons } from '../../storage/prefs';
import type { TKey } from '../../i18n';

const newSeed = () => (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;

export function LessonView({ id }: { id: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const [done, setDone] = useState<number[]>([]);
  const [seed, setSeed] = useState(newSeed);

  useEffect(() => { void loadCompletedLessons().then(setDone); }, []);

  const spec = LESSON_TRY[id];
  const challenge = generateChallenge(spec.type, spec.difficulty, seed);
  const steps = t(`lesson.${id}.steps` as TKey).split('\n');
  const isDone = done.includes(id);

  const markDone = () => {
    if (isDone) return;
    const n = [...done, id].sort((a, b) => a - b);
    setDone(n);
    void saveCompletedLessons(n);
  };

  const go = (target: number) => router.replace({ pathname: '/lesson/[id]', params: { id: String(target) } });

  return (
    <View style={{ gap: spacing.lg }}>
      <AppText variant="label" color="accent">{t('learn.progress', { n: id, total: LESSON_COUNT })}</AppText>
      <AppText variant="title" accessibilityRole="header">{t(`lesson.${id}.title` as TKey)}</AppText>
      <Card>
        <AppText variant="body">{t(`lesson.${id}.body` as TKey)}</AppText>
      </Card>
      <Card>
        <AppText variant="label" color="secondary">{t('learn.example')}</AppText>
        <AppText variant="body">{t(`lesson.${id}.example` as TKey)}</AppText>
      </Card>
      <Card>
        <AppText variant="label" color="secondary">{t('learn.steps')}</AppText>
        {steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <AppText variant="label" color="accent">{`${i + 1}.`}</AppText>
            <AppText variant="body" style={{ flex: 1 }}>{s}</AppText>
          </View>
        ))}
      </Card>
      <Card tone="error">
        <AppText variant="label" color="secondary">{t('learn.mistake')}</AppText>
        <AppText variant="body">{t(`lesson.${id}.mistake` as TKey)}</AppText>
      </Card>

      <AppText variant="heading">{t('learn.tryIt')}</AppText>
      <ChallengeQuestion
        key={seed}
        challenge={challenge}
        mode="typed"
        onNext={() => setSeed(newSeed())}
        nextLabel={t('chal.start')}
      />

      <PrimaryButton
        icon="checkmark-circle"
        label={isDone ? t('learn.done') : t('learn.markDone')}
        onPress={markDone}
        disabled={isDone}
      />
      <View style={styles.nav}>
        <SecondaryButton label={t('common.previous')} onPress={() => go(id - 1)} disabled={id <= 1} style={styles.flex} />
        {id < LESSON_COUNT ? (
          <PrimaryButton label={t('common.next')} onPress={() => go(id + 1)} style={styles.flex} />
        ) : (
          <PrimaryButton label={t('learn.finish')} onPress={() => router.back()} style={styles.flex} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: spacing.sm },
  nav: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
