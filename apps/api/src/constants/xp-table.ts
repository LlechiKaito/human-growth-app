/**
 * 経験値テーブル: 各レベルに必要な累計XP
 * Level 1: 0 XP / Level 2: 100 XP / Level 3: 250 XP ...
 */
export const LEVEL_XP_THRESHOLDS: readonly number[] = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250,
];

export const MAX_LEVEL = LEVEL_XP_THRESHOLDS.length;
