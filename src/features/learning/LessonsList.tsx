import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card } from '../../components/Card';
import { AppText } from '../../components/Text';
import { Icon } from '../../components/Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../hooks/useI18n';
import { radius, spacing, TOUCH } from '../../theme/spacing';
import { LESSON_COUNT, LESSON_IDS } from './lessons';
import { loadCompletedLessons } from '../../storage/prefs';
import type { TKey } from '../../i18n';

export function LessonsList() {
  const { colors } = useTheme();
  const { t, tm, isRTL } = useI18n();
  const router = useRouter();
  const [done, setDone] = useState<number[]>([]);

  useFocusEffect(useCallback(() => { void loadCompletedLessons().then(setDone); }, []));

  const pct = (done.length / LESSON_COUNT) * 100;

  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <AppText variant="subheading">{tm('learn.completed', { n: done.length, total: LESSON_COUNT })}</AppText>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View style={[styles.fill, { backgroundColor: colors.primary, width: `${pct}%` }]} />
        </View>
      </Card>
      {LESSON_IDS.map((id) => {
        const title = t(`lesson.${id}.title` as TKey);
        const isDone = done.includes(id);
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${t('learn.open', { n: id, title })}${isDone ? `, ${t('a11y.checked')}` : ''}`}
            onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: String(id) } })}
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.num, { backgroundColor: isDone ? colors.success : colors.accentSoft }]}>
              {isDone ? <Icon name="checkmark-circle" size={20} color={colors.surface} /> : <AppText variant="label" color="accent">{id}</AppText>}
            </View>
            <AppText variant="subheading" style={{ flex: 1 }}>{title}</AppText>
            <Icon name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, minHeight: TOUCH + 8 },
  num: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
