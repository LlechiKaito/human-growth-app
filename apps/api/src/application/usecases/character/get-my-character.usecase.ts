import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';

import type { CharacterDetailDto, SkillNodeDto } from '@/application/dto/character.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { Character } from '@/domain/entities/character.entity';
import { DomainError } from '@/domain/errors/domain-errors';
import type { CharacterRepository } from '@/domain/repositories/character.repository';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';
import { ExperiencePoint } from '@/domain/value-objects/experience-point.vo';

const CLASS_BY_DEPARTMENT: Record<string, string> = {
  Engineering: 'Engineer',
  Design: 'Artificer',
  Sales: 'Bard',
  HR: 'Cleric',
  Marketing: 'Ranger',
};

const DEFAULT_CLASS = 'Adventurer';

export class GetMyCharacterUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly employees: EmployeeRepository,
    private readonly characters: CharacterRepository,
  ) {}

  async execute(cognitoSub: string): Promise<CharacterDetailDto> {
    const employee = await this.employees.findByCognitoSub(cognitoSub);
    if (!employee) {
      throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);
    }

    let character = await this.characters.findByEmployeeId(employee.id);
    if (!character) {
      character = await this.createDefaultCharacter(employee.id, employee.displayName, employee.department);
    }

    const skills = await this.prisma.skill.findMany({ orderBy: [{ tier: 'asc' }, { code: 'asc' }] });
    const acquiredIds = new Set(
      (
        await this.prisma.characterSkill.findMany({
          where: { characterId: character.id },
          select: { skillId: true },
        })
      ).map((s) => s.skillId),
    );

    const skillNodes: SkillNodeDto[] = skills.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      tier: s.tier,
      parentId: s.parentId,
      acquired: acquiredIds.has(s.id),
    }));

    return {
      id: character.id,
      employeeId: character.employeeId,
      name: character.name,
      className: character.className,
      experiencePoint: character.experience.toNumber(),
      level: character.level,
      xpToNextLevel: character.experience.xpToNextLevel(),
      skills: skillNodes,
    };
  }

  private async createDefaultCharacter(
    employeeId: string,
    displayName: string,
    department: string | null,
  ): Promise<Character> {
    const now = new Date();
    const className = department ? (CLASS_BY_DEPARTMENT[department] ?? DEFAULT_CLASS) : DEFAULT_CLASS;
    const character = Character.create({
      id: randomUUID(),
      employeeId,
      name: displayName,
      className,
      experience: ExperiencePoint.create(0),
      createdAt: now,
      updatedAt: now,
    });
    return this.characters.save(character);
  }
}
