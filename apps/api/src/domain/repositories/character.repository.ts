import type { Character } from '@/domain/entities/character.entity';

export interface CharacterRepository {
  findById(id: string): Promise<Character | null>;
  findByEmployeeId(employeeId: string): Promise<Character | null>;
  save(character: Character): Promise<Character>;
}
