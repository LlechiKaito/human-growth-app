export interface SkillNodeDto {
  id: string;
  code: string;
  name: string;
  description: string;
  tier: number;
  parentId: string | null;
  acquired: boolean;
}

export interface CharacterDetailDto {
  id: string;
  employeeId: string;
  name: string;
  className: string;
  experiencePoint: number;
  level: number;
  xpToNextLevel: number | null;
  skills: SkillNodeDto[];
}
