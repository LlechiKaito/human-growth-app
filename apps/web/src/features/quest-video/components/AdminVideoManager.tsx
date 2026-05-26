'use client';

import { useRef, useState } from 'react';

import {
  useAdminDeleteQuestVideo,
  useAdminQuestVideo,
  useAdminUploadQuestVideo,
} from '@/features/quest-video/hooks';

interface AdminVideoManagerProps {
  questId: string;
}

const ALLOWED_MIMES = ['video/mp4', 'video/webm'];
const MAX_SIZE_BYTES = 100 * 1024 * 1024;

export const AdminVideoManager = ({ questId }: AdminVideoManagerProps) => {
  const current = useAdminQuestVideo(questId);
  const upload = useAdminUploadQuestVideo(questId);
  const remove = useAdminDeleteQuestVideo(questId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setValidationError(null);
    if (!ALLOWED_MIMES.includes(file.type)) {
      setValidationError('mp4 / webm 形式のみ対応しています');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setValidationError('サイズが 100MB を超えています');
      return;
    }
    upload.mutate(file, {
      onSuccess: () => {
        if (inputRef.current) inputRef.current.value = '';
      },
    });
  };

  return (
    <fieldset className="flex flex-col gap-3 rounded border border-gray-700 bg-rpg-card p-4">
      <legend className="px-2 text-sm text-gray-300">動画 (mp4 / webm, 最大 100MB)</legend>

      {current.isLoading && <p className="text-sm text-gray-400">読み込み中...</p>}

      {current.data && (
        <div className="flex items-center justify-between gap-2 rounded bg-rpg-bg p-3">
          <div className="flex-1">
            <p className="text-sm text-white">{current.data.filename}</p>
            <p className="text-xs text-gray-400">
              {(current.data.sizeBytes / 1024 / 1024).toFixed(2)} MB · {current.data.mimeType}
            </p>
          </div>
          <button
            type="button"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            className="rounded border border-rpg-accent px-3 py-1 text-xs text-rpg-accent hover:bg-rpg-accent hover:text-rpg-bg disabled:opacity-50"
          >
            {remove.isPending ? '削除中...' : '削除'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="text-sm text-gray-300"
          data-testid="video-file-input"
        />
        {upload.isPending && <p className="text-xs text-gray-400">アップロード中...</p>}
        {validationError && <p className="text-xs text-rpg-accent">{validationError}</p>}
        {upload.isError && (
          <p className="text-xs text-rpg-accent">
            アップロード失敗: {(upload.error as Error).message}
          </p>
        )}
      </div>
    </fieldset>
  );
};
