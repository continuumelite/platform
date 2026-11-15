'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Athletes' },
  { href: '/dashboard/programs', label: 'Programs' },
  { href: '/dashboard/exercises', label: 'Exercises' },
  { href: '/dashboard/community', label: 'Community' },
  { href: '/dashboard/plans', label: 'Plans' },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-5">
      {links.map(({ href, label }) => {
        const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`border-b-2 px-1 py-1.5 text-xs font-semibold tracking-[0.18em] uppercase ${
              active
                ? 'border-slate text-zinc-50'
                : 'border-transparent text-zinc-400 hover:text-zinc-50'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
