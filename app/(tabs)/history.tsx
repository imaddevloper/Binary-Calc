import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/AppHeader';
import { Segmented } from '../../src/components/Segmented';
import { SecondaryButton } from '../../src/components/Buttons';
import { ConfirmationDialog, EmptyState, ErrorMessage, InfoMessage, LoadingIndicator } from '../../src/components/Feedback';
import { useToast } from '../../src/components/Toast';
import { HistoryItem } from '../../src/features/history/HistoryItem';
import { HistoryDetail } from '../../src/features/history/HistoryDetail';
import { useI18n } from '../../src/hooks/useI18n';
import { useTheme } from '../../src/theme/ThemeProvider';
import { spacing } from '../../src/theme/spacing';
import { clearHistory, deleteHistory, listHistory } from '../../src/storage/history';
import type { HistoryEntry, HistoryKind } from '../../src/storage/history';

type Filter = 'all' | HistoryKind;

export default function HistoryScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { open } = useLocalSearchParams<{ open?: string }>();

  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [detail, setDetail] = useState<HistoryEntry | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmOne, setConfirmOne] = useState<HistoryEntry | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listHistory());
      setFailed(false);
    } catch {
      setItems([]);
      setFailed(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Opened from the Home "recent activity" list.
  useEffect(() => {
    if (open && items) {
      const found = items.find((e) => String(e.id) === open);
      if (found) setDetail(found);
      router.setParams({ open: undefined });
    }
  }, [open, items, router]);

  const shown = useMemo(() => (items ?? []).filter((e) => filter === 'all' || e.kind === filter), [items, filter]);

  const removeOne = async (e: HistoryEntry) => {
    await deleteHistory(e.id).catch(() => {});
    setConfirmOne(null);
    setDetail(null);
    void load();
  };

  const removeAll = async () => {
    await clearHistory().catch(() => {});
    setConfirmAll(false);
    toast.show(t('set.historyCleared'));
    void load();
  };

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <Segmented
        groupLabel={t('hist.title')}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('hist.f.all') },
          { value: 'convert', label: t('hist.f.convert') },
          { value: 'arith', label: t('hist.f.arith') },
          { value: 'ipv4', label: t('hist.f.ipv4') },
        ]}
      />
      <InfoMessage message={t('hist.privacy')} />
      <ErrorMessage message={failed ? t('hist.loadFailed') : null} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader tools title={t('hist.title')} />
      {items === null ? (
        <LoadingIndicator />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 100, gap: spacing.md }}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <HistoryItem entry={item} onOpen={() => setDetail(item)} onDelete={() => setConfirmOne(item)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="time"
              title={t('hist.empty')}
              description={t('hist.emptyDesc')}
              actionLabel={t('hist.goCalc')}
              onAction={() => router.navigate('/calculator')}
            />
          }
          ListFooterComponent={
            (items?.length ?? 0) > 0 ? (
              <View style={{ paddingTop: spacing.md }}>
                <SecondaryButton icon="trash" label={t('hist.clearAll')} onPress={() => setConfirmAll(true)} />
              </View>
            ) : undefined
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      <HistoryDetail entry={detail} onClose={() => setDetail(null)} onDelete={(id) => setConfirmOne(items?.find((e) => e.id === id) ?? null)} />
      <ConfirmationDialog
        visible={confirmOne !== null}
        title={t('hist.delete')}
        body={t('hist.deleteBody')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setConfirmOne(null)}
        onConfirm={() => confirmOne && void removeOne(confirmOne)}
      />
      <ConfirmationDialog
        visible={confirmAll}
        title={t('hist.clearTitle')}
        body={t('hist.clearBody')}
        confirmLabel={t('hist.clearAll')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setConfirmAll(false)}
        onConfirm={() => void removeAll()}
      />
    </View>
  );
}
