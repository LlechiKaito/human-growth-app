import { ExperiencePoint } from '@/domain/value-objects/experience-point.vo';

export type QuestDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EPIC';
export type QuestStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
export type QuestRequirement = 'NONE' | 'OPTIONAL' | 'REQUIRED';

export interface QuestProps {
  id: string;
  title: string;
  description: string;
  difficulty: QuestDifficulty;
  rewardXp: ExperiencePoint;
  status: QuestStatus;
  assignedCharacterId: string | null;
  documentRequirement: QuestRequirement;
  testRequirement: QuestRequirement;
  createdAt: Date;
  updatedAt: Date;
}

export class Quest {
  private constructor(private props: QuestProps) {}

  static create(props: QuestProps): Quest {
    return new Quest(props);
  }

  get id(): string {
    return this.props.id;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get difficulty(): QuestDifficulty {
    return this.props.difficulty;
  }

  get rewardXp(): ExperiencePoint {
    return this.props.rewardXp;
  }

  get status(): QuestStatus {
    return this.props.status;
  }

  get assignedCharacterId(): string | null {
    return this.props.assignedCharacterId;
  }

  get documentRequirement(): QuestRequirement {
    return this.props.documentRequirement;
  }

  get testRequirement(): QuestRequirement {
    return this.props.testRequirement;
  }

  isCompleted(): boolean {
    return this.props.status === 'COMPLETED';
  }

  complete(): Quest {
    return new Quest({
      ...this.props,
      status: 'COMPLETED',
      updatedAt: new Date(),
    });
  }
}
