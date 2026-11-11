import React from 'react';
import { Screen } from '../src/components/Screen';
import { AppHeader } from '../src/components/AppHeader';
import { Card } from '../src/components/Card';
import { AppText } from '../src/components/Text';
import { Collapsible } from '../src/components/Steps';
import { useI18n } from '../src/hooks/useI18n';
import type { TKey } from '../src/i18n';

const TOPICS = ['bases', 'binary', 'hex', 'ipv4', 'octet', 'why8', 'ocr', 'perm', 'offline'] as const;

export default function HelpScreen() {
  const { t } = useI18n();
  return (
    <Screen header={<AppHeader back title={t('help.title')} />}>
      <Card>
        {TOPICS.map((k, i) => (
          <Collapsible key={k} title={t(`help.${k}.t` as TKey)} initiallyOpen={i === 0} plain>
            <AppText variant="body">{t(`help.${k}.b` as TKey)}</AppText>
          </Collapsible>
        ))}
      </Card>
    </Screen>
  );
}
