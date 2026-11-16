import React, { useState } from 'react';
import { View } from 'react-native';
import { Segmented } from '../../components/Segmented';
import { spacing } from '../../theme/spacing';
import { useI18n } from '../../hooks/useI18n';
import { IPv4Panel } from './IPv4Panel';
import { IPv6Panel } from './IPv6Panel';

interface Props {
  incoming?: { ip: string; nonce: number } | null;
}

type IPVersion = 'ipv4' | 'ipv6';

export function IPAnalyzerPanel({ incoming }: Props) {
  const { t } = useI18n();
  const [version, setVersion] = useState<IPVersion>('ipv4');
  return (
    <View style={{ gap: spacing.md }}>
      <Segmented
        groupLabel={t('ipv4.title')}
        value={version}
        onChange={setVersion}
        options={[
          { value: 'ipv4', label: t('ip.mode.ipv4') },
          { value: 'ipv6', label: t('ip.mode.ipv6') },
        ]}
      />
      {version === 'ipv4' ? <IPv4Panel incoming={incoming} /> : <IPv6Panel />}
    </View>
  );
}
