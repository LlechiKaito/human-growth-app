import { useQuery } from '@tanstack/react-query';

import { fetchMyCharacter, type CharacterDetailDto } from '@/features/character/api';

export const useMyCharacter = () =>
  useQuery<CharacterDetailDto>({
    queryKey: ['character', 'me'],
    queryFn: fetchMyCharacter,
  });
