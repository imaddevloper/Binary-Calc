import React, { useState } from 'react';
import { View } from 'react-native';
import { Card } from '../../components/Card';
import { AppText } from '../../components/Text';
import { InputField } from '../../components/InputField';
import { Segmented } from '../../components/Segmented';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { ResultCard } from '../../components/ResultCard';
import { ArithSteps } from '../../components/ArithSteps';
import { ErrorMessage, InfoMessage } from '../../components/Feedback';
import { useToast } from '../../components/Toast';
import { useI18n } from '../../hooks/useI18n';
import { usePrefs } from '../../hooks/usePrefs';
import { spacing } from '../../theme/spacing';
import { binaryArithmetic } from '../../core/arithmetic/index.ts';
import type { ArithResult, BinaryOp } from '../../core/arithmetic/index.ts';
import { addHistory } from '../../storage/history';
import { display } from '../../utils/format';
import { numberError } from '../messages';
import type { TKey } from '../../i18n';

const OPS: BinaryOp[] = ['add', 'sub', 'mul', 'div'];

interface Props {
  initialA?: string;
  initialB?: string;
  initialOp?: BinaryOp;
  onCalculated?: () => void;
}

export function ArithPanel({ initialA = '', initialB = '', initialOp = 'add', onCalculated }: Props) {
  const { t, tm } = useI18n();
  const { prefs } = usePrefs();
  const toast = useToast();
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [op, setOp] = useState<BinaryOp>(initialOp);
  const [error, setError] = useState<{ a?: string; b?: string; general?: string }>({});
  const [result, setResult] = useState<ArithResult | null>(null);

  const clearResult = () => { setResult(null); setError({}); };

  const calculate = async () => {
    setResult(null);
    if (a.trim() === '' || b.trim() === '') {
      setError({ general: t('arith.enterBoth') });
      return;
    }
    const out = binaryArithmetic(a, b, op);
    if (!out.ok) {
      const msg = numberError(out.error, t);
      if (out.error === 'division_by_zero') setError({ b: msg });
      else if (out.operand === 'a') setError({ a: msg });
      else setError({ b: msg });
      return;
    }
    setError({});
    setResult(out.result);
    const r = out.result;
    const ok = await addHistory('arith', {
      a: r.aBin, b: r.bBin, op: r.op, binary: r.binary, decimal: r.decimal, quotient: r.quotient, remainder: r.remainder,
    });
    if (!ok) toast.show(t('common.saveFailed'), 'error');
    else onCalculated?.();
  };

  const reset = () => { setA(''); setB(''); setResult(null); setError({}); };
  const opts = { group: prefs.groupBinary, upperHex: prefs.upperHex };

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <InfoMessage message={t('arith.model')} />
        <InputField
          label={t('arith.first')}
          value={a}
          onChangeText={(v) => { setA(v); clearResult(); }}
          placeholder={t('arith.placeholder')}
          keyboardType="numeric"
          error={error.a}
        />
        <View style={{ gap: spacing.xs }}>
          <AppText variant="label" color="secondary">{t('arith.op')}</AppText>
          <Segmented
            groupLabel={t('arith.op')}
            value={op}
            onChange={(o) => { setOp(o); clearResult(); }}
            options={OPS.map((o) => ({ value: o, label: `${t(`op.${o}.sym` as TKey)}  ${t(`op.${o}` as TKey)}`, a11yLabel: t(`op.${o}` as TKey) }))}
          />
        </View>
        <InputField
          label={t('arith.second')}
          value={b}
          onChangeText={(v) => { setB(v); clearResult(); }}
          placeholder={t('arith.placeholder')}
          keyboardType="numeric"
          error={error.b}
          onSubmit={() => void calculate()}
        />
        <ErrorMessage message={error.general} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <SecondaryButton label={t('common.clear')} onPress={reset} style={{ flex: 1 }} disabled={a === '' && b === '' && !result} />
          <PrimaryButton label={t('arith.calculate')} onPress={() => void calculate()} style={{ flex: 2 }} />
        </View>
      </Card>

      {result ? (
        <View style={{ gap: spacing.md }}>
          <AppText variant="heading" accessibilityRole="header">{t('arith.result')}</AppText>
          {result.negative ? <InfoMessage tone="warning" message={t('arith.negativeNote')} /> : null}
          <ResultCard
            animate
            label={result.op === 'div' ? t('arith.quotient') : t('arith.binary')}
            value={display(result.op === 'div' ? (result.quotient ?? '0') : result.binary, 2, opts)}
            copyValue={result.op === 'div' ? (result.quotient ?? '0') : result.binary}
          />
          {result.op === 'div' ? (
            <ResultCard animate label={t('arith.remainder')} value={display(result.remainder ?? '0', 2, opts)} copyValue={result.remainder ?? '0'} />
          ) : null}
          <ResultCard
            animate
            label={t('arith.decimal')}
            value={result.decimal}
            footer={result.op === 'div' ? (
              <AppText variant="caption" color="secondary">{tm('arith.verify', { a: result.aBin, b: result.bBin, q: result.quotient ?? '0', r: result.remainder ?? '0' })}</AppText>
            ) : undefined}
          />
          <Card>
            <AppText variant="heading">{t('arith.stepsTitle')}</AppText>
            <ArithSteps result={result} />
          </Card>
        </View>
      ) : null}
    </View>
  );
}
