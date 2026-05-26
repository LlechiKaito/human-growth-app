'use client';

import {
  useMarkVideoViewed,
  useQuestVideo,
} from '@/features/quest-video/hooks';

interface VideoModalProps {
  questId: string;
  open: boolean;
  onClose: () => void;
}

export const VideoModal = ({ questId, open, onClose }: VideoModalProps) => {
  const videoQuery = useQuestVideo(questId, open);
  const markViewed = useMarkVideoViewed(questId);

  if (!open) return null;

  const video = videoQuery.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-gray-700 bg-rpg-bg p-6"
        data-testid="video-modal"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">動画を見る</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="close"
          >
            ✕
          </button>
        </div>

        {videoQuery.isLoading && <p className="mt-4 text-gray-400">読み込み中...</p>}
        {videoQuery.isError && (
          <p className="mt-4 text-rpg-accent">このクエストには動画が設定されていません。</p>
        )}

        {video && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-gray-300">{video.filename}</p>
            <video
              controls
              src={video.url}
              className="w-full rounded bg-black"
              data-testid="video-player"
            >
              <track kind="captions" />
            </video>
            <div className="flex items-center justify-between gap-2">
              {video.viewed ? (
                <span className="text-sm text-rpg-xp">✓ 視聴済み</span>
              ) : (
                <span className="text-sm text-gray-400">
                  最後まで見たら「視聴しました」を押してください
                </span>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-rpg-card"
                >
                  閉じる
                </button>
                {!video.viewed && (
                  <button
                    type="button"
                    onClick={() => markViewed.mutate()}
                    disabled={markViewed.isPending}
                    className="rounded bg-rpg-accent px-4 py-2 text-sm font-semibold text-rpg-bg hover:opacity-90 disabled:opacity-50"
                    data-testid="mark-video-viewed"
                  >
                    {markViewed.isPending ? '記録中...' : '視聴しました'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
