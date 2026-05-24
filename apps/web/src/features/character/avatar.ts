/**
 * DiceBear pixel-art アバター。
 * seed = `${className}-tier-${tier}` で進化段階ごとに別アバターが返る。
 * 同じ seed なら常に同じ画像 (deterministic) なので、Lv が同じならアバター固定。
 */

const TIER_THRESHOLDS = [1, 3, 5, 7, 10] as const;

/**
 * Lv から進化 Tier (0〜4) を返す。
 * Lv 1-2 → 0 / Lv 3-4 → 1 / Lv 5-6 → 2 / Lv 7-9 → 3 / Lv 10+ → 4
 */
export const getAvatarTier = (level: number): number => {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (level >= TIER_THRESHOLDS[i]!) return i;
  }
  return 0;
};

export const TIER_LABELS = ['見習い', '駆け出し', '一人前', '熟練', '伝説'] as const;

export const getTierLabel = (level: number): string =>
  TIER_LABELS[getAvatarTier(level)] ?? TIER_LABELS[0];

export const getAvatarUrl = (
  className: string,
  level: number,
  size = 120,
): string => {
  const tier = getAvatarTier(level);
  const seed = `${className}-tier-${tier}`;
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(
    seed,
  )}&size=${size}`;
};
