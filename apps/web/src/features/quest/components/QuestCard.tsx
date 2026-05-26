import { useState } from 'react';

import { DocumentUploader } from '@/features/document/components/DocumentUploader';
import { useQuestDocuments } from '@/features/document/hooks/useDocuments';
import type { QuestDto, QuestRequirement } from '@/features/quest/api';
import { TestModal } from '@/features/quest-test/components/TestModal';
import { VideoModal } from '@/features/quest-video/components/VideoModal';

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

const REQUIREMENT_BADGE_CLASS: Record<QuestRequirement, string> = {
  NONE: '',
  OPTIONAL: 'bg-gray-700 text-gray-200',
  REQUIRED: 'bg-rpg-accent text-rpg-bg',
};

interface QuestCardProps {
  quest: QuestDto;
  onComplete: (questId: string) => void;
  isCompleting: boolean;
}

export const QuestCard = ({ quest, onComplete, isCompleting }: QuestCardProps) => {
  const isCompleted = quest.status === 'COMPLETED';
  const showDocuments = quest.documentRequirement !== 'NONE';
  const showTest = quest.testRequirement !== 'NONE';
  const showVideo = quest.videoRequirement !== 'NONE';
  const [testOpen, setTestOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  // documentRequirement=REQUIRED のとき、APPROVED な書類が無いと完了不可
  const docsQuery = useQuestDocuments(quest.id);
  const hasApprovedDoc = (docsQuery.data ?? []).some((d) => d.status === 'APPROVED');
  const docGateBlocked = quest.documentRequirement === 'REQUIRED' && !hasApprovedDoc;
  const testGateBlocked = quest.testRequirement === 'REQUIRED' && !quest.hasPassedTest;
  const videoGateBlocked = quest.videoRequirement === 'REQUIRED' && !quest.hasViewedVideo;

  const blocked = docGateBlocked || testGateBlocked || videoGateBlocked;

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
          <div className="flex flex-wrap items-center gap-2">
            <span className={DIFFICULTY_COLOR[quest.difficulty]}>◆</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {quest.difficulty}
            </span>
            <span className="text-xs text-gray-500">— {STATUS_LABEL[quest.status]}</span>
            {quest.documentRequirement !== 'NONE' && (
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-semibold ${REQUIREMENT_BADGE_CLASS[quest.documentRequirement]}`}
              >
                書類{quest.documentRequirement === 'REQUIRED' ? '必須' : '任意'}
              </span>
            )}
            {quest.testRequirement !== 'NONE' && (
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-semibold ${REQUIREMENT_BADGE_CLASS[quest.testRequirement]}`}
              >
                テスト{quest.testRequirement === 'REQUIRED' ? '必須' : '任意'}
              </span>
            )}
            {quest.videoRequirement !== 'NONE' && (
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-semibold ${REQUIREMENT_BADGE_CLASS[quest.videoRequirement]}`}
              >
                動画{quest.videoRequirement === 'REQUIRED' ? '必須' : '任意'}
              </span>
            )}
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
        <>
          <button
            type="button"
            onClick={() => onComplete(quest.id)}
            disabled={isCompleting || blocked}
            className="mt-3 w-full rounded bg-rpg-accent px-3 py-2 text-sm font-semibold text-rpg-bg hover:opacity-90 disabled:opacity-50"
            data-testid={`complete-${quest.id}`}
          >
            {isCompleting ? '完了処理中...' : 'クエストを完了する'}
          </button>
          {docGateBlocked && (
            <p className="mt-1 text-xs text-rpg-accent">
              ※ 承認済みの書類を 1 件以上アップロードしてください
            </p>
          )}
          {testGateBlocked && (
            <p className="mt-1 text-xs text-rpg-accent">
              ※ テストに合格してください
            </p>
          )}
          {videoGateBlocked && (
            <p className="mt-1 text-xs text-rpg-accent">
              ※ 動画を視聴してください
            </p>
          )}
        </>
      )}
      {showTest && !isCompleted && (
        <button
          type="button"
          onClick={() => setTestOpen(true)}
          className="mt-2 w-full rounded border border-rpg-accent px-3 py-2 text-sm font-semibold text-rpg-accent hover:bg-rpg-accent hover:text-rpg-bg"
          data-testid={`open-test-${quest.id}`}
        >
          {quest.hasPassedTest ? 'テスト合格済み (もう一度受ける)' : 'テストを受ける'}
        </button>
      )}
      {showTest && (
        <TestModal questId={quest.id} open={testOpen} onClose={() => setTestOpen(false)} />
      )}
      {showVideo && !isCompleted && (
        <button
          type="button"
          onClick={() => setVideoOpen(true)}
          className="mt-2 w-full rounded border border-blue-400 px-3 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-400 hover:text-rpg-bg"
          data-testid={`open-video-${quest.id}`}
        >
          {quest.hasViewedVideo ? '動画 (視聴済み、もう一度見る)' : '動画を見る'}
        </button>
      )}
      {showVideo && (
        <VideoModal questId={quest.id} open={videoOpen} onClose={() => setVideoOpen(false)} />
      )}
      {showDocuments && (
        <div className="mt-3">
          <DocumentUploader questId={quest.id} />
        </div>
      )}
    </div>
  );
};
