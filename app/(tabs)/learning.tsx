import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../src/components/AppHeader';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { LessonsList } from '../../src/features/learning/LessonsList';
import { ChallengesPanel } from '../../src/features/challenges/ChallengesPanel';
import { useI18n } from '../../src/hooks/useI18n';

type Tab = 'lessons' | 'challenges';

export default function LearningScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'challenges' ? 'challenges' : 'lessons');

  useEffect(() => {
    if (params.tab === 'lessons' || params.tab === 'challenges') setTab(params.tab);
  }, [params.tab]);

  return (
    <Screen bottomInset={72} header={<AppHeader tools title={t('learn.title')} />}>
      <Segmented
        groupLabel={t('learn.title')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'lessons', label: t('learn.tab.lessons') },
          { value: 'challenges', label: t('learn.tab.challenges') },
        ]}
      />
      {tab === 'lessons' ? <LessonsList /> : <ChallengesPanel />}
    </Screen>
  );
}
