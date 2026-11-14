/**
 * Continuum Elite brand, from the brand deck: near-black #131313, slate #93A7B2,
 * soft grey #B8B7B7 and white. Monochrome and quiet; slate is the only accent.
 * The web app uses the same values (apps/web/src/app/globals.css).
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#131313',
    background: '#F8F7F4',
    backgroundElement: '#EFEEEA',
    backgroundSelected: '#E2E1DD',
    textSecondary: '#5D5D5D',
    accent: '#4F6470',
  },
  dark: {
    text: '#F8F7F4',
    background: '#131313',
    backgroundElement: '#1C1C1C',
    backgroundSelected: '#2A2A2A',
    textSecondary: '#B8B7B7',
    accent: '#93A7B2',
  },
} as const;

/** Font families loaded in the root layout (@expo-google-fonts). Custom fonts need one family per weight. */
export const BrandFonts = {
  regular: 'Jost_400Regular',
  medium: 'Jost_500Medium',
  semibold: 'Jost_600SemiBold',
  serif: 'Spectral_600SemiBold',
  serifItalic: 'Spectral_400Regular_Italic',
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
