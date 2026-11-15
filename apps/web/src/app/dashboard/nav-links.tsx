'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavLink = { href: string; label: string };

export const COACH_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Athletes' },
  { href: '/dashboard/programs', label: 'Programs' },
  { href: '/dashboard/exercises', label: 'Exercises' },
  { href: '/dashboard/messages', label: 'Messages' },
  { href: '/dashboard/community', label: 'Community' },
  { href: '/dashboard/plans', label: 'Plans' },
];

export const ATHLETE_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Home' },
  { href: '/dashboard/training', label: 'Training' },
  { href: '/dashboard/nutrition', label: 'Nutrition' },
  { href: '/dashboard/messages', label: 'Coach' },
  { href: '/dashboard/community', label: 'Community' },
  { href: '/dashboard/devices', label: 'Devices' },
];

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-x-5 gap-y-1">
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
