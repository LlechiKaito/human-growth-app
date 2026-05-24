'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { ROUTES } from '@/constants/routes';
import { useLogout, useMe } from '@/features/auth/hooks/useAuth';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { CharacterAvatar } from '@/features/character/components/CharacterAvatar';
import { useMyCharacter } from '@/features/character/hooks/useMyCharacter';

const NAV_ITEMS = [
  { href: ROUTES.DASHBOARD, label: 'ダッシュボード' },
  { href: ROUTES.QUESTS, label: 'クエスト' },
  { href: ROUTES.MY_CHARACTER, label: 'キャラクター' },
];

const ADMIN_NAV_ITEMS = [
  { href: ROUTES.ADMIN_QUESTS, label: '管理 (クエスト)' },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const me = useMe();
  const character = useMyCharacter();
  const logout = useLogout();
  const isAdmin = me.data?.isAdmin ?? false;
  const navItems = isAdmin ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;

  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-gray-800 bg-rpg-card px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href={ROUTES.DASHBOARD} className="text-lg font-bold text-rpg-accent">
              Skill Quest
            </Link>
            <nav className="flex gap-4 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    pathname.startsWith(item.href)
                      ? 'text-rpg-accent'
                      : 'text-gray-300 hover:text-white'
                  }
                  data-testid={`nav-${item.href}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {character.data && (
              <CharacterAvatar
                className={character.data.className}
                level={character.data.level}
                size={32}
                testId="nav-avatar"
              />
            )}
            {me.data && (
              <span className="text-gray-300" data-testid="me-name">
                {me.data.displayName}
                {character.data && (
                  <span className="ml-1 text-xs text-rpg-accent">
                    Lv.{character.data.level}
                  </span>
                )}
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
