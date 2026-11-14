# Brand

- `logo-reference.png`: the logo as supplied (CE mark, CONTINUUM, values line).
- `mark.svg`: the CE mark redrawn as a vector. The source of truth for the paths is
  `packages/shared/src/brand.ts` (`MARK`), which the web and mobile apps render from.

Colors (also in `BRAND_COLORS`): ink `#131313`, bone `#F8F7F4`, slate `#93A7B2`,
slate-deep `#4F6470` (slate for text on light backgrounds), grey `#B8B7B7`.

Type: Jost (interface, tracked caps for CONTINUUM and labels) and Spectral (display serif).

Generated from the mark: web `apps/web/src/app/icon.svg` and `apple-icon.png`; mobile
`apps/mobile/assets/images/icon.png`, `android-icon-*.png`, `splash-icon.png`, `favicon.png`.
If the mark changes, regenerate these too.
