import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { AppText, Mono } from './Text';
import { IconButton } from './Buttons';
import { BitPlaceValueTable } from './BitTable';
import { Collapsible } from './Steps';
import { InfoMessage } from './Feedback';
import { spacing } from '../theme/spacing';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../hooks/useI18n';
import { useCopy } from '../hooks/useCopy';
import { getBitBreakdown, decimalToBinarySteps } from '../core/number-systems/index.ts';
import type { AddressCategory, ClassfulInfo, Classification } from '../core/ipv4/index.ts';
import type { TKey } from '../i18n';

function CopyRow({ label, value }: { label: string; value: string }) {
  const copy = useCopy();
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <View style={styles.copyRow}>
      <View style={styles.flex}>
        <AppText variant="caption" color="secondary">{label}</AppText>
        <Mono large selectable accessibilityLabel={`${label}: ${value}`}>{value}</Mono>
      </View>
      <IconButton icon="copy" size={20} color={colors.accent} label={t('a11y.copy', { label })} onPress={() => void copy(value)} />
    </View>
  );
}

export { CopyRow };

/** One octet: decimal, exactly 8 bits, place-value table and the conversion steps. */
export function OctetCard({ index, decimal, binary }: { index: number; decimal: number; binary: string }) {
  const { t, tm } = useI18n();
  const steps = decimalToBinarySteps(BigInt(decimal));
  return (
    <Card animate>
      <AppText variant="subheading">{t('ipv4.octet', { n: index })}</AppText>
      <CopyRow label={t('ipv4.decimal')} value={String(decimal)} />
      <CopyRow label={t('ipv4.binary8')} value={binary} />
      <BitPlaceValueTable bits={getBitBreakdown(BigInt(decimal), 8).bits} />
      <Collapsible title={t('ipv4.stepsFor', { n: index })}>
        <AppText variant="body">{tm('step.divRepeat', { base: 2 })}</AppText>
        {steps.rows.map((r, i) => (
          <AppText key={i} variant="body">
            {tm('step.divRow', { dividend: r.dividend.toString(), divisor: r.divisor, quotient: r.quotient.toString(), remainder: r.remainder })}
          </AppText>
        ))}
        <AppText variant="body">{t('step.readUp')}</AppText>
        <Mono color="accent">{steps.result}</Mono>
        <AppText variant="body">{t('step.placeValues')}</AppText>
        <Mono>{steps.expression}</Mono>
      </Collapsible>
    </Card>
  );
}

const CAT_TONE: Record<AddressCategory, 'accent' | 'default'> = {
  unspecified: 'default', this_network: 'default', private_use: 'accent', shared_address_space: 'default',
  loopback: 'accent', link_local: 'accent', ietf_protocol: 'default', documentation: 'default',
  deprecated_6to4: 'default', benchmarking: 'default', multicast: 'accent', reserved_future: 'default',
  limited_broadcast: 'accent', general: 'default',
};

/** Address category with careful wording, plus the (clearly historical) class label. */
export function IPv4ClassificationCard({ classification, classful, firstOctet }: { classification: Classification; classful: ClassfulInfo; firstOctet: number }) {
  const { t, tm } = useI18n();
  const cat = classification.category;
  return (
    <>
      <Card tone={CAT_TONE[cat]} animate>
        <AppText variant="label" color="secondary">{t('ipv4.category')}</AppText>
        <AppText variant="heading">{t(`cat.${cat}` as TKey)}</AppText>
        <AppText variant="body">{t(`cat.${cat}.d` as TKey)}</AppText>
        {classification.cidr ? (
          <View style={styles.meta}>
            <AppText variant="caption" color="secondary">{tm('ipv4.rangeLabel') + ':'}</AppText>
            <Mono>{classification.cidr}</Mono>
            {classification.reference ? (
              <>
                <AppText variant="caption" color="secondary">{t('ipv4.refLabel') + ':'}</AppText>
                <Mono>{classification.reference}</Mono>
              </>
            ) : null}
          </View>
        ) : (
          <AppText variant="caption" color="secondary">{t('ipv4.noRange')}</AppText>
        )}
        <InfoMessage message={t('ipv4.reachNote')} />
      </Card>
      <Card animate>
        <AppText variant="label" color="secondary">{t('ipv4.classfulTitle')}</AppText>
        <AppText variant="subheading">{tm('ipv4.classfulLabel', { label: classful.label, first: firstOctet })}</AppText>
        <AppText variant="body">{t(`ipv4.class.${classful.label}` as TKey)}</AppText>
        {classful.caveat ? <InfoMessage tone="warning" message={tm('ipv4.classfulCaveat', { first: firstOctet })} /> : null}
        <InfoMessage message={t('ipv4.classfulNote')} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
});
