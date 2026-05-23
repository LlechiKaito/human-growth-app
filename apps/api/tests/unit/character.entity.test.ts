import { describe, expect, it } from 'vitest';

import { Character } from '@/domain/entities/character.entity';
import { ExperiencePoint } from '@/domain/value-objects/experience-point.vo';

const baseProps = {
  id: 'char-1',
  employeeId: 'emp-1',
  name: 'Hero',
  className: 'Engineer',
  experience: ExperiencePoint.create(50),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('Character', () => {
  it('exposes basic fields', () => {
    const character = Character.create(baseProps);
    expect(character.id).toBe('char-1');
    expect(character.name).toBe('Hero');
    expect(character.className).toBe('Engineer');
    expect(character.level).toBe(1);
  });

  it('gainExperience returns a new instance with added xp', () => {
    const character = Character.create(baseProps);
    const gained = character.gainExperience(ExperiencePoint.create(60));
    expect(character.experience.toNumber()).toBe(50);
    expect(gained.experience.toNumber()).toBe(110);
    expect(gained.level).toBe(2);
  });

  it('level reflects current xp', () => {
    const character = Character.create({
      ...baseProps,
      experience: ExperiencePoint.create(500),
    });
    expect(character.level).toBeGreaterThanOrEqual(3);
  });
});
