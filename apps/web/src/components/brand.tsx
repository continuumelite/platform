/**
 * Brand marks. The CE mark is a vector redraw of docs/brand/logo-reference.png (see
 * docs/brand/mark.svg); it uses currentColor, so it works on light and dark backgrounds.
 */

import { MARK } from '@continuum/shared';

export const BRAND_VALUES = ['consistency', 'resilience', 'discipline', 'continuum'] as const;

/** The CE mark on its own. Size it with a height class, e.g. `h-6`. */
export function Mark({ className = '', title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={MARK.viewBox}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-auto ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {MARK.paths.map((p) => (
        <path key={p.d} d={p.d} strokeWidth={p.strokeWidth} />
      ))}
    </svg>
  );
}

/** Mark + CONTINUUM side by side, for headers. */
export function Wordmark({
  size = 'sm',
  className = '',
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  const mark = size === 'sm' ? 'h-5' : 'h-7';
  const text = size === 'sm' ? 'text-sm tracking-[0.3em]' : 'text-lg tracking-[0.32em]';
  return (
    <span
      className={`inline-flex items-center gap-3 leading-none ${className}`}
      aria-label="Continuum"
    >
      <Mark className={mark} />
      <span aria-hidden className={`font-semibold uppercase ${text}`}>
        Continuum
      </span>
    </span>
  );
}

/** The full logo: mark over CONTINUUM over the values line, centered (as in the logo file). */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex flex-col items-center ${className}`} aria-label="Continuum">
      <Mark className="h-20 sm:h-24" />
      <span
        aria-hidden
        className="mt-4 text-2xl font-semibold tracking-[0.34em] uppercase sm:text-3xl"
      >
        Continuum
      </span>
      <ValuesLine className="mt-3 flex-nowrap justify-center gap-x-2 text-[0.5rem] whitespace-nowrap sm:text-[0.55rem]" />
    </div>
  );
}

/** "consistency ▲ resilience ▲ discipline ▲ continuum" */
export function ValuesLine({ className = '' }: { className?: string }) {
  return (
    <p
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] tracking-[0.3em] uppercase ${className}`}
    >
      {BRAND_VALUES.map((v, i) => (
        <span key={v} className="flex items-center gap-3">
          {i > 0 && (
            <span aria-hidden className="text-[0.5rem]">
              ▲
            </span>
          )}
          {v}
        </span>
      ))}
    </p>
  );
}

/** The deck's header: the four values in a 2×2 grid separated by thin rules, "continuum" in slate italics. */
export function ValuesGrid({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-x-8 text-sm ${className}`}>
      {BRAND_VALUES.map((v) => (
        <span
          key={v}
          className={`border-b border-current/30 py-1.5 [&:nth-child(-n+2)]:border-t ${
            v === 'continuum' ? 'text-slate italic' : ''
          }`}
        >
          {v}
        </span>
      ))}
    </div>
  );
}
