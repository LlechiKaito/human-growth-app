'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import { AdminGuard } from '@/features/admin/components/AdminGuard';
import { QuestForm } from '@/features/admin/components/QuestForm';
import {
  useAdminQuests,
  useUpdateAdminQuest,
} from '@/features/admin/hooks/useAdminQuests';

/**
 * 編集画面の URL は /admin/quests/edit?id=<uuid>。
 * Next.js の output:'export' が動的セグメント ([id]) を許さないため、
 * パスパラメータではなくクエリパラメータで ID を受け取る。
 */
export default function EditAdminQuestPage() {
  return (
    <AdminGuard>
      <Content />
    </AdminGuard>
  );
}

const Content = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';

  const list = useAdminQuests();
  const update = useUpdateAdminQuest();

  if (!id) return <p className="text-rpg-health">ID が指定されていません</p>;
  if (list.isLoading) return <p className="text-gray-400">読み込み中...</p>;
  const quest = list.data?.find((q) => q.id === id);
  if (!quest) return <p className="text-rpg-health">クエストが見つかりません</p>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">クエスト編集</h1>
      <QuestForm
        initial={{
          title: quest.title,
          description: quest.description,
          difficulty: quest.difficulty,
          rewardXp: quest.rewardXp,
          assignedCharacterId: quest.assignedCharacterId,
          documentRequirement: quest.documentRequirement,
          testRequirement: quest.testRequirement,
        }}
        submitLabel="更新する"
        isPending={update.isPending}
        onSubmit={(input) =>
          update.mutate(
            { id, input },
            { onSuccess: () => router.push(ROUTES.ADMIN_QUESTS) },
          )
        }
      />
      {quest.testRequirement !== 'NONE' && (
        <a
          href={ROUTES.ADMIN_QUEST_TEST_EDIT(quest.id)}
          className="self-start rounded border border-rpg-accent px-3 py-2 text-sm font-semibold text-rpg-accent hover:bg-rpg-accent hover:text-rpg-bg"
        >
          テスト (クイズ) の設問を編集する →
        </a>
      )}
    </div>
  );
};
