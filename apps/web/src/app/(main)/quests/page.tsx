'use client';

import { useState } from 'react';

import type { CompleteQuestResult } from '@/features/quest/api';
import { QuestCard } from '@/features/quest/components/QuestCard';
import { QuestRewardToast } from '@/features/quest/components/QuestRewardToast';
import { useCompleteQuest, useQuests } from '@/features/quest/hooks/useQuests';

export default function QuestsPage() {
  const { data, isLoading, isError } = useQuests();
  const [reward, setReward] = useState<CompleteQuestResult | null>(null);
  const complete = useCompleteQuest((result) => setReward(result));

  if (isLoading) return <p className="text-gray-400">読み込み中...</p>;
  if (isError || !data)
    return <p className="text-rpg-health">クエスト一覧を取得できませんでした</p>;

  const open = data.filter((q) => q.status !== 'COMPLETED');
  const done = data.filter((q) => q.status === 'COMPLETED');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">受注可能</h2>
        <div className="flex flex-col gap-3" data-testid="quest-list-open">
          {open.length === 0 ? (
            <p className="text-sm text-gray-500">現在受注可能なクエストはありません</p>
          ) : (
            open.map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                onComplete={(id) => complete.mutate(id)}
                isCompleting={complete.isPending && complete.variables === q.id}
              />
            ))
          )}
        </div>
      </section>
      {done.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-white">完了済み</h2>
          <div className="flex flex-col gap-3" data-testid="quest-list-done">
            {done.map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                onComplete={() => undefined}
                isCompleting={false}
              />
            ))}
          </div>
        </section>
      )}
      <QuestRewardToast result={reward} onDismiss={() => setReward(null)} />
    </div>
  );
}
