import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { AppText, Mono } from './Text';
import { IconButton } from './Buttons';
import { spacing } from '../theme/spacing';
import { useCopy } from '../hooks/useCopy';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  label: string;
  /** Text shown (may be grouped for readability). */
  value: string;
  /** Text copied. Defaults to `value`. Use for the exact, ungrouped value. */
  copyValue?: string;
  /** Slot for the "Show steps" / expand button. */
  footer?: React.ReactNode;
  large?: boolean;
  animate?: boolean;
}

/** Label + large monospaced value + copy. One result per card, never a dense paragraph. */
export function ResultCard({ label, value, copyValue, footer, large = true, animate }: Props) {
  const copy = useCopy();
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <Card animate={animate}>
      <View style={styles.head}>
        <AppText variant="label" color="secondary" style={styles.flex}>{label}</AppText>
        <IconButton
          icon="copy"
          size={20}
          color={colors.accent}
          label={t('a11y.copy', { label })}
          onPress={() => void copy(copyValue ?? value)}
        />
      </View>
      <Mono large={large} selectable accessibilityLabel={`${label}: ${value}`}>{value}</Mono>
      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: -spacing.xs, marginBottom: -spacing.sm },
  flex: { flex: 1 },
});
