import Link from 'next/link';

import { ROUTES } from '@/constants/routes';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight text-rpg-accent">
        Skill Quest RPG
      </h1>
      <p className="max-w-md text-center text-gray-300">
        日々の業務をクエストに、スキル習得を冒険に。
        <br />
        あなたの成長を可視化する RPG 風人材育成アプリ。
      </p>
      <div className="flex gap-4">
        <Link
          href={ROUTES.LOGIN}
          className="rounded bg-rpg-accent px-6 py-3 font-semibold text-rpg-bg hover:opacity-90"
        >
          ログイン
        </Link>
        <Link
          href={ROUTES.SIGNUP}
          className="rounded border border-rpg-accent px-6 py-3 font-semibold text-rpg-accent hover:bg-rpg-card"
        >
          新規登録
        </Link>
      </div>
    </main>
  );
}
