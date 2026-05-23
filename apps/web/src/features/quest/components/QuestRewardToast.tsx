import { useEffect } from 'react';

import type { CompleteQuestResult } from '@/features/quest/api';

interface QuestRewardToastProps {
  result: CompleteQuestResult | null;
  onDismiss: () => void;
}

export const QuestRewardToast = ({ result, onDismiss }: QuestRewardToastProps) => {
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [result, onDismiss]);

  if (!result) return null;
  return (
    <div
      role="status"
      data-testid="reward-toast"
      className="fixed bottom-6 right-6 max-w-sm rounded-lg border border-rpg-accent bg-rpg-card p-4 shadow-lg"
    >
      <p className="text-sm text-gray-300">クエスト完了!</p>
      <p className="text-lg font-bold text-rpg-xp" data-testid="gained-xp">
        +{result.gainedXp} XP
      </p>
      {result.leveledUp && (
        <p className="mt-1 text-xl font-bold text-rpg-accent" data-testid="level-up">
          ⭐ レベルアップ! Lv.{result.oldLevel} → Lv.{result.newLevel}
        </p>
      )}
    </div>
  );
};
