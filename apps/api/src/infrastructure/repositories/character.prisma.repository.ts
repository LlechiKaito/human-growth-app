import type { PrismaClient } from '@prisma/client';

import { Character } from '@/domain/entities/character.entity';
import type { CharacterRepository } from '@/domain/repositories/character.repository';
import { ExperiencePoint } from '@/domain/value-objects/experience-point.vo';

export class CharacterPrismaRepository implements CharacterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Character | null> {
    const row = await this.prisma.character.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByEmployeeId(employeeId: string): Promise<Character | null> {
    const row = await this.prisma.character.findUnique({ where: { employeeId } });
    return row ? this.toEntity(row) : null;
  }

  async save(character: Character): Promise<Character> {
    const row = await this.prisma.character.upsert({
      where: { id: character.id },
      create: {
        id: character.id,
        employeeId: character.employeeId,
        name: character.name,
        className: character.className,
        experiencePoint: character.experience.toNumber(),
      },
      update: {
        name: character.name,
        className: character.className,
        experiencePoint: character.experience.toNumber(),
      },
    });
    return this.toEntity(row);
  }

  private toEntity(row: {
    id: string;
    employeeId: string;
    name: string;
    className: string;
    experiencePoint: number;
    createdAt: Date;
    updatedAt: Date;
  }): Character {
    return Character.create({
      id: row.id,
      employeeId: row.employeeId,
      name: row.name,
      className: row.className,
      experience: ExperiencePoint.create(row.experiencePoint),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
