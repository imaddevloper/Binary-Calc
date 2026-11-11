import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Card } from '../../components/Card';
import { AppText } from '../../components/Text';
import { Segmented } from '../../components/Segmented';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { InfoMessage } from '../../components/Feedback';
import { useI18n } from '../../hooks/useI18n';
import { spacing } from '../../theme/spacing';
import { CHALLENGE_TYPES, generateChallenge } from '../../core/challenges/index.ts';
import type { Challenge, ChallengeType, Difficulty } from '../../core/challenges/index.ts';
import { ChallengeQuestion } from './ChallengeQuestion';
import type { AnswerMode } from './ChallengeQuestion';
import { loadStats, saveStats } from '../../storage/prefs';
import type { ChallengeStats } from '../../storage/prefs';
import type { TKey } from '../../i18n';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

/** Fresh seed per question; the generator itself is deterministic for a given seed. */
const newSeed = () => (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;

export function ChallengesPanel() {
  const { t } = useI18n();
  const [level, setLevel] = useState<Difficulty>('easy');
  const [type, setType] = useState<ChallengeType>('dec2bin');
  const [mode, setMode] = useState<AnswerMode>('choice');
  const [challenge, setChallenge] = useState<Challenge>(() => generateChallenge('dec2bin', 'easy', newSeed()));
  const [qKey, setQKey] = useState(0);
  const [stats, setStats] = useState<ChallengeStats>({ answered: 0, correct: 0 });

  useEffect(() => { void loadStats().then(setStats); }, []);

  const next = useCallback((ty: ChallengeType = type, lv: Difficulty = level) => {
    setChallenge(generateChallenge(ty, lv, newSeed()));
    setQKey((k) => k + 1);
  }, [type, level]);

  const onAnswered = (correct: boolean) => {
    setStats((s) => {
      const n = { answered: s.answered + 1, correct: s.correct + (correct ? 1 : 0) };
      void saveStats(n);
      return n;
    });
  };

  const resetStats = () => { const z = { answered: 0, correct: 0 }; setStats(z); void saveStats(z); };
  const accuracy = stats.answered === 0 ? 0 : Math.round((stats.correct / stats.answered) * 100);

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <AppText variant="label" color="secondary">{t('chal.difficulty')}</AppText>
        <Segmented
          groupLabel={t('chal.difficulty')}
          value={level}
          onChange={(l) => { setLevel(l); next(type, l); }}
          options={LEVELS.map((l) => ({ value: l, label: t(`chal.level.${l}` as TKey) }))}
        />
        <AppText variant="label" color="secondary">{t('chal.type')}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {CHALLENGE_TYPES.map((ty) => (
            <View key={ty} style={{ flexGrow: 1 }}>
              {ty === type ? (
                <PrimaryButton label={t(`chal.t.${ty}` as TKey)} onPress={() => {}} />
              ) : (
                <SecondaryButton label={t(`chal.t.${ty}` as TKey)} onPress={() => { setType(ty); next(ty, level); }} />
              )}
            </View>
          ))}
        </View>
        <AppText variant="label" color="secondary">{t('chal.mode')}</AppText>
        <Segmented
          groupLabel={t('chal.mode')}
          value={mode}
          onChange={setMode}
          options={[{ value: 'choice', label: t('chal.mode.choice') }, { value: 'typed', label: t('chal.mode.typed') }]}
        />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Stat label={t('chal.answered')} value={String(stats.answered)} />
          <Stat label={t('chal.score')} value={`${stats.correct}/${stats.answered}`} />
          <Stat label={t('chal.accuracy')} value={`${accuracy}%`} />
        </View>
        <InfoMessage message={t('chal.statsNote')} />
        <SecondaryButton label={t('chal.resetStats')} onPress={resetStats} disabled={stats.answered === 0} />
      </Card>

      <ChallengeQuestion key={qKey} challenge={challenge} mode={mode} onAnswered={onAnswered} onNext={() => next()} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" color="secondary">{label}</AppText>
    </View>
  );
}
