import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Card } from '../../components/Card';
import { AppText } from '../../components/Text';
import { InputField } from '../../components/InputField';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { ResultCard } from '../../components/ResultCard';
import { InfoMessage } from '../../components/Feedback';
import { OctetCard, IPv4ClassificationCard } from '../../components/IPv4Parts';
import { useToast } from '../../components/Toast';
import { useI18n } from '../../hooks/useI18n';
import { spacing } from '../../theme/spacing';
import { analyzeIPv4, parseIPv4 } from '../../core/ipv4/index.ts';
import type { IPv4Analysis } from '../../core/ipv4/index.ts';
import { addHistory } from '../../storage/history';
import { ipv4Error } from '../messages';

interface Props {
  /** An address to load and analyze (from the scanner or history). `nonce` makes repeated values re-trigger. */
  incoming?: { ip: string; nonce: number } | null;
  onAnalyzed?: () => void;
}

export function IPv4Panel({ incoming, onAnalyzed }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [raw, setRaw] = useState('');
  const [analysis, setAnalysis] = useState<IPv4Analysis | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [seenIncomingNonce, setSeenIncomingNonce] = useState<number | undefined>(undefined);

  // Adjust local input during render when a new external address arrives.
  if (incoming && incoming.nonce !== seenIncomingNonce) {
    setSeenIncomingNonce(incoming.nonce);
    setRaw(incoming.ip);
  }

  const live = useMemo(() => (raw.trim() === '' ? null : parseIPv4(raw)), [raw]);
  const error = live && !live.ok
    ? ipv4Error(live.error, live.octetIndex, t)
    : attempted && raw.trim() === '' ? t('ipv4.err.empty') : null;

  const run = useCallback(async (value: string) => {
    setAttempted(true);
    const out = analyzeIPv4(value);
    if (!out.ok) { setAnalysis(null); return; }
    setAnalysis(out.analysis);
    const a = out.analysis;
    const saved = await addHistory('ipv4', { ip: a.normalized, binary32: a.binary32, hex: a.hex, category: a.classification.category });
    if (!saved) toast.show(t('common.saveFailed'), 'error');
    else onAnalyzed?.();
  }, [onAnalyzed, t, toast]);

  // Addresses coming from the scanner / history arrive already validated, but are re-validated here anyway.
  useEffect(() => {
    if (incoming) void run(incoming.ip);
    // The nonce intentionally identifies a new incoming scan/history result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.nonce]);

  const paste = async () => {
    try {
      const text = (await Clipboard.getStringAsync()).trim();
      if (text === '') toast.show(t('common.clipboardEmpty'), 'error');
      else { setRaw(text); setAnalysis(null); }
    } catch {
      toast.show(t('common.clipboardFailed'), 'error');
    }
  };

  const another = () => { setRaw(''); setAnalysis(null); setAttempted(false); };

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <InputField
          label={t('ipv4.input')}
          value={raw}
          onChangeText={(v) => { setRaw(v); setAnalysis(null); }}
          placeholder={t('ipv4.placeholder')}
          keyboardType="numbers-and-punctuation"
          error={error}
          onSubmit={() => void run(raw)}
          onPaste={() => void paste()}
        />
        {live?.ok ? <InfoMessage tone="success" message={t('ipv4.valid')} /> : null}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <SecondaryButton label={t('common.clear')} onPress={another} style={{ flex: 1 }} disabled={raw === '' && !analysis} />
          <PrimaryButton label={t('ipv4.analyze')} onPress={() => void run(raw)} style={{ flex: 2 }} disabled={!!(live && !live.ok)} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <SecondaryButton icon="camera" label={t('ipv4.scan')} onPress={() => router.push('/scanner')} style={{ flex: 1 }} />
          <SecondaryButton icon="image" label={t('ipv4.import')} onPress={() => router.push({ pathname: '/scanner', params: { source: 'gallery' } })} style={{ flex: 1 }} />
        </View>
      </Card>

      {analysis ? (
        <View style={{ gap: spacing.md }}>
          <ResultCard animate label={t('ipv4.original')} value={analysis.normalized} />
          <AppText variant="heading" accessibilityRole="header">{t('ipv4.octets')}</AppText>
          {analysis.octetInfo.map((o) => (
            <OctetCard key={o.index} index={o.index + 1} decimal={o.decimal} binary={o.binary} />
          ))}
          <ResultCard animate label={t('ipv4.combined')} value={analysis.binary32} />
          <ResultCard animate label={t('ipv4.hex32')} value={analysis.hex} />
          <ResultCard animate label={t('ipv4.uint32')} value={String(analysis.uint32)} />
          <IPv4ClassificationCard classification={analysis.classification} classful={analysis.classful} firstOctet={analysis.octets[0]} />
          <SecondaryButton icon="refresh" label={t('ipv4.another')} onPress={another} />
        </View>
      ) : null}
    </View>
  );
}
