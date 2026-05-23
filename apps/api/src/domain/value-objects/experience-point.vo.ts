import { LEVEL_XP_THRESHOLDS, MAX_LEVEL } from '@/constants/xp-table';

export class ExperiencePoint {
  private constructor(private readonly value: number) {}

  static create(value: number): ExperiencePoint {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`ExperiencePoint must be a non-negative integer, got: ${value}`);
    }
    return new ExperiencePoint(value);
  }

  toNumber(): number {
    return this.value;
  }

  add(other: ExperiencePoint): ExperiencePoint {
    return new ExperiencePoint(this.value + other.value);
  }

  toLevel(): number {
    for (let i = LEVEL_XP_THRESHOLDS.length - 1; i >= 0; i--) {
      if (this.value >= LEVEL_XP_THRESHOLDS[i]!) {
        return i + 1;
      }
    }
    return 1;
  }

  xpToNextLevel(): number | null {
    const currentLevel = this.toLevel();
    if (currentLevel >= MAX_LEVEL) return null;
    return LEVEL_XP_THRESHOLDS[currentLevel]! - this.value;
  }
}
