import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Mono } from '../../components/Text';
import { Icon } from '../../components/Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../hooks/useI18n';
import { radius, spacing, TOUCH } from '../../theme/spacing';
import type { OcrCandidate } from '../../core/ocr/candidates.ts';

/**
 * One recognised candidate. Validity comes from the strict IPv4 validator, never from the OCR engine;
 * corrected or invalid candidates are clearly marked so the user confirms them.
 */
export function OcrCandidateCard({ candidate, selected, onSelect }: { candidate: OcrCandidate; selected: boolean; onSelect: () => void }) {
  const { colors } = useTheme();
  const { t, tm } = useI18n();
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${candidate.suggested}, ${candidate.valid ? t('scan.validOk') : t('scan.notValid')}${selected ? `, ${t('a11y.selected')}` : ''}`}
      style={[
        styles.card,
        { borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1, backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.top}>
        <Mono large style={{ flex: 1 }}>{candidate.suggested}</Mono>
        <Icon
          name={candidate.valid ? 'checkmark-circle' : 'alert-circle'}
          size={22}
          color={candidate.valid ? colors.success : colors.warning}
        />
      </View>
      <AppText variant="caption" color={candidate.valid ? 'success' : 'warning'}>
        {candidate.valid ? t('scan.validOk') : t('scan.notValid')}
      </AppText>
      {candidate.corrected ? (
        <>
          <AppText variant="caption" color="secondary">{tm('scan.raw', { raw: candidate.raw })}</AppText>
          <AppText variant="caption" color="warning">{t('scan.corrected')}</AppText>
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, padding: spacing.md, gap: spacing.xs, minHeight: TOUCH },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
