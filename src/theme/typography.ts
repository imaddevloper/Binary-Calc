/** Cairo covers Latin and Arabic with consistent shaping; JetBrains Mono is for technical values. */
export const fonts = {
  regular: 'Cairo_400Regular',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export type TextVariant = 'title' | 'heading' | 'subheading' | 'body' | 'label' | 'caption' | 'mono' | 'monoLarge';

export const textStyles: Record<TextVariant, { fontFamily: string; fontSize: number; lineHeight: number }> = {
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 38 },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 30 },
  subheading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 24 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  mono: { fontFamily: fonts.mono, fontSize: 16, lineHeight: 24 },
  monoLarge: { fontFamily: fonts.monoBold, fontSize: 22, lineHeight: 32 },
};
