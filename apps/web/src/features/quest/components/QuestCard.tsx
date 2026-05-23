import type { QuestDto } from '@/features/quest/api';

const DIFFICULTY_COLOR: Record<QuestDto['difficulty'], string> = {
  EASY: 'text-rpg-xp',
  NORMAL: 'text-blue-300',
  HARD: 'text-rpg-accent',
  EPIC: 'text-purple-300',
};

const STATUS_LABEL: Record<QuestDto['status'], string> = {
  OPEN: '受注可',
  IN_PROGRESS: '進行中',
  COMPLETED: '完了',
};

interface QuestCardProps {
  quest: QuestDto;
  onComplete: (questId: string) => void;
  isCompleting: boolean;
}

export const QuestCard = ({ quest, onComplete, isCompleting }: QuestCardProps) => {
  const isCompleted = quest.status === 'COMPLETED';
  return (
    <div
      className={
        isCompleted
          ? 'rounded-lg border border-gray-700 bg-rpg-card p-4 opacity-60'
          : 'rounded-lg border border-gray-700 bg-rpg-card p-4 hover:border-rpg-accent'
      }
      data-testid={`quest-${quest.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={DIFFICULTY_COLOR[quest.difficulty]}>◆</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {quest.difficulty}
            </span>
            <span className="text-xs text-gray-500">— {STATUS_LABEL[quest.status]}</span>
          </div>
          <h3 className="mt-1 font-semibold text-white">{quest.title}</h3>
          <p className="mt-1 text-sm text-gray-400">{quest.description}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Reward</p>
          <p className="text-lg font-bold text-rpg-xp">+{quest.rewardXp} XP</p>
        </div>
      </div>
      {!isCompleted && (
        <button
          type="button"
          onClick={() => onComplete(quest.id)}
          disabled={isCompleting}
          className="mt-3 w-full rounded bg-rpg-accent px-3 py-2 text-sm font-semibold text-rpg-bg hover:opacity-90 disabled:opacity-50"
          data-testid={`complete-${quest.id}`}
        >
          {isCompleting ? '完了処理中...' : 'クエストを完了する'}
        </button>
      )}
    </div>
  );
};
