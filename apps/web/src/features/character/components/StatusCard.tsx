import type { CharacterDetailDto } from '@/features/character/api';
import { CharacterAvatar } from '@/features/character/components/CharacterAvatar';

export const StatusCard = ({ character }: { character: CharacterDetailDto }) => {
  const xpInLevel = character.xpToNextLevel
    ? character.experiencePoint % (character.experiencePoint + character.xpToNextLevel)
    : character.experiencePoint;
  const progress = character.xpToNextLevel
    ? Math.max(0, Math.min(100, (xpInLevel / (xpInLevel + character.xpToNextLevel)) * 100))
    : 100;

  return (
    <div className="rounded-lg border border-gray-700 bg-rpg-card p-6">
      <div className="flex items-start gap-6">
        <CharacterAvatar
          className={character.className}
          level={character.level}
          size={120}
          showLabel
          testId="status-avatar"
        />
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white" data-testid="character-name">
                {character.name}
              </h2>
              <p className="text-sm text-gray-400">{character.className}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Level</p>
              <p className="text-3xl font-bold text-rpg-accent" data-testid="character-level">
                {character.level}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-gray-400">
              <span>XP {character.experiencePoint}</span>
              <span data-testid="xp-to-next">
                {character.xpToNextLevel ? `次のレベルまで ${character.xpToNextLevel}` : 'MAX'}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded bg-gray-800">
              <div
                className="h-full bg-rpg-xp transition-all"
                style={{ width: `${progress}%` }}
                data-testid="xp-bar"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
