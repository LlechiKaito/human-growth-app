'use client';

import { useRef, useState } from 'react';

import type { DocumentDto } from '@/features/document/api';
import {
  useDownloadDocument,
  useQuestDocuments,
  useUploadDocument,
} from '@/features/document/hooks/useDocuments';

const STATUS_LABEL: Record<DocumentDto['status'], string> = {
  PENDING: '承認待ち',
  APPROVED: '承認済み',
  REJECTED: '却下',
};

const STATUS_COLOR: Record<DocumentDto['status'], string> = {
  PENDING: 'text-rpg-accent',
  APPROVED: 'text-rpg-xp',
  REJECTED: 'text-rpg-health',
};

interface DocumentUploaderProps {
  questId: string;
}

export const DocumentUploader = ({ questId }: DocumentUploaderProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const list = useQuestDocuments(questId);
  const upload = useUploadDocument(questId);
  const download = useDownloadDocument();
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    setError(null);
    upload.mutate(file, {
      onError: (e) => setError((e as Error).message),
      onSuccess: () => {
        if (inputRef.current) inputRef.current.value = '';
      },
    });
  };

  return (
    <div className="rounded border border-gray-700 bg-rpg-bg p-3" data-testid={`doc-uploader-${questId}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300">書類添付</span>
        <label className="cursor-pointer rounded bg-rpg-accent px-3 py-1 text-xs font-semibold text-rpg-bg hover:opacity-90">
          ＋ ファイル選択
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            disabled={upload.isPending}
            data-testid={`doc-input-${questId}`}
          />
        </label>
      </div>
      {upload.isPending && <p className="text-xs text-gray-400">アップロード中...</p>}
      {error && <p className="text-xs text-rpg-health">{error}</p>}
      {list.isLoading ? (
        <p className="text-xs text-gray-500">読み込み中...</p>
      ) : list.data && list.data.length > 0 ? (
        <ul className="space-y-1 text-xs">
          {list.data.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => download.mutate(d.id)}
                className="truncate text-left text-gray-300 underline hover:text-rpg-accent"
                data-testid={`doc-${d.id}`}
              >
                📎 {d.filename}
              </button>
              <span className={`shrink-0 ${STATUS_COLOR[d.status]}`}>
                {STATUS_LABEL[d.status]}
                {d.status === 'REJECTED' && d.rejectionReason && (
                  <span className="ml-1 text-gray-500">({d.rejectionReason})</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">まだ書類はありません</p>
      )}
    </div>
  );
};
