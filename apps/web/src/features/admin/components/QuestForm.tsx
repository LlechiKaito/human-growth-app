'use client';

import { useState, type FormEvent } from 'react';

import type { QuestUpsertInput } from '@/features/admin/api';
import type { QuestDifficulty } from '@/features/quest/api';

const DIFFICULTIES: QuestDifficulty[] = ['EASY', 'NORMAL', 'HARD', 'EPIC'];

interface QuestFormProps {
  initial?: Partial<QuestUpsertInput>;
  submitLabel: string;
  onSubmit: (input: QuestUpsertInput) => void;
  isPending?: boolean;
}

export const QuestForm = ({ initial, submitLabel, onSubmit, isPending }: QuestFormProps) => {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>(initial?.difficulty ?? 'NORMAL');
  const [rewardXp, setRewardXp] = useState<number>(initial?.rewardXp ?? 100);
  const [assignedCharacterId, setAssignedCharacterId] = useState(
    initial?.assignedCharacterId ?? '',
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      difficulty,
      rewardXp,
      assignedCharacterId: assignedCharacterId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-300">タイトル</span>
        <input
          type="text"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-gray-600 bg-rpg-card px-3 py-2 text-white outline-none focus:border-rpg-accent"
          data-testid="quest-title"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-300">説明</span>
        <textarea
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border border-gray-600 bg-rpg-card px-3 py-2 text-white outline-none focus:border-rpg-accent"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-300">難易度</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as QuestDifficulty)}
            className="rounded border border-gray-600 bg-rpg-card px-3 py-2 text-white outline-none focus:border-rpg-accent"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-300">報酬 XP</span>
          <input
            type="number"
            required
            min={0}
            max={10000}
            value={rewardXp}
            onChange={(e) => setRewardXp(Number(e.target.value))}
            className="rounded border border-gray-600 bg-rpg-card px-3 py-2 text-white outline-none focus:border-rpg-accent"
            data-testid="quest-reward-xp"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-300">アサイン先キャラ ID (任意、UUID)</span>
        <input
          type="text"
          value={assignedCharacterId}
          onChange={(e) => setAssignedCharacterId(e.target.value)}
          placeholder="空欄なら未割当 (誰でも受注可)"
          className="rounded border border-gray-600 bg-rpg-card px-3 py-2 text-white outline-none focus:border-rpg-accent"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-rpg-accent px-4 py-2 font-semibold text-rpg-bg hover:opacity-90 disabled:opacity-50"
        data-testid="quest-submit"
      >
        {isPending ? '処理中...' : submitLabel}
      </button>
    </form>
  );
};
