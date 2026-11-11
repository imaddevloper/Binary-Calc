import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  const router = useRouter();
  const [localTab, setLocalTab] = useState<Tab>('lessons');
  const tab: Tab = params.tab === 'lessons' || params.tab === 'challenges' ? params.tab : localTab;
  const changeTab = (next: Tab) => {
    setLocalTab(next);
    if (params.tab !== undefined) router.setParams({ tab: undefined });
  };

  return (
    <Screen bottomInset={72} header={<AppHeader tools title={t('learn.title')} />}>
      <Segmented
        groupLabel={t('learn.title')}
        value={tab}
        onChange={changeTab}
        options={[
          { value: 'lessons', label: t('learn.tab.lessons') },
          { value: 'challenges', label: t('learn.tab.challenges') },
        ]}
      />
      {tab === 'lessons' ? <LessonsList /> : <ChallengesPanel />}
    </Screen>
  );
}
