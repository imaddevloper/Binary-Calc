import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Mono } from '../../components/Text';
import { IconButton } from '../../components/Buttons';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../hooks/useI18n';
import { radius, spacing, TOUCH } from '../../theme/spacing';
import type { HistoryEntry } from '../../storage/history';
import { formatTime, historySummary, historyTitle } from './describe';
import type { TKey } from '../../i18n';

const ICON: Record<HistoryEntry['kind'], IconName> = { convert: 'swap-horizontal', arith: 'calculator', ipv4: 'globe' };

export function HistoryItem({ entry, onOpen, onDelete }: { entry: HistoryEntry; onOpen: () => void; onDelete?: () => void }) {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const typeLabel = t(`hist.type.${entry.kind}` as TKey);
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${typeLabel}: ${historyTitle(entry, t)}. ${historySummary(entry, t)}`}
        accessibilityHint={t('hist.detail')}
        onPress={onOpen}
        style={styles.main}
      >
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <Icon name={ICON[entry.kind]} size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color="secondary">{`${typeLabel} · ${formatTime(entry.createdAt, lang)}`}</AppText>
          <Mono numberOfLines={1}>{historyTitle(entry, t)}</Mono>
          <Mono color="secondary" numberOfLines={2} style={{ fontSize: 13, lineHeight: 20 }}>{historySummary(entry, t)}</Mono>
        </View>
      </Pressable>
      {onDelete ? <IconButton icon="trash" size={20} color={colors.textSecondary} label={t('hist.delete')} onPress={onDelete} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.lg, paddingEnd: spacing.xs },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: TOUCH + 24 },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
