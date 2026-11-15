/**
 * Continuum design system, from the app design brief (docs/brand/README.md):
 * dark only — deep navy background, raised navy-grey cards, cream for the logo and key text,
 * grey rules, and a red accent used sparingly (alerts, AI, open items).
 * Headings use Anton (tall condensed), everything else DM Sans.
 */

import '@/global.css';

import { Platform } from 'react-native';

const palette = {
  text: '#F3F1EC',
  background: '#0E1725',
  backgroundElement: '#232936',
  backgroundSelected: '#343B4A',
  textSecondary: '#9AA0AA',
  accent: '#F3473D',
  cream: '#E1DCCF',
  rule: '#444953',
} as const;

/** The app is dark only; both schemes use the same palette. */
export const Colors = { light: palette, dark: palette } as const;

/** Font families loaded in the root layout (@expo-google-fonts). Custom fonts need one family per weight. */
export const BrandFonts = {
  display: 'Anton_400Regular',
  regular: 'DMSans_400Regular',
  italic: 'DMSans_400Regular_Italic',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
