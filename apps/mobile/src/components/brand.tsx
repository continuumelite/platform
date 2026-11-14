import { StyleSheet, Text, View } from 'react-native';

import { BrandFonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const BRAND_VALUES = ['consistency', 'resilience', 'discipline', 'continuum'] as const;

/**
 * Type-only wordmark (CONTINUUM over a small tracked ELITE), matching the web.
 * Replace with the final logo SVG when it exists.
 */
export function Wordmark() {
  const theme = useTheme();
  return (
    <View accessible accessibilityLabel="Continuum Elite">
      <Text style={[styles.main, { color: theme.text }]}>CONTINUUM</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>ELITE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  main: { fontFamily: BrandFonts.semibold, fontSize: 18, letterSpacing: 5.5 },
  sub: { fontFamily: BrandFonts.medium, fontSize: 10, letterSpacing: 5.5, marginTop: 2 },
});
