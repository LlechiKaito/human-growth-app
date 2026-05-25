'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import { AdminGuard } from '@/features/admin/components/AdminGuard';
import {
  useAdminQuestTest,
  useAdminUpsertQuestTest,
} from '@/features/quest-test/hooks';

interface ChoiceDraft {
  text: string;
  isCorrect: boolean;
}

interface QuestionDraft {
  text: string;
  choices: ChoiceDraft[];
}

const emptyChoice = (): ChoiceDraft => ({ text: '', isCorrect: false });
const emptyQuestion = (): QuestionDraft => ({
  text: '',
  choices: [emptyChoice(), emptyChoice()],
});

export default function AdminQuestTestPage() {
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
  const existing = useAdminQuestTest(id);
  const upsert = useAdminUpsertQuestTest(id);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  useEffect(() => {
    if (existing.data) {
      setQuestions(
        existing.data.questions.length
          ? existing.data.questions.map((q) => ({
              text: q.text,
              choices: q.choices.map((c) => ({ text: c.text, isCorrect: c.isCorrect })),
            }))
          : [emptyQuestion()],
      );
    }
  }, [existing.data]);

  if (!id) return <p className="text-rpg-health">ID が指定されていません</p>;
  if (existing.isLoading) return <p className="text-gray-400">読み込み中...</p>;

  const addQuestion = () => {
    if (questions.length >= 20) return;
    setQuestions((prev) => [...prev, emptyQuestion()]);
  };
  const removeQuestion = (qi: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== qi));
  };
  const updateQuestionText = (qi: number, text: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, text } : q)));
  };
  const addChoice = (qi: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi && q.choices.length < 4 ? { ...q, choices: [...q.choices, emptyChoice()] } : q,
      ),
    );
  };
  const removeChoice = (qi: number, ci: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi && q.choices.length > 2
          ? { ...q, choices: q.choices.filter((_, j) => j !== ci) }
          : q,
      ),
    );
  };
  const updateChoiceText = (qi: number, ci: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi
          ? { ...q, choices: q.choices.map((c, j) => (j === ci ? { ...c, text } : c)) }
          : q,
      ),
    );
  };
  const selectCorrect = (qi: number, ci: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi
          ? { ...q, choices: q.choices.map((c, j) => ({ ...c, isCorrect: j === ci })) }
          : q,
      ),
    );
  };

  const submit = () => {
    upsert.mutate(questions, {
      onSuccess: () => router.push(ROUTES.ADMIN_QUEST_EDIT(id)),
    });
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">テスト (クイズ) 編集</h1>
      <p className="text-sm text-gray-400">
        単一選択のみ。設問は最大 20、選択肢は 1 設問あたり 2〜4。
        合格基準は<strong className="text-rpg-accent">全問正解</strong>です。
      </p>

      {questions.map((q, qi) => (
        <fieldset
          key={qi}
          className="flex flex-col gap-3 rounded border border-gray-700 bg-rpg-card p-4"
        >
          <legend className="px-2 text-sm text-gray-300">問 {qi + 1}</legend>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-300">設問</span>
            <input
              type="text"
              value={q.text}
              maxLength={500}
              onChange={(e) => updateQuestionText(qi, e.target.value)}
              className="rounded border border-gray-600 bg-rpg-bg px-3 py-2 text-white outline-none focus:border-rpg-accent"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-gray-300">選択肢 (正解を 1 つ選ぶ)</span>
            {q.choices.map((c, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={c.isCorrect}
                  onChange={() => selectCorrect(qi, ci)}
                />
                <input
                  type="text"
                  value={c.text}
                  maxLength={200}
                  placeholder={`選択肢 ${ci + 1}`}
                  onChange={(e) => updateChoiceText(qi, ci, e.target.value)}
                  className="flex-1 rounded border border-gray-600 bg-rpg-bg px-2 py-1 text-sm text-white outline-none focus:border-rpg-accent"
                />
                {q.choices.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeChoice(qi, ci)}
                    className="text-xs text-gray-400 hover:text-rpg-accent"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
            {q.choices.length < 4 && (
              <button
                type="button"
                onClick={() => addChoice(qi)}
                className="self-start text-xs text-gray-400 hover:text-white"
              >
                + 選択肢を追加
              </button>
            )}
          </div>

          {questions.length > 1 && (
            <button
              type="button"
              onClick={() => removeQuestion(qi)}
              className="self-end text-xs text-rpg-accent hover:underline"
            >
              この設問を削除
            </button>
          )}
        </fieldset>
      ))}

      <div className="flex gap-2">
        {questions.length < 20 && (
          <button
            type="button"
            onClick={addQuestion}
            className="rounded border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-rpg-card"
          >
            + 設問を追加
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={upsert.isPending}
          className="rounded bg-rpg-accent px-4 py-2 text-sm font-semibold text-rpg-bg hover:opacity-90 disabled:opacity-50"
        >
          {upsert.isPending ? '保存中...' : '保存する'}
        </button>
      </div>

      {upsert.isError && (
        <p className="text-sm text-rpg-accent">
          保存できませんでした: {(upsert.error as Error).message}
        </p>
      )}
    </div>
  );
};
