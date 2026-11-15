import type { Metadata, Viewport } from 'next';
import { Anton, DM_Sans } from 'next/font/google';
import './globals.css';

// Brand type from the design brief: Anton for headlines, DM Sans for the interface.
const anton = Anton({
  variable: '--font-anton',
  subsets: ['latin'],
  weight: '400',
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Continuum Elite',
  description: 'Personalized endurance and strength coaching. Consistency, resilience, discipline.',
};

export const viewport: Viewport = {
  themeColor: '#0e1725',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`dark ${anton.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
