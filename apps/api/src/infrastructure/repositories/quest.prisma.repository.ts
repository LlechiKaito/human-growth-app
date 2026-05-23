import type { PrismaClient } from '@prisma/client';

import { Quest, type QuestDifficulty, type QuestStatus } from '@/domain/entities/quest.entity';
import type { QuestRepository } from '@/domain/repositories/quest.repository';
import { ExperiencePoint } from '@/domain/value-objects/experience-point.vo';

type QuestRow = {
  id: string;
  title: string;
  description: string;
  difficulty: QuestDifficulty;
  rewardXp: number;
  status: QuestStatus;
  assignedCharacterId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class QuestPrismaRepository implements QuestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Quest | null> {
    const row = await this.prisma.quest.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async listAll(): Promise<Quest[]> {
    const rows = await this.prisma.quest.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((row) => this.toEntity(row));
  }

  async listAssignedTo(characterId: string): Promise<Quest[]> {
    const rows = await this.prisma.quest.findMany({
      where: {
        OR: [{ assignedCharacterId: characterId }, { assignedCharacterId: null }],
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.toEntity(row));
  }

  async save(quest: Quest): Promise<Quest> {
    const row = await this.prisma.quest.update({
      where: { id: quest.id },
      data: {
        status: quest.status,
        assignedCharacterId: quest.assignedCharacterId,
        completedAt: quest.status === 'COMPLETED' ? new Date() : null,
      },
    });
    return this.toEntity(row);
  }

  private toEntity(row: QuestRow): Quest {
    return Quest.create({
      id: row.id,
      title: row.title,
      description: row.description,
      difficulty: row.difficulty,
      rewardXp: ExperiencePoint.create(row.rewardXp),
      status: row.status,
      assignedCharacterId: row.assignedCharacterId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
