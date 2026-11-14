import { MARK } from '@continuum/shared';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BrandFonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const BRAND_VALUES = ['consistency', 'resilience', 'discipline', 'continuum'] as const;

/** The CE mark (shared with the web app via @continuum/shared). */
export function Mark({ height = 24, color }: { height?: number; color?: string }) {
  const theme = useTheme();
  const width = (height * MARK.width) / MARK.height;
  return (
    <Svg width={width} height={height} viewBox={MARK.viewBox} fill="none">
      {MARK.paths.map((p) => (
        <Path
          key={p.d}
          d={p.d}
          stroke={color ?? theme.text}
          strokeWidth={p.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

/** The logo: mark over CONTINUUM, left-aligned. */
export function Wordmark() {
  const theme = useTheme();
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Continuum" style={styles.lockup}>
      <Mark height={44} />
      <Text style={[styles.name, { color: theme.text }]}>CONTINUUM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { alignItems: 'flex-start', gap: 10 },
  name: { fontFamily: BrandFonts.semibold, fontSize: 18, letterSpacing: 6 },
});
