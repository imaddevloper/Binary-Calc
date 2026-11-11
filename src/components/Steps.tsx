import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { AppText, Mono } from './Text';
import { Icon } from './Icon';
import { InfoMessage } from './Feedback';
import { spacing } from '../theme/spacing';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../hooks/useI18n';
import {
  binaryToDecimalSteps, binaryToHexSteps, decimalToBinarySteps, decimalToHexSteps,
  hexToBinarySteps, hexToDecimalSteps,
} from '../core/number-systems/index.ts';
import type { Base, PositionalSteps } from '../core/number-systems/index.ts';

/** Collapsible block used for every "show steps" area. */
export function Collapsible({ title, children, initiallyOpen = false, plain = false }: { title: string; children: React.ReactNode; initiallyOpen?: boolean; plain?: boolean }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.collapsible}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={plain ? title : `${title}, ${open ? t('common.hideSteps') : t('common.showSteps')}`}
        onPress={() => setOpen((o) => !o)}
        style={styles.collapsibleHead}
      >
        <AppText variant="subheading" style={styles.flex}>{title}</AppText>
        {plain ? null : <AppText variant="label" color="accent">{open ? t('common.hideSteps') : t('common.showSteps')}</AppText>}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.accent} />
      </Pressable>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </View>
  );
}

function Line({ children }: { children: string }) {
  return <AppText variant="body">{children}</AppText>;
}

function PositionalBlock({ steps, radix, digitsLen }: { steps: PositionalSteps; radix: 2 | 16; digitsLen: number }) {
  const { tm } = useI18n();
  const terms = steps.terms.filter((x) => digitsLen <= 16 || x.contribution !== 0n);
  return (
    <>
      <Line>{tm('step.posIntro', { radix })}</Line>
      {terms.map((x) => (
        <Mono key={x.power}>
          {`${x.digit} × ${radix}^${x.power} = ${x.contribution}`}
        </Mono>
      ))}
      <Mono color="accent">{steps.expression}</Mono>
      <Mono color="accent">{`= ${steps.sumExpression}`}</Mono>
      <AppText variant="subheading">{tm('step.posTotal', { sum: steps.sumExpression, total: steps.total.toString() })}</AppText>
    </>
  );
}

const MAX_STEP_BITS = 64;

/**
 * Real step-by-step explanations generated from the same engine that produced the results.
 * `value` is the parsed integer, `from` the base the user typed, `normalized` its normalised digits.
 */
export function ConversionSteps({ value, from, normalized }: { value: bigint; from: Base; normalized: string }) {
  const { t, tm } = useI18n();
  const negative = value < 0n;
  const magnitude = negative ? -value : value;

  if (magnitude.toString(2).length > MAX_STEP_BITS) {
    return <InfoMessage message={t('conv.noStepsLong')} />;
  }
  const digits = normalized.replace(/^-/, '');
  const neg = negative ? <InfoMessage message={tm('step.negative', { magnitude: digits })} /> : null;

  if (from === 10) {
    const d2b = decimalToBinarySteps(value);
    const d2h = decimalToHexSteps(value);
    return (
      <View style={styles.stack}>
        {neg}
        <Collapsible title={t('step.d2b.title')} initiallyOpen>
          <Line>{tm('step.divRepeat', { base: 2 })}</Line>
          {d2b.rows.map((r, i) => (
            <AppText key={i} variant="body">{tm('step.divRow', { dividend: r.dividend.toString(), divisor: r.divisor, quotient: r.quotient.toString(), remainder: r.remainder })}</AppText>
          ))}
          <Line>{t('step.readUp')}</Line>
          <Mono large color="accent">{d2b.result}</Mono>
          <Line>{t('step.placeValues')}</Line>
          <Mono>{d2b.expression}</Mono>
        </Collapsible>
        <Collapsible title={t('step.d2h.title')}>
          <Line>{tm('step.divRepeat', { base: 16 })}</Line>
          {d2h.rows.map((r, i) => (
            <AppText key={i} variant="body">{tm('step.divRowHex', { dividend: r.dividend.toString(), divisor: r.divisor, quotient: r.quotient.toString(), remainder: r.remainder, digit: r.digit })}</AppText>
          ))}
          <Line>{t('step.hexLetters')}</Line>
          {d2h.letterDigits.length > 0 ? (
            <Line>{tm('step.hexLettersUsed', { list: d2h.letterDigits.map((l) => `${l.digit} = ${l.value}`).join(', ') })}</Line>
          ) : null}
          <Line>{t('step.readUp')}</Line>
          <Mono large color="accent">{d2h.result}</Mono>
        </Collapsible>
      </View>
    );
  }

  if (from === 2) {
    const b2d = binaryToDecimalSteps(digits);
    const b2h = binaryToHexSteps(digits);
    return (
      <View style={styles.stack}>
        {neg}
        <Collapsible title={t('step.b2d.title')} initiallyOpen>
          <PositionalBlock steps={b2d} radix={2} digitsLen={digits.length} />
        </Collapsible>
        <Collapsible title={t('step.b2h.title')}>
          <Line>{t('step.group4')}</Line>
          <Line>{b2h.paddedBy > 0 ? tm('step.pad', { n: b2h.paddedBy }) : t('step.noPad')}</Line>
          {b2h.groups.map((g, i) => <Mono key={i}>{`${g.bits} = ${g.hex}`}</Mono>)}
          <Mono large color="accent">{b2h.result}</Mono>
        </Collapsible>
      </View>
    );
  }

  const h2d = hexToDecimalSteps(digits);
  const h2b = hexToBinarySteps(digits);
  return (
    <View style={styles.stack}>
      {neg}
      <Collapsible title={t('step.h2d.title')} initiallyOpen>
        <Line>{t('step.hexLetters')}</Line>
        <PositionalBlock steps={h2d} radix={16} digitsLen={digits.length} />
      </Collapsible>
      <Collapsible title={t('step.h2b.title')}>
        <Line>{t('step.h2bIntro')}</Line>
        {h2b.groups.map((g, i) => <Mono key={i}>{`${g.hex} = ${g.bits}`}</Mono>)}
        <Line>{t('step.leadingZeros')}</Line>
        <Mono large color="accent">{h2b.result}</Mono>
      </Collapsible>
    </View>
  );
}

/** Helper for screens that need a titled steps container. */
export function StepsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <AppText variant="heading">{title}</AppText>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  flex: { flex: 1 },
  collapsible: { gap: spacing.sm },
  collapsibleHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  collapsibleBody: { gap: spacing.sm, paddingBottom: spacing.sm },
});
