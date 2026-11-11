import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppHeader } from '../../src/components/AppHeader';
import { Screen } from '../../src/components/Screen';
import { IPv4Panel } from '../../src/features/ipv4/IPv4Panel';
import { takePendingIp } from '../../src/features/ipv4/pendingIp';
import { useI18n } from '../../src/hooks/useI18n';

export default function IPv4Screen() {
  const { t } = useI18n();
  const router = useRouter();
  const [incoming, setIncoming] = useState<{ ip: string; nonce: number } | null>(null);

  // An address handed over by the scanner or History is analyzed once when this tab gets focus.
  useFocusEffect(useCallback(() => {
    const ip = takePendingIp();
    if (ip) setIncoming({ ip, nonce: Date.now() });
  }, []));

  return (
    <Screen bottomInset={72} header={<AppHeader tools title={t('ipv4.title')} onHelp={() => router.push('/help')} />}>
      <IPv4Panel incoming={incoming} />
    </Screen>
  );
}
