import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card } from '../../components/Card';
import { AppText } from '../../components/Text';
import { InputField } from '../../components/InputField';
import { Segmented } from '../../components/Segmented';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { ResultCard } from '../../components/ResultCard';
import { BitPlaceValueTable } from '../../components/BitTable';
import { ConversionSteps } from '../../components/Steps';
import { InfoMessage } from '../../components/Feedback';
import { useToast } from '../../components/Toast';
import { useI18n } from '../../hooks/useI18n';
import { usePrefs } from '../../hooks/usePrefs';
import { spacing } from '../../theme/spacing';
import {
  MAX_DIGITS, allRepresentations, getBitBreakdown, parseIntegerInput,
} from '../../core/number-systems/index.ts';
import type { Base, ParseResult } from '../../core/number-systems/index.ts';
import { addHistory } from '../../storage/history';
import { canonical, display } from '../../utils/format';
import { numberError } from '../messages';

const BASES: Base[] = [2, 10, 16];

interface Props {
  initialValue?: string;
  initialBase?: Base;
  /** Called after a successful conversion (used so Home can refresh its recent list). */
  onConverted?: () => void;
}

type Done = Extract<ParseResult, { ok: true }>;

export function ConverterPanel({ initialValue = '', initialBase, onConverted }: Props) {
  const { t } = useI18n();
  const { prefs } = usePrefs();
  const toast = useToast();
  const [base, setBase] = useState<Base>(initialBase ?? prefs.defaultBase);
  const [raw, setRaw] = useState(initialValue);
  const [attempted, setAttempted] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const parsed = useMemo(() => (raw.trim() === '' ? null : parseIntegerInput(raw, base)), [raw, base]);
  // Show an error as soon as the user has typed something invalid, or after pressing Convert on an empty field.
  const error = parsed && !parsed.ok ? numberError(parsed.error, t) : attempted && raw.trim() === '' ? t('err.empty') : null;

  const changeRaw = (v: string) => { setRaw(v); setDone(null); };
  const changeBase = (b: Base) => { setBase(b); setDone(null); };

  const submit = async () => {
    setAttempted(true);
    if (!parsed || !parsed.ok) return;
    setDone(parsed);
    const reps = allRepresentations(parsed.value);
    const ok = await addHistory('convert', { input: parsed.normalized, base, bin: reps[2], dec: reps[10], hex: reps[16] });
    if (!ok) toast.show(t('common.saveFailed'), 'error');
    else onConverted?.();
  };

  const reset = () => { setRaw(''); setDone(null); setAttempted(false); };

  const reps = done ? allRepresentations(done.value) : null;
  const opts = { group: prefs.groupBinary, upperHex: prefs.upperHex };
  const bitsLen = done ? (done.value < 0n ? -done.value : done.value).toString(2).length : 0;

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <AppText variant="label" color="secondary">{t('conv.from')}</AppText>
        <Segmented
          groupLabel={t('conv.from')}
          value={base}
          onChange={changeBase}
          options={BASES.map((b) => ({ value: b, label: `${t(`base.short.${b}`)} (${b})`, a11yLabel: t(`base.${b}`) }))}
        />
        <InputField
          label={t('conv.input')}
          value={raw}
          onChangeText={changeRaw}
          placeholder={t(`conv.placeholder.${base}`)}
          keyboardType={base === 16 ? 'default' : 'numeric'}
          autoCapitalize={base === 16 ? 'characters' : 'none'}
          error={error}
          helper={t('conv.rules', { max: MAX_DIGITS })}
          onSubmit={() => void submit()}
        />
        {parsed?.ok && parsed.normalized !== raw.trim() ? (
          <InfoMessage message={t('conv.interpreted', { value: `${'⁦'}${parsed.normalized}${'⁩'}` })} />
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <SecondaryButton label={t('common.clear')} onPress={reset} style={{ flex: 1 }} disabled={raw === '' && !done} />
          <PrimaryButton label={t('conv.convert')} onPress={() => void submit()} style={{ flex: 2 }} disabled={!!(parsed && !parsed.ok)} />
        </View>
      </Card>

      {done && reps ? (
        <View style={{ gap: spacing.md }}>
          <AppText variant="heading" accessibilityRole="header">{t('conv.results')}</AppText>
          {done.negative ? <InfoMessage tone="warning" message={t('conv.negativeNote')} /> : null}
          {BASES.map((b) => (
            <ResultCard
              key={b}
              animate
              label={t(`base.${b}`)}
              value={display(reps[b], b, opts)}
              copyValue={canonical(reps[b], b, prefs.upperHex)}
            />
          ))}

          <Card>
            <AppText variant="heading">{t('conv.bits')}</AppText>
            {done.value < 0n ? (
              <InfoMessage message={t('conv.bitsUnavailable')} />
            ) : bitsLen > 64 ? (
              <InfoMessage message={t('conv.bitsLong')} />
            ) : (
              <>
                <BitPlaceValueTable bits={getBitBreakdown(done.value).bits} />
                <InfoMessage message={t('conv.bitsNote', { width: getBitBreakdown(done.value).width })} />
              </>
            )}
          </Card>

          <Card>
            <AppText variant="heading">{t('conv.stepsTitle')}</AppText>
            <ConversionSteps value={done.value} from={base} normalized={done.normalized} />
          </Card>
        </View>
      ) : null}
    </View>
  );
}
