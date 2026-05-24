import { useQuery } from '@tanstack/react-query';

import { adminListCharacters, type CharacterSummaryDto } from '@/features/admin/api';

export const useAdminCharacters = () =>
  useQuery<CharacterSummaryDto[]>({
    queryKey: ['admin', 'characters'],
    queryFn: adminListCharacters,
  });
