'use client';

import { useState } from 'react';

import { AdminGuard } from '@/features/admin/components/AdminGuard';
import {
  useAdminPendingDocuments,
  useApproveDocument,
  useDownloadDocument,
  useRejectDocument,
} from '@/features/document/hooks/useDocuments';

export default function AdminDocumentsPage() {
  return (
    <AdminGuard>
      <Content />
    </AdminGuard>
  );
}

const Content = () => {
  const list = useAdminPendingDocuments();
  const approve = useApproveDocument();
  const reject = useRejectDocument();
  const download = useDownloadDocument();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  if (list.isLoading) return <p className="text-gray-400">読み込み中...</p>;
  if (list.isError || !list.data) return <p className="text-rpg-health">取得失敗</p>;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">承認待ち書類</h1>
        <span className="text-sm text-gray-400">{list.data.length} 件</span>
      </header>

      {list.data.length === 0 && (
        <p className="text-sm text-gray-500">承認待ちはありません</p>
      )}

      <ul className="flex flex-col gap-3">
        {list.data.map((d) => (
          <li
            key={d.id}
            className="rounded-lg border border-gray-700 bg-rpg-card p-4"
            data-testid={`pending-${d.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm text-gray-400">クエスト: {d.questId.slice(0, 8)}…</p>
                <button
                  type="button"
                  onClick={() => download.mutate(d.id)}
                  className="mt-1 text-left font-semibold text-white underline hover:text-rpg-accent"
                >
                  📎 {d.filename}
                </button>
                <p className="text-xs text-gray-500">
                  {(d.sizeBytes / 1024).toFixed(1)} KB · {d.mimeType} · {new Date(d.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  type="button"
                  onClick={() => approve.mutate(d.id)}
                  disabled={approve.isPending}
                  className="rounded bg-rpg-xp px-3 py-1 text-xs font-semibold text-rpg-bg hover:opacity-90 disabled:opacity-50"
                  data-testid={`approve-${d.id}`}
                >
                  承認
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(d.id);
                    setReason('');
                  }}
                  className="rounded border border-rpg-health px-3 py-1 text-xs font-semibold text-rpg-health hover:bg-rpg-health hover:text-rpg-bg"
                  data-testid={`reject-${d.id}`}
                >
                  却下
                </button>
              </div>
            </div>
            {rejectingId === d.id && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="却下理由 (必須)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="flex-1 rounded border border-gray-600 bg-rpg-bg px-2 py-1 text-sm text-white outline-none focus:border-rpg-accent"
                  data-testid={`reject-reason-${d.id}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!reason.trim()) return;
                    reject.mutate(
                      { id: d.id, reason: reason.trim() },
                      { onSuccess: () => setRejectingId(null) },
                    );
                  }}
                  disabled={reject.isPending || !reason.trim()}
                  className="rounded bg-rpg-health px-3 py-1 text-xs font-semibold text-rpg-bg hover:opacity-90 disabled:opacity-50"
                  data-testid={`reject-confirm-${d.id}`}
                >
                  確定
                </button>
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="rounded border border-gray-600 px-3 py-1 text-xs text-gray-300"
                >
                  キャンセル
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
