'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { ROUTES } from '@/constants/routes';
import { useMe } from '@/features/auth/hooks/useAuth';

/**
 * 管理者以外を /dashboard に追い返すガード。AuthGuard の内側に配置すること。
 */
export const AdminGuard = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const me = useMe();

  useEffect(() => {
    if (!me.isLoading && me.data && !me.data.isAdmin) {
      router.replace(ROUTES.DASHBOARD);
    }
  }, [me.isLoading, me.data, router]);

  if (me.isLoading) {
    return <p className="text-gray-400">権限を確認中...</p>;
  }
  if (!me.data?.isAdmin) {
    return <p className="text-rpg-health" data-testid="admin-denied">この画面は管理者のみアクセスできます</p>;
  }
  return <>{children}</>;
};
