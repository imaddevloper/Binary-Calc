import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './Text';
import { spacing, radius } from '../theme/spacing';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../hooks/useI18n';
import { fonts } from '../theme/typography';
import type { BitCell } from '../core/number-systems/index.ts';

const ROW = 8;

function placeText(c: BitCell): string {
  return c.position >= 16 ? `2^${c.position}` : c.place.toString();
}

/**
 * Bit position / place value / bit, in rows of 8 (the table is always left-to-right, like the
 * bits themselves). Active bits (1) are filled with a bold "1"; inactive bits (0) are dashed and
 * dim — so the difference is not colour-only.
 */
export function BitPlaceValueTable({ bits }: { bits: BitCell[] }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const rows: BitCell[][] = [];
  for (let i = 0; i < bits.length; i += ROW) rows.push(bits.slice(i, i + ROW));

  return (
    <View style={styles.wrap}>
      {rows.map((row, ri) => (
        <View key={ri} style={[styles.table, { borderColor: colors.border }]}>
          <View style={styles.line}>
            <AppText variant="caption" color="secondary" style={styles.label} numberOfLines={2}>{t('conv.bitPos')}</AppText>
            {row.map((c) => (
              <AppText key={c.position} variant="caption" color="secondary" align="center" style={styles.cell}>{c.position}</AppText>
            ))}
          </View>
          <View style={styles.line}>
            <AppText variant="caption" color="secondary" style={styles.label} numberOfLines={2}>{t('conv.placeValue')}</AppText>
            {row.map((c) => (
              <AppText key={c.position} variant="caption" color="secondary" align="center" style={styles.cell} numberOfLines={1} adjustsFontSizeToFit>
                {placeText(c)}
              </AppText>
            ))}
          </View>
          <View style={styles.line}>
            <AppText variant="caption" color="secondary" style={styles.label}>Bit</AppText>
            {row.map((c) => {
              const on = c.bit === 1;
              return (
                <View
                  key={c.position}
                  accessible
                  accessibilityLabel={`${t('conv.bitPos')} ${c.position}, ${t('conv.placeValue')} ${c.place.toString()}, ${on ? t('a11y.flag.on') : t('a11y.flag.off')}`}
                  style={[
                    styles.bit,
                    on
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: 'transparent', borderColor: colors.border, borderStyle: 'dashed' },
                  ]}
                >
                  <AppText variant="mono" color={on ? 'onPrimary' : 'secondary'} align="center" style={{ fontFamily: on ? fonts.monoBold : fonts.mono }}>
                    {c.bit}
                  </AppText>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, direction: 'ltr' },
  table: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  label: { width: 58, fontSize: 11, lineHeight: 14 },
  cell: { flex: 1, fontFamily: fonts.mono, fontSize: 11, lineHeight: 16 },
  bit: { flex: 1, borderWidth: 1, borderRadius: radius.sm, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
});
