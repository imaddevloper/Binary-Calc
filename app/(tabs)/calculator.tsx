import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppHeader } from '../../src/components/AppHeader';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { ConverterPanel } from '../../src/features/converter/ConverterPanel';
import { ArithPanel } from '../../src/features/binary/ArithPanel';
import { useI18n } from '../../src/hooks/useI18n';
import type { Base } from '../../src/core/number-systems/index.ts';
import type { BinaryOp } from '../../src/core/arithmetic/index.ts';

type Mode = 'convert' | 'arith';
type Params = { mode?: string; base?: string; value?: string; a?: string; b?: string; op?: string };

const isOp = (v: string | undefined): v is BinaryOp => v === 'add' || v === 'sub' || v === 'mul' || v === 'div';

export default function CalculatorScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const [mode, setMode] = useState<Mode>(params.mode === 'arith' ? 'arith' : 'convert');

  useEffect(() => {
    if (params.mode === 'arith' || params.mode === 'convert') setMode(params.mode);
  }, [params.mode]);

  const base: Base | undefined = params.base === '2' ? 2 : params.base === '10' ? 10 : params.base === '16' ? 16 : undefined;
  // A new key re-initialises a panel when it is opened with new values (e.g. from History).
  const sig = JSON.stringify([params.base, params.value, params.a, params.b, params.op]);

  return (
    <Screen
      bottomInset={72}
      header={<AppHeader tools title={t('nav.calculator')} onHelp={() => router.push('/help')} />}
    >
      <Segmented
        groupLabel={t('nav.calculator')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'convert', label: t('conv.mode.convert') },
          { value: 'arith', label: t('conv.mode.arith') },
        ]}
      />
      {/* Both panels stay mounted so typed input survives switching modes. */}
      <View style={{ display: mode === 'convert' ? 'flex' : 'none' }}>
        <ConverterPanel key={`c${sig}`} initialValue={params.value ?? ''} initialBase={base} />
      </View>
      <View style={{ display: mode === 'arith' ? 'flex' : 'none' }}>
        <ArithPanel key={`a${sig}`} initialA={params.a ?? ''} initialB={params.b ?? ''} initialOp={isOp(params.op) ? params.op : undefined} />
      </View>
    </Screen>
  );
}
