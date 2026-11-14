/**
 * Brand marks. The deck's logo direction is a simple wordmark: CONTINUUM in wide caps over a
 * small tracked line. This is a type-only stand-in until the final logo files exist; swap the
 * markup for the SVG when they do.
 */

export const BRAND_VALUES = ['consistency', 'resilience', 'discipline', 'continuum'] as const;

export function Wordmark({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const main = {
    sm: 'text-sm tracking-[0.28em]',
    md: 'text-lg tracking-[0.3em]',
    lg: 'text-3xl tracking-[0.32em]',
  }[size];
  const sub = {
    sm: 'text-[0.55rem] tracking-[0.5em]',
    md: 'text-[0.6rem] tracking-[0.55em]',
    lg: 'text-xs tracking-[0.6em]',
  }[size];

  return (
    <span
      className={`inline-flex flex-col items-start leading-none ${className}`}
      aria-label="Continuum Elite"
    >
      <span className={`font-semibold uppercase ${main}`}>Continuum</span>
      <span className={`mt-1 font-medium uppercase opacity-70 ${sub}`}>Elite</span>
    </span>
  );
}

/** "consistency ▲ resilience ▲ discipline ▲ continuum" */
export function ValuesLine({ className = '' }: { className?: string }) {
  return (
    <p
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] uppercase tracking-[0.3em] ${className}`}
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
