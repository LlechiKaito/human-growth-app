'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { ROUTES } from '@/constants/routes';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { useLogout, useMe } from '@/features/auth/hooks/useAuth';

const NAV_ITEMS = [
  { href: ROUTES.DASHBOARD, label: 'ダッシュボード' },
  { href: ROUTES.QUESTS, label: 'クエスト' },
  { href: ROUTES.MY_CHARACTER, label: 'キャラクター' },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const me = useMe();
  const logout = useLogout();

  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-gray-800 bg-rpg-card px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href={ROUTES.DASHBOARD} className="text-lg font-bold text-rpg-accent">
              Skill Quest
            </Link>
            <nav className="flex gap-4 text-sm">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    pathname.startsWith(item.href)
                      ? 'text-rpg-accent'
                      : 'text-gray-300 hover:text-white'
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {me.data && (
              <span className="text-gray-300" data-testid="me-name">
                {me.data.displayName}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded border border-gray-600 px-3 py-1 text-xs text-gray-300 hover:border-rpg-accent hover:text-rpg-accent"
            >
              ログアウト
            </button>
          </div>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </div>
    </AuthGuard>
  );
}
