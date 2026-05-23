'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ROUTES } from '@/constants/routes';
import { useSignup } from '@/features/auth/hooks/useAuth';

export const SignupForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('');
  const signup = useSignup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signup.mutate({
      email,
      password,
      displayName,
      department: department || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-300">表示名</span>
        <input
          type="text"
          required
          maxLength={50}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded border border-gray-600 bg-rpg-card px-3 py-2 text-white outline-none focus:border-rpg-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-300">部署 (任意)</span>
        <input
          type="text"
          maxLength={50}
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded border border-gray-600 bg-rpg-card px-3 py-2 text-white outline-none focus:border-rpg-accent"
        />
      </label>
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
        <span className="text-gray-300">パスワード (8文字以上)</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-gray-600 bg-rpg-card px-3 py-2 text-white outline-none focus:border-rpg-accent"
        />
      </label>
      {signup.isError && (
        <p className="text-sm text-rpg-health" data-testid="signup-error">
          登録に失敗しました。既に登録済みのメールアドレスかもしれません。
        </p>
      )}
      <button
        type="submit"
        disabled={signup.isPending}
        className="rounded bg-rpg-accent px-4 py-2 font-semibold text-rpg-bg hover:opacity-90 disabled:opacity-50"
        data-testid="signup-submit"
      >
        {signup.isPending ? '登録中...' : '冒険を始める'}
      </button>
      <p className="text-center text-sm text-gray-400">
        既にアカウントをお持ちですか?{' '}
        <Link href={ROUTES.LOGIN} className="text-rpg-accent underline">
          ログイン
        </Link>
      </p>
    </form>
  );
};
