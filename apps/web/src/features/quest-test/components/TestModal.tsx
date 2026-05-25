'use client';

import { useEffect, useState } from 'react';

import {
  useQuestTest,
  useSubmitQuestTest,
} from '@/features/quest-test/hooks';

interface TestModalProps {
  questId: string;
  open: boolean;
  onClose: () => void;
}

export const TestModal = ({ questId, open, onClose }: TestModalProps) => {
  const testQuery = useQuestTest(questId, open);
  const submit = useSubmitQuestTest(questId);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setAnswers({});
      submit.reset();
    }
    // submit を依存に含めると無限ループするので意図的に除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const questions = testQuery.data?.questions ?? [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);
  const result = submit.data;

  const handleSubmit = () => {
    submit.mutate(
      questions.map((q) => ({ questionId: q.id, choiceId: answers[q.id] })),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-700 bg-rpg-bg p-6"
        data-testid="test-modal"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">テストを受ける</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="close"
          >
            ✕
          </button>
        </div>

        {testQuery.isLoading && <p className="mt-4 text-gray-400">読み込み中...</p>}
        {testQuery.isError && (
          <p className="mt-4 text-rpg-accent">
            このクエストにはテストが設定されていません。
          </p>
        )}

        {result && (
          <div
            className={`mt-4 rounded p-4 ${
              result.passed ? 'bg-rpg-xp/20 text-rpg-xp' : 'bg-rpg-accent/20 text-rpg-accent'
            }`}
            data-testid="test-result"
          >
            <p className="text-lg font-bold">
              {result.passed ? '🎉 合格' : '😢 不合格'} — {result.score} / {result.total} 問正解
            </p>
            {!result.passed && (
              <p className="mt-1 text-sm">
                全問正解で合格です。もう一度挑戦してください。
              </p>
            )}
          </div>
        )}

        {!result && testQuery.data && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="mt-4 flex flex-col gap-6"
          >
            {questions.map((q, qi) => (
              <fieldset key={q.id} className="rounded border border-gray-700 p-4">
                <legend className="px-2 text-sm text-gray-400">問 {qi + 1}</legend>
                <p className="text-white">{q.text}</p>
                <div className="mt-3 flex flex-col gap-2">
                  {q.choices.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-rpg-card"
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={c.id}
                        checked={answers[q.id] === c.id}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
                        data-testid={`choice-${q.id}-${c.id}`}
                      />
                      <span className="text-sm text-white">{c.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-rpg-card"
              >
                閉じる
              </button>
              <button
                type="submit"
                disabled={!allAnswered || submit.isPending}
                className="rounded bg-rpg-accent px-4 py-2 text-sm font-semibold text-rpg-bg hover:opacity-90 disabled:opacity-50"
                data-testid="test-submit"
              >
                {submit.isPending ? '採点中...' : '提出する'}
              </button>
            </div>
          </form>
        )}

        {result && (
          <div className="mt-4 flex justify-end gap-2">
            {!result.passed && (
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  submit.reset();
                }}
                className="rounded bg-rpg-accent px-4 py-2 text-sm font-semibold text-rpg-bg hover:opacity-90"
                data-testid="test-retry"
              >
                もう一度
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-rpg-card"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
