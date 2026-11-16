import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Card } from '../../components/Card';
import { AppText, Mono } from '../../components/Text';
import { InputField } from '../../components/InputField';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { ResultCard } from '../../components/ResultCard';
import { InfoMessage } from '../../components/Feedback';
import { useToast } from '../../components/Toast';
import { useI18n } from '../../hooks/useI18n';
import { spacing } from '../../theme/spacing';
import { analyzeIPv6, parseIPv6 } from '../../core/ipv6/index.ts';
import type { IPv6Analysis, IPv6ErrorCode } from '../../core/ipv6/index.ts';
import type { TKey } from '../../i18n';

function ipv6Error(code: IPv6ErrorCode, t: (key: TKey) => string): string {
  switch (code) {
    case 'empty': return t('ipv6.err.empty');
    case 'invalid_char': return t('ipv6.err.invalid_char');
    case 'multiple_compression': return t('ipv6.err.multiple_compression');
    case 'wrong_group_count': return t('ipv6.err.wrong_group_count');
    case 'invalid_group': return t('ipv6.err.invalid_group');
    case 'invalid_ipv4_tail': return t('ipv6.err.invalid_ipv4_tail');
    default: return t('ipv6.err.generic');
  }
}

export function IPv6Panel({ incoming }: { incoming?: { ip: string; nonce: number } | null }) {
  const { t } = useI18n();
  const toast = useToast();
  const [raw, setRaw] = useState('');
  const [analysis, setAnalysis] = useState<IPv6Analysis | null>(null);
  const [attempted, setAttempted] = useState(false);
  useEffect(() => {
    if (!incoming) return;
    setRaw(incoming.ip);
    setAttempted(true);
    const result = analyzeIPv6(incoming.ip);
    setAnalysis(result.ok ? result.analysis : null);
  }, [incoming?.nonce]);
  const live = raw.trim() === '' ? null : parseIPv6(raw);
  const error = live && !live.ok
    ? ipv6Error(live.error, t)
    : attempted && raw.trim() === '' ? t('ipv6.err.empty') : null;

  const run = () => {
    setAttempted(true);
    const result = analyzeIPv6(raw);
    if (!result.ok) { setAnalysis(null); return; }
    setAnalysis(result.analysis);
  };

  const paste = async () => {
    try {
      const value = (await Clipboard.getStringAsync()).trim();
      if (!value) toast.show(t('common.clipboardEmpty'), 'error');
      else { setRaw(value); setAnalysis(null); }
    } catch {
      toast.show(t('common.clipboardFailed'), 'error');
    }
  };

  const clear = () => { setRaw(''); setAnalysis(null); setAttempted(false); };

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <InputField
          label={t('ipv6.input')}
          value={raw}
          onChangeText={(value) => { setRaw(value); setAnalysis(null); }}
          placeholder={t('ipv6.placeholder')}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          error={error}
          onSubmit={run}
          onPaste={() => void paste()}
        />
        {live?.ok ? <InfoMessage tone="success" message={t('ipv6.valid')} /> : null}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <SecondaryButton label={t('common.clear')} onPress={clear} style={{ flex: 1 }} disabled={raw === '' && !analysis} />
          <PrimaryButton label={t('ipv6.analyze')} onPress={run} style={{ flex: 2 }} disabled={!!(live && !live.ok)} />
        </View>
      </Card>
      {analysis ? (
        <View style={{ gap: spacing.md }}>
          <ResultCard animate label={t('ipv6.original')} value={analysis.normalized} />
          <ResultCard animate label={t('ipv6.binary')} value={analysis.binary} />
          <ResultCard animate label={t('ipv6.octal')} value={analysis.octal} />
          <ResultCard animate label={t('ipv6.decimal')} value={analysis.decimal} />
          <ResultCard animate label={t('ipv6.hexadecimal')} value={analysis.hexadecimal} />
          <Card>
            <AppText variant="heading">{t('ipv6.groups')}</AppText>
            {analysis.groups.map((group, index) => (
              <Mono key={index}>{`${index + 1}. ${group}`}</Mono>
            ))}
          </Card>
          <SecondaryButton icon="refresh" label={t('ipv4.another')} onPress={clear} />
        </View>
      ) : null}
    </View>
  );
}
