# Brand

- `logo-reference.png`: the logo as supplied (CE mark, CONTINUUM, values line).
- `mark.svg`: the CE mark redrawn as a vector. The source of truth for the paths is
  `packages/shared/src/brand.ts` (`MARK`), which the web and mobile apps render from.

Look and feel follow the app design brief (`continuum-app-design-brief.pptx`): dark-only,
premium and calm, personal status before social.

Colors (also in `BRAND_COLORS`): navy background `#0E1725`, card `#232936`, raised surface
`#343B4A`, rule `#444953`, text `#F3F1EC`, secondary text `#9AA0AA`, cream `#E1DCCF` (logo,
primary buttons, active tab), red `#F3473D` (accent, used sparingly).

Type: Anton for headlines, DM Sans for everything else (tracked caps for CONTINUUM and labels).

Mobile shell: exactly five bottom tabs (Home, Training, Nutrition, Dashboard, More), logo at
the top. Everything secondary lives under More.

Generated from the mark (cream on navy): web `apps/web/src/app/icon.svg` and `apple-icon.png`;
mobile `apps/mobile/assets/images/icon.png`, `android-icon-*.png`, `splash-icon.png`,
`favicon.png`. If the mark changes, regenerate these too.
