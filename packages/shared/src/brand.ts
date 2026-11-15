/**
 * The Continuum "CE" mark as stroked paths, redrawn from docs/brand/logo-reference.png.
 * Web and mobile both render from this, so the mark is defined in one place.
 * Draw each path with no fill, round caps/joins, and its own stroke width.
 *
 * Construction: the top bar runs into a diagonal that meets the C's circle (centre 57,57,
 * radius 45) at a tangent, wraps around the C, and stops short of the diagonal. A second
 * stroke picks up past the crossing and curls into the bottom bar, giving the woven look.
 */
export const MARK = {
  viewBox: '0 0 256 114',
  width: 256,
  height: 114,
  paths: [
    { d: 'M244 12 H178 Q158 12 146 25.4 L90.4 87.1 A45 45 0 1 1 96 34.5', strokeWidth: 22 },
    { d: 'M146 80 Q150 102 178 102 H244', strokeWidth: 22 },
    { d: 'M180 57 H220', strokeWidth: 18 },
  ],
} as const;

/** Colors from the app design brief (dark-only). */
export const BRAND_COLORS = {
  navy: '#0E1725',
  card: '#232936',
  raised: '#343B4A',
  rule: '#444953',
  text: '#F3F1EC',
  textSecondary: '#9AA0AA',
  cream: '#E1DCCF',
  red: '#F3473D',
} as const;

/** The mark as a standalone SVG string (for icons and files). */
export function markSvg({
  color = BRAND_COLORS.cream,
  background,
  size,
}: { color?: string; background?: string; size?: number } = {}): string {
  const paths = MARK.paths
    .map((p) => `<path stroke-width="${p.strokeWidth}" d="${p.d}"/>`)
    .join('');
  if (!background || !size) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK.viewBox}" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }
  // Square icon: the mark centred at ~66% of the width.
  const scale = (size * 0.66) / MARK.width;
  const tx = (size - MARK.width * scale) / 2;
  const ty = (size - MARK.height * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${background}"/><g transform="translate(${tx} ${ty}) scale(${scale})" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}
