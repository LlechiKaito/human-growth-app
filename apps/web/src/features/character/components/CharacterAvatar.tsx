import { getAvatarUrl, getTierLabel } from '@/features/character/avatar';

interface CharacterAvatarProps {
  className: string;
  level: number;
  size?: number;
  showLabel?: boolean;
  testId?: string;
}

/**
 * DiceBear pixel-art ベースのキャラクターアバター。
 * className (ジョブ) と level (進化 tier) で deterministic に決まる。
 */
export const CharacterAvatar = ({
  className,
  level,
  size = 120,
  showLabel = false,
  testId,
}: CharacterAvatarProps) => {
  const src = getAvatarUrl(className, level, size);
  const label = getTierLabel(level);
  return (
    <div className="flex flex-col items-center gap-1" data-testid={testId}>
      <img
        src={src}
        alt={`${className} Lv.${level} (${label})`}
        width={size}
        height={size}
        className="rounded-lg border border-rpg-accent bg-rpg-card"
        style={{ imageRendering: 'pixelated' }}
      />
      {showLabel && (
        <span className="text-xs text-gray-400">
          {label} / {className}
        </span>
      )}
    </div>
  );
};
