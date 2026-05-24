'use client';

import { useState, type FormEvent } from 'react';

import type { QuestUpsertInput } from '@/features/admin/api';
import { CharacterPicker } from '@/features/admin/components/CharacterPicker';
import type { QuestDifficulty, QuestRequirement } from '@/features/quest/api';

const DIFFICULTIES: QuestDifficulty[] = ['EASY', 'NORMAL', 'HARD', 'EPIC'];

const REQUIREMENT_OPTIONS: { value: QuestRequirement; label: string }[] = [
  { value: 'NONE', label: 'OFF (使わない)' },
  { value: 'OPTIONAL', label: '任意 (提出/受験はできるが完了に不要)' },
  { value: 'REQUIRED', label: '必須 (完了に必須)' },
];

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
  const [assignedCharacterId, setAssignedCharacterId] = useState<string | null>(
    initial?.assignedCharacterId ?? null,
  );
  const [documentRequirement, setDocumentRequirement] = useState<QuestRequirement>(
    initial?.documentRequirement ?? 'NONE',
  );
  const [testRequirement, setTestRequirement] = useState<QuestRequirement>(
    initial?.testRequirement ?? 'NONE',
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      difficulty,
      rewardXp,
      assignedCharacterId,
      documentRequirement,
      testRequirement,
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

      <CharacterPicker value={assignedCharacterId} onChange={setAssignedCharacterId} />

      <fieldset className="flex flex-col gap-3 rounded border border-gray-700 bg-rpg-card p-4">
        <legend className="px-2 text-sm text-gray-300">完了要件</legend>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-300">ドキュメント提出</span>
          <select
            value={documentRequirement}
            onChange={(e) => setDocumentRequirement(e.target.value as QuestRequirement)}
            className="rounded border border-gray-600 bg-rpg-bg px-3 py-2 text-white outline-none focus:border-rpg-accent"
            data-testid="quest-document-requirement"
          >
            {REQUIREMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-300">テスト (クイズ) — 機能本体は次リリース</span>
          <select
            value={testRequirement}
            onChange={(e) => setTestRequirement(e.target.value as QuestRequirement)}
            className="rounded border border-gray-600 bg-rpg-bg px-3 py-2 text-white outline-none focus:border-rpg-accent"
            data-testid="quest-test-requirement"
          >
            {REQUIREMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {testRequirement === 'REQUIRED' && (
            <span className="text-xs text-rpg-accent">
              ⚠ テスト機能は未実装。REQUIRED に設定するとそのクエストは完了不可になります。
            </span>
          )}
        </label>
      </fieldset>

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
