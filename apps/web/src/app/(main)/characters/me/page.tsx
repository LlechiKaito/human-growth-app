'use client';

import { StatusCard } from '@/features/character/components/StatusCard';
import { SkillTree } from '@/features/character/components/SkillTree';
import { useMyCharacter } from '@/features/character/hooks/useMyCharacter';

export default function MyCharacterPage() {
  const { data, isLoading, isError } = useMyCharacter();

  if (isLoading) return <p className="text-gray-400">読み込み中...</p>;
  if (isError || !data) return <p className="text-rpg-health">キャラクターを取得できませんでした</p>;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <StatusCard character={data} />
      <section>
        <h3 className="mb-3 text-lg font-semibold text-white">スキルツリー</h3>
        <SkillTree skills={data.skills} />
      </section>
    </div>
  );
}
