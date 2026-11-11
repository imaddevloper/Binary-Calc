import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/Text';
import { CopyRow } from '../../components/IPv4Parts';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { useTheme } from '../../theme/ThemeProvider';
import { DirectionView, useI18n } from '../../hooks/useI18n';
import { radius, spacing } from '../../theme/spacing';
import type { HistoryEntry } from '../../storage/history';
import { formatTime, historyTitle } from './describe';
import { setPendingIp } from '../ipv4/pendingIp';
import type { TKey } from '../../i18n';

interface Props {
  entry: HistoryEntry | null;
  onClose: () => void;
  onDelete: (id: number) => void;
}

/** Details of one saved result, with copy buttons and a shortcut back into the right tool. */
export function HistoryDetail({ entry, onClose, onDelete }: Props) {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const reopen = () => {
    if (!entry) return;
    onClose();
    if (entry.kind === 'convert') {
      router.push({ pathname: '/calculator', params: { mode: 'convert', base: String(entry.payload.base), value: entry.payload.input } });
    } else if (entry.kind === 'arith') {
      router.push({ pathname: '/calculator', params: { mode: 'arith', a: entry.payload.a, b: entry.payload.b, op: entry.payload.op } });
    } else {
      setPendingIp(entry.payload.ip);
      router.push('/ipv4');
    }
  };

  return (
    <Modal visible={!!entry} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <DirectionView>
        <Pressable accessibilityLabel={t('common.close')} onPress={onClose} style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          {entry ? (
            <Pressable
              accessibilityViewIsModal
              onPress={() => {}}
              style={[styles.sheet, { backgroundColor: colors.elevated, borderColor: colors.border, paddingBottom: insets.bottom + spacing.lg }]}
            >
              <ScrollView contentContainerStyle={{ gap: spacing.md }}>
                <AppText variant="heading" accessibilityRole="header">{t('hist.detail')}</AppText>
                <AppText variant="caption" color="secondary">{`${t(`hist.type.${entry.kind}` as TKey)} · ${formatTime(entry.createdAt, lang)}`}</AppText>
                <CopyRow label={t('hist.input')} value={historyTitle(entry, t)} />
                {entry.kind === 'convert' ? (
                  <>
                    <CopyRow label={t('base.2')} value={entry.payload.bin} />
                    <CopyRow label={t('base.10')} value={entry.payload.dec} />
                    <CopyRow label={t('base.16')} value={entry.payload.hex} />
                  </>
                ) : null}
                {entry.kind === 'arith' ? (
                  <>
                    <CopyRow label={entry.payload.op === 'div' ? t('arith.quotient') : t('arith.binary')} value={entry.payload.op === 'div' ? (entry.payload.quotient ?? '0') : entry.payload.binary} />
                    {entry.payload.op === 'div' ? <CopyRow label={t('arith.remainder')} value={entry.payload.remainder ?? '0'} /> : null}
                    <CopyRow label={t('arith.decimal')} value={entry.payload.decimal} />
                  </>
                ) : null}
                {entry.kind === 'ipv4' ? (
                  <>
                    <CopyRow label={t('ipv4.combined')} value={entry.payload.binary32} />
                    <CopyRow label={t('ipv4.hex32')} value={entry.payload.hex} />
                    <AppText variant="body">{t(`cat.${entry.payload.category}` as TKey)}</AppText>
                  </>
                ) : null}
              </ScrollView>
              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                <PrimaryButton label={t('hist.reopen')} onPress={reopen} />
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <SecondaryButton icon="trash" label={t('common.delete')} onPress={() => onDelete(entry.id)} style={{ flex: 1 }} />
                  <SecondaryButton label={t('common.close')} onPress={onClose} style={{ flex: 1 }} />
                </View>
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </DirectionView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, padding: spacing.xl },
});
