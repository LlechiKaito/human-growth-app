'use client';

import Link from 'next/link';

import { ROUTES } from '@/constants/routes';
import { AdminGuard } from '@/features/admin/components/AdminGuard';
import {
  useAdminQuests,
  useDeleteAdminQuest,
} from '@/features/admin/hooks/useAdminQuests';

export default function AdminQuestsPage() {
  return (
    <AdminGuard>
      <Content />
    </AdminGuard>
  );
}

const Content = () => {
  const { data, isLoading, isError } = useAdminQuests();
  const remove = useDeleteAdminQuest();

  if (isLoading) return <p className="text-gray-400">読み込み中...</p>;
  if (isError || !data) return <p className="text-rpg-health">クエスト一覧を取得できませんでした</p>;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">クエスト管理</h1>
        <Link
          href={ROUTES.ADMIN_QUEST_NEW}
          className="rounded bg-rpg-accent px-4 py-2 text-sm font-semibold text-rpg-bg hover:opacity-90"
          data-testid="new-quest"
        >
          ＋ 新規作成
        </Link>
      </header>

      <table className="w-full table-auto text-left text-sm">
        <thead className="text-xs uppercase text-gray-400">
          <tr>
            <th className="border-b border-gray-700 py-2">タイトル</th>
            <th className="border-b border-gray-700 py-2">難易度</th>
            <th className="border-b border-gray-700 py-2">XP</th>
            <th className="border-b border-gray-700 py-2">状態</th>
            <th className="border-b border-gray-700 py-2 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-500">
                クエストがありません
              </td>
            </tr>
          )}
          {data.map((q) => (
            <tr key={q.id} className="hover:bg-rpg-card" data-testid={`admin-quest-${q.id}`}>
              <td className="border-b border-gray-800 py-2">{q.title}</td>
              <td className="border-b border-gray-800 py-2">{q.difficulty}</td>
              <td className="border-b border-gray-800 py-2">{q.rewardXp}</td>
              <td className="border-b border-gray-800 py-2">{q.status}</td>
              <td className="border-b border-gray-800 py-2 text-right">
                <Link
                  href={ROUTES.ADMIN_QUEST_EDIT(q.id)}
                  className="mr-3 text-rpg-accent underline"
                >
                  編集
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`「${q.title}」を削除しますか?`)) remove.mutate(q.id);
                  }}
                  className="text-rpg-health underline disabled:opacity-50"
                  disabled={remove.isPending}
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
