import { useQuery } from '@tanstack/react-query';

import { fetchQuests, type QuestDto } from '@/features/quest/api';

export const useQuests = () =>
  useQuery<QuestDto[]>({
    queryKey: ['quests'],
    queryFn: fetchQuests,
  });
