import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { AppText, Mono } from '../../components/Text';
import { Icon } from '../../components/Icon';
import { InputField } from '../../components/InputField';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { ConversionSteps } from '../../components/Steps';
import { InfoMessage, ErrorMessage } from '../../components/Feedback';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../hooks/useI18n';
import { radius, spacing, TOUCH } from '../../theme/spacing';
import { checkAnswer } from '../../core/challenges/index.ts';
import type { Challenge } from '../../core/challenges/index.ts';
import { parseIPv4 } from '../../core/ipv4/index.ts';
import type { Base } from '../../core/number-systems/index.ts';
import { ipv4Error } from '../messages';
import type { TKey } from '../../i18n';

export type AnswerMode = 'choice' | 'typed';

interface Props {
  challenge: Challenge;
  mode: AnswerMode;
  /** Called once per question, on the first well-formed answer (retries don't count again). */
  onAnswered?: (correct: boolean) => void;
  onNext?: () => void;
  nextLabel?: string;
}

function sourceFor(type: Challenge['type']): Base | null {
  switch (type) {
    case 'dec2bin': case 'dec2hex': case 'octet2bin': return 10;
    case 'bin2dec': case 'bin2hex': return 2;
    case 'hex2dec': return 16;
    case 'cidrHostBits': case 'maskPrefix': case 'networkOctet': case 'broadcastOctet': return null;
    default: return null;
  }
}

/** Question card shared by Challenges and lesson "Try it". Answers are always checked by core logic. */
export function ChallengeQuestion({ challenge, mode, onAnswered, onNext, nextLabel }: Props) {
  const { colors } = useTheme();
  const { t, tm } = useI18n();
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'correct' | 'wrong' | null>(null);
  const [formatError, setFormatError] = useState(false);
  const [hint, setHint] = useState(false);
  const counted = useRef(false);

  const yesNo = challenge.answerBase === null;
  const effectiveMode: AnswerMode = yesNo ? 'choice' : mode;

  const submit = (value: string) => {
    const res = checkAnswer(challenge, value);
    if (res.status === 'invalid_format') { setFormatError(true); return; }
    setFormatError(false);
    setOutcome(res.status);
    if (!counted.current) {
      counted.current = true;
      onAnswered?.(res.status === 'correct');
    }
  };

  const retry = () => { setOutcome(null); setPicked(null); setTyped(''); setFormatError(false); };

  const choose = (value: string) => {
    if (outcome) return;
    setPicked(value);
    submit(value);
  };

  const options: { value: string; label: string }[] = yesNo
    ? challenge.type === 'privateIp'
      ? [{ value: 'yes', label: t('chal.yes') }, { value: 'no', label: t('chal.no') }]
      : [{ value: 'valid', label: t('chal.valid') }, { value: 'invalid', label: t('chal.invalid') }]
    : challenge.choices.map((c) => ({ value: c, label: c }));

  const answerLabel = yesNo
    ? challenge.type === 'privateIp'
      ? t(challenge.answer === 'yes' ? 'chal.yes' : 'chal.no')
      : t(challenge.answer === 'valid' ? 'chal.valid' : 'chal.invalid')
    : challenge.answer;
  const src = sourceFor(challenge.type);

  const explanation = (() => {
    if (yesNo) {
      if (challenge.type === 'privateIp') return <AppText variant="body">{t('chal.explain.privateIp')}</AppText>;
      const p = parseIPv4(challenge.prompt);
      return p.ok ? <AppText variant="body">{t('ipv4.valid')}</AppText> : <AppText variant="body">{ipv4Error(p.error, p.octetIndex, t)}</AppText>;
    }
    if (challenge.type === 'cidrHostBits') return <AppText variant="body">{tm('chal.explain.cidrHostBits', { v: challenge.prompt, a: challenge.answer })}</AppText>;
    if (challenge.type === 'maskPrefix') return <AppText variant="body">{tm('chal.explain.maskPrefix', { v: challenge.prompt, a: challenge.answer })}</AppText>;
    if (challenge.type === 'networkOctet') return <AppText variant="body">{tm('chal.explain.networkOctet', { v: challenge.prompt, a: challenge.answer })}</AppText>;
    if (challenge.type === 'broadcastOctet') return <AppText variant="body">{tm('chal.explain.broadcastOctet', { v: challenge.prompt, a: challenge.answer })}</AppText>;
    if (src === null) return null;
    const normalized = challenge.prompt.replace(/^0x/i, '');
    let conversionValue: bigint | null = null;
    try {
      conversionValue = BigInt(src === 10 ? normalized : src === 2 ? `0b${normalized}` : `0x${normalized}`);
    } catch {
      conversionValue = null;
    }
    return conversionValue === null
      ? null
      : <ConversionSteps value={conversionValue} from={src} normalized={normalized} />;
  })();

  return (
    <Card animate>
      <AppText variant="subheading" accessibilityRole="header">
        {tm(`chal.q.${challenge.type}` as TKey, { v: challenge.prompt })}
      </AppText>
      {challenge.type === 'octet2bin' ? <InfoMessage message={t('chal.octetFormat')} /> : null}

      {effectiveMode === 'choice' ? (
        <View style={{ gap: spacing.sm }}>
          {options.map((o) => {
            const isAnswer = outcome !== null && o.value === (yesNo ? challenge.answer : challenge.answer);
            const isWrongPick = outcome === 'wrong' && picked === o.value;
            return (
              <Pressable
                key={o.value}
                disabled={outcome !== null}
                onPress={() => choose(o.value)}
                accessibilityRole="button"
                accessibilityLabel={o.label}
                accessibilityState={{ selected: picked === o.value, disabled: outcome !== null }}
                style={[
                  styles.choice,
                  {
                    borderColor: isAnswer ? colors.success : isWrongPick ? colors.error : colors.border,
                    backgroundColor: isAnswer ? colors.accentSoft : colors.background,
                    borderWidth: isAnswer || isWrongPick ? 2 : 1,
                  },
                ]}
              >
                {yesNo ? <AppText variant="subheading" style={{ flex: 1 }}>{o.label}</AppText> : <Mono style={{ flex: 1 }}>{o.label}</Mono>}
                {isAnswer ? <Icon name="checkmark-circle" size={22} color={colors.success} /> : null}
                {isWrongPick ? <Icon name="alert-circle" size={22} color={colors.error} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <InputField
            label={t('chal.placeholder')}
            value={typed}
            onChangeText={(v) => { setTyped(v); setFormatError(false); }}
            placeholder={t('chal.placeholder')}
            keyboardType={challenge.answerBase === 16 ? 'default' : 'numeric'}
            autoCapitalize={challenge.answerBase === 16 ? 'characters' : 'none'}
            error={formatError ? t('chal.invalidFormat') : null}
            onSubmit={() => !outcome && typed.trim() !== '' && submit(typed)}
          />
          {!outcome ? <PrimaryButton label={t('chal.submit')} onPress={() => submit(typed)} disabled={typed.trim() === ''} /> : null}
        </View>
      )}
      <ErrorMessage message={formatError && effectiveMode === 'choice' ? t('chal.invalidFormat') : null} />

      {!outcome ? (
        <View style={{ gap: spacing.sm }}>
          <SecondaryButton icon="bulb" label={t('chal.hint')} onPress={() => setHint((h) => !h)} />
          {hint ? <InfoMessage message={t(`chal.hint.${challenge.type}` as TKey)} /> : null}
        </View>
      ) : (
        <View style={{ gap: spacing.md }} accessibilityLiveRegion="polite">
          <View style={styles.verdict}>
            <Icon name={outcome === 'correct' ? 'checkmark-circle' : 'alert-circle'} size={24} color={outcome === 'correct' ? colors.success : colors.error} />
            <AppText variant="subheading" color={outcome === 'correct' ? 'success' : 'error'}>
              {outcome === 'correct' ? t('chal.correct') : t('chal.incorrect')}
            </AppText>
          </View>
          <AppText variant="body">{tm('chal.answerIs', { a: answerLabel })}</AppText>
          <AppText variant="label" color="secondary">{t('chal.explain')}</AppText>
          {explanation}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {outcome === 'wrong' ? <SecondaryButton icon="repeat" label={t('chal.retry')} onPress={retry} style={{ flex: 1 }} /> : null}
            {onNext ? <PrimaryButton label={nextLabel ?? t('chal.next')} onPress={onNext} style={{ flex: 1 }} /> : null}
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  choice: { minHeight: TOUCH, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
