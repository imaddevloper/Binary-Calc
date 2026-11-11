import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText, Mono } from './Text';
import { InfoMessage } from './Feedback';
import { spacing } from '../theme/spacing';
import { useI18n } from '../hooks/useI18n';
import type { ArithResult } from '../core/arithmetic/index.ts';

/** Localized, engine-generated steps for the four binary operations. */
export function ArithSteps({ result }: { result: ArithResult }) {
  const { t, tm } = useI18n();
  const s = result.steps;

  if (s.kind === 'add') {
    return (
      <View style={styles.stack}>
        <AppText variant="body">{t('arith.add.intro')}</AppText>
        <Mono>{`  ${s.aPadded.padStart(result.binary.length)}`}</Mono>
        <Mono>{`+ ${s.bPadded.padStart(result.binary.length)}`}</Mono>
        <Mono color="accent">{`= ${result.binary}`}</Mono>
        {s.columns.map((c) => (
          <AppText key={c.position} variant="body">
            {tm('arith.add.col', { pos: c.position, a: c.a, b: c.b, c: c.carryIn, s: c.sum, co: c.carryOut })}
          </AppText>
        ))}
        {s.finalCarry ? <AppText variant="body">{t('arith.add.final')}</AppText> : null}
      </View>
    );
  }

  if (s.kind === 'sub') {
    return (
      <View style={styles.stack}>
        <AppText variant="body">{t('arith.sub.intro')}</AppText>
        {s.swapped ? <InfoMessage tone="warning" message={t('arith.sub.swapped')} /> : null}
        <Mono>{`  ${s.topPadded}`}</Mono>
        <Mono>{`− ${s.bottomPadded}`}</Mono>
        <Mono color="accent">{`= ${result.binary.padStart(s.topPadded.length + (result.negative ? 1 : 0))}`}</Mono>
        {s.columns.map((c) => (
          <AppText key={c.position} variant="body">
            {tm('arith.sub.col', { pos: c.position, a: c.a, b: c.b, br: c.borrowIn, d: c.diff, bo: c.borrowOut })}
          </AppText>
        ))}
      </View>
    );
  }

  if (s.kind === 'mul') {
    return (
      <View style={styles.stack}>
        <AppText variant="body">{t('arith.mul.intro')}</AppText>
        {s.partials.length === 0 ? (
          <AppText variant="body">{t('arith.mul.none')}</AppText>
        ) : (
          s.partials.map((p) => (
            <AppText key={p.shift} variant="body">
              {tm('arith.mul.row', { shift: p.shift, a: result.aBin, bin: p.binary, dec: p.decimal })}
            </AppText>
          ))
        )}
        <AppText variant="subheading">{tm('arith.mul.sum', { sum: s.sumBinary })}</AppText>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <AppText variant="body">{t('arith.div.intro')}</AppText>
      {s.rows.map((r, i) => (
        <AppText key={i} variant="body">
          {tm('arith.div.row', {
            bit: r.bit,
            partial: r.partial,
            fits: r.fits ? t('arith.div.fits') : t('arith.div.nofit'),
            rem: r.remainderAfter,
          })}
        </AppText>
      ))}
      <AppText variant="subheading">
        {tm('arith.verify', { a: result.aBin, b: result.bBin, q: result.quotient ?? '0', r: result.remainder ?? '0' })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: spacing.sm } });
