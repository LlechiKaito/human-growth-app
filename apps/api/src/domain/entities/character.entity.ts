import { ExperiencePoint } from '@/domain/value-objects/experience-point.vo';

export interface CharacterProps {
  id: string;
  employeeId: string;
  name: string;
  className: string;
  experience: ExperiencePoint;
  createdAt: Date;
  updatedAt: Date;
}

export class Character {
  private constructor(private props: CharacterProps) {}

  static create(props: CharacterProps): Character {
    return new Character(props);
  }

  get id(): string {
    return this.props.id;
  }

  get employeeId(): string {
    return this.props.employeeId;
  }

  get name(): string {
    return this.props.name;
  }

  get className(): string {
    return this.props.className;
  }

  get experience(): ExperiencePoint {
    return this.props.experience;
  }

  get level(): number {
    return this.props.experience.toLevel();
  }

  gainExperience(gained: ExperiencePoint): Character {
    return new Character({
      ...this.props,
      experience: this.props.experience.add(gained),
      updatedAt: new Date(),
    });
  }
}
