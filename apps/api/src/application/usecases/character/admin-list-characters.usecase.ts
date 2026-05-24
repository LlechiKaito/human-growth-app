import type { PrismaClient } from '@prisma/client';

import type { CharacterSummaryDto } from '@/application/dto/character.dto';
import type { CharacterRepository } from '@/domain/repositories/character.repository';

/**
 * 管理者専用: 全キャラ一覧 + Employee の email / department を join して返す
 */
export class AdminListCharactersUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly characters: CharacterRepository,
  ) {}

  async execute(): Promise<CharacterSummaryDto[]> {
    const all = await this.characters.listAll();
    if (all.length === 0) return [];

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: all.map((c) => c.employeeId) } },
      select: { id: true, email: true, department: true },
    });
    const empById = new Map(employees.map((e) => [e.id, e]));

    return all.map((c) => {
      const emp = empById.get(c.employeeId);
      return {
        id: c.id,
        name: c.name,
        className: c.className,
        level: c.level,
        email: emp?.email ?? '',
        department: emp?.department ?? null,
      };
    });
  }
}
