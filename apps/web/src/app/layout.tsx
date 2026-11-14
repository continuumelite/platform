import type { Metadata } from 'next';
import { Jost, Spectral } from 'next/font/google';
import './globals.css';

// Brand type: a geometric sans for the interface, a serif for display moments.
const jost = Jost({
  variable: '--font-jost',
  subsets: ['latin'],
});

const spectral = Spectral({
  variable: '--font-spectral',
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Continuum Elite',
  description: 'Personalized endurance and strength coaching. Consistency, resilience, discipline.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${jost.variable} ${spectral.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
