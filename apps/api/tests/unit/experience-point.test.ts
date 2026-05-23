import { describe, expect, it } from 'vitest';

import { ExperiencePoint } from '@/domain/value-objects/experience-point.vo';

describe('ExperiencePoint', () => {
  it('creates from non-negative integer', () => {
    expect(ExperiencePoint.create(0).toNumber()).toBe(0);
    expect(ExperiencePoint.create(100).toNumber()).toBe(100);
  });

  it('throws on negative or non-integer value', () => {
    expect(() => ExperiencePoint.create(-1)).toThrow();
    expect(() => ExperiencePoint.create(1.5)).toThrow();
  });

  it('adds two experience points', () => {
    const a = ExperiencePoint.create(50);
    const b = ExperiencePoint.create(75);
    expect(a.add(b).toNumber()).toBe(125);
  });

  it('calculates level from XP', () => {
    expect(ExperiencePoint.create(0).toLevel()).toBe(1);
    expect(ExperiencePoint.create(99).toLevel()).toBe(1);
    expect(ExperiencePoint.create(100).toLevel()).toBe(2);
    expect(ExperiencePoint.create(250).toLevel()).toBe(3);
    expect(ExperiencePoint.create(10000).toLevel()).toBeGreaterThanOrEqual(10);
  });

  it('returns XP needed to next level', () => {
    expect(ExperiencePoint.create(0).xpToNextLevel()).toBe(100);
    expect(ExperiencePoint.create(150).xpToNextLevel()).toBe(100);
  });
});
