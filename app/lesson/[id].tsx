import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { AppHeader } from '../../src/components/AppHeader';
import { EmptyState } from '../../src/components/Feedback';
import { LessonView } from '../../src/features/learning/LessonView';
import { LESSON_COUNT } from '../../src/features/learning/lessons';
import { useI18n } from '../../src/hooks/useI18n';

export default function LessonScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const n = Number(id);
  const valid = Number.isInteger(n) && n >= 1 && n <= LESSON_COUNT;

  return (
    <Screen header={<AppHeader back title={t('learn.title')} />}>
      {valid ? <LessonView key={n} id={n} /> : <EmptyState icon="alert-circle" title={t('hist.loadFailed')} description={t('learn.title')} />}
    </Screen>
  );
}
