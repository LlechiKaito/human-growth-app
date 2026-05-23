'use client';

import Link from 'next/link';

import { ROUTES } from '@/constants/routes';
import { StatusCard } from '@/features/character/components/StatusCard';
import { useMyCharacter } from '@/features/character/hooks/useMyCharacter';
import { QuestCard } from '@/features/quest/components/QuestCard';
import { useQuests } from '@/features/quest/hooks/useQuests';

export default function DashboardPage() {
  const character = useMyCharacter();
  const quests = useQuests();

  if (character.isLoading || quests.isLoading) {
    return <p className="text-gray-400">読み込み中...</p>;
  }
  if (character.isError || !character.data) {
    return <p className="text-rpg-health">ダッシュボードを表示できませんでした</p>;
  }

  const openQuests = (quests.data ?? []).filter((q) => q.status !== 'COMPLETED').slice(0, 3);
  const completedCount = (quests.data ?? []).filter((q) => q.status === 'COMPLETED').length;
  const acquiredSkills = character.data.skills.filter((s) => s.acquired);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <StatusCard character={character.data} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-gray-700 bg-rpg-card p-4">
          <p className="text-xs text-gray-400">完了クエスト</p>
          <p className="text-3xl font-bold text-rpg-accent" data-testid="completed-count">
            {completedCount}
          </p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-rpg-card p-4">
          <p className="text-xs text-gray-400">取得スキル</p>
          <p className="text-3xl font-bold text-rpg-xp" data-testid="acquired-skills-count">
            {acquiredSkills.length} / {character.data.skills.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-rpg-card p-4">
          <p className="text-xs text-gray-400">次のレベルまで</p>
          <p className="text-3xl font-bold text-blue-300">
            {character.data.xpToNextLevel ?? '--'} XP
          </p>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">進行中クエスト</h2>
          <Link href={ROUTES.QUESTS} className="text-sm text-rpg-accent underline">
            一覧を見る
          </Link>
        </div>
        <div className="flex flex-col gap-3" data-testid="dashboard-quests">
          {openQuests.length === 0 ? (
            <p className="text-sm text-gray-500">受注可能なクエストはありません</p>
          ) : (
            openQuests.map((q) => (
              <QuestCard key={q.id} quest={q} onComplete={() => undefined} isCompleting={false} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
