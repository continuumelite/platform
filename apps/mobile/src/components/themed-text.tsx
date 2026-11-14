import { StyleSheet, Text, type TextProps } from 'react-native';

import { BrandFonts, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'eyebrow'
    | 'serifItalic'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

// Custom fonts need a family per weight (fontWeight is ignored for them on Android).
const styles = StyleSheet.create({
  small: {
    fontFamily: BrandFonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: BrandFonts.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: BrandFonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  // Display type uses the brand serif, like the deck.
  title: {
    fontFamily: BrandFonts.serif,
    fontSize: 44,
    lineHeight: 50,
  },
  subtitle: {
    fontFamily: BrandFonts.serif,
    fontSize: 30,
    lineHeight: 38,
  },
  serifItalic: {
    fontFamily: BrandFonts.serifItalic,
    fontSize: 18,
    lineHeight: 24,
  },
  // Small tracked caps for labels, like the deck's value line.
  eyebrow: {
    fontFamily: BrandFonts.medium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: BrandFonts.regular,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: BrandFonts.medium,
    lineHeight: 30,
    fontSize: 14,
    color: '#4F6470',
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
