'use client';

import { useId, useMemo, useState } from 'react';

import type { CharacterSummaryDto } from '@/features/admin/api';
import { useAdminCharacters } from '@/features/admin/hooks/useAdminCharacters';

const labelOf = (c: CharacterSummaryDto): string =>
  `${c.name} (Lv.${c.level} ${c.className}) — ${c.email}${c.department ? ` / ${c.department}` : ''}`;

interface CharacterPickerProps {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  label?: string;
  placeholder?: string;
}

/**
 * Native datalist combobox。タイプして候補から選ぶ。
 * - 入力テキストが既存キャラの表示文字列と一致したら、その id を返す
 * - 空にしたら null を返す (= 未割当)
 */
export const CharacterPicker = ({
  value,
  onChange,
  label = 'アサイン先キャラ (任意・空欄なら未割当)',
  placeholder = 'キャラ名 / メール / 部署で検索',
}: CharacterPickerProps) => {
  const datalistId = useId();
  const { data, isLoading } = useAdminCharacters();
  const characters = data ?? [];

  const labelToId = useMemo(
    () => new Map(characters.map((c) => [labelOf(c), c.id])),
    [characters],
  );
  const idToLabel = useMemo(
    () => new Map(characters.map((c) => [c.id, labelOf(c)])),
    [characters],
  );

  // 表示用テキスト: 親から渡された id を label に逆引き
  const [text, setText] = useState<string>(value ? (idToLabel.get(value) ?? '') : '');

  // characters がロードされた後、id があるのに text が空ならセット
  if (value && !text && idToLabel.has(value)) {
    setText(idToLabel.get(value)!);
  }

  const handleChange = (next: string) => {
    setText(next);
    if (next === '') {
      onChange(null);
      return;
    }
    const matched = labelToId.get(next);
    if (matched) {
      onChange(matched);
    }
    // マッチしないテキストは onChange しない (確定するまで待つ)
  };

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-300">{label}</span>
      <input
        type="text"
        list={datalistId}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={isLoading ? '読み込み中...' : placeholder}
        className="rounded border border-gray-600 bg-rpg-card px-3 py-2 text-white outline-none focus:border-rpg-accent"
        data-testid="character-picker"
      />
      <datalist id={datalistId}>
        {characters.map((c) => (
          <option key={c.id} value={labelOf(c)} />
        ))}
      </datalist>
      {text && !labelToId.has(text) && (
        <span className="text-xs text-rpg-health">
          リストから選択してください(自由入力はできません)
        </span>
      )}
    </label>
  );
};
