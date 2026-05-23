'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { ROUTES } from '@/constants/routes';
import { useMe } from '@/features/auth/hooks/useAuth';
import { tokenStorage } from '@/features/auth/token-storage';

export const AuthGuard = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { data, isError, isLoading } = useMe();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!tokenStorage.get()) {
      router.replace(ROUTES.LOGIN);
    }
  }, [router]);

  useEffect(() => {
    if (isError) {
      tokenStorage.clear();
      router.replace(ROUTES.LOGIN);
    }
  }, [isError, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  if (!data) return null;

  return <>{children}</>;
};
