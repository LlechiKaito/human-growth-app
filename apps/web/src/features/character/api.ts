import { httpClient } from '@/lib/http-client';

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

export const fetchMyCharacter = async (): Promise<CharacterDetailDto> => {
  const { data } = await httpClient.get<CharacterDetailDto>('/api/characters/me');
  return data;
};
