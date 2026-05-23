import type { Metadata } from 'next';

import { QueryProvider } from '@/lib/query-client';

import './globals.css';

export const metadata: Metadata = {
  title: 'Human Growth — Skill Quest RPG',
  description: 'RPG 風人材育成アプリ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-rpg-bg text-white antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
