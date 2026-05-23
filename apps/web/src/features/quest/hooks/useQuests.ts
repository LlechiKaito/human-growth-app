import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  completeQuest,
  fetchQuests,
  type CompleteQuestResult,
  type QuestDto,
} from '@/features/quest/api';

export const useQuests = () =>
  useQuery<QuestDto[]>({
    queryKey: ['quests'],
    queryFn: fetchQuests,
  });

export const useCompleteQuest = (onSuccess?: (result: CompleteQuestResult) => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questId: string) => completeQuest(questId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      onSuccess?.(result);
    },
  });
};
