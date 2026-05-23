'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { ROUTES } from '@/constants/routes';
import { useLogin } from '@/features/auth/hooks/useAuth';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-300">メールアドレス</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-gray-600 bg-rpg-card px-3 py-2 text-white outline-none focus:border-rpg-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-300">パスワード</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-gray-600 bg-rpg-card px-3 py-2 text-white outline-none focus:border-rpg-accent"
        />
      </label>
      {login.isError && (
        <p className="text-sm text-rpg-health" data-testid="login-error">
          {ERROR_MESSAGES.UNAUTHORIZED}
        </p>
      )}
      <button
        type="submit"
        disabled={login.isPending}
        className="rounded bg-rpg-accent px-4 py-2 font-semibold text-rpg-bg hover:opacity-90 disabled:opacity-50"
        data-testid="login-submit"
      >
        {login.isPending ? 'ログイン中...' : 'ログイン'}
      </button>
      <p className="text-center text-sm text-gray-400">
        アカウントがない場合は{' '}
        <Link href={ROUTES.SIGNUP} className="text-rpg-accent underline">
          新規登録
        </Link>
      </p>
    </form>
  );
};
