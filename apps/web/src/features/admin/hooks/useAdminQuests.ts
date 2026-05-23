import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adminCreateQuest,
  adminDeleteQuest,
  adminListQuests,
  adminUpdateQuest,
  type QuestUpsertInput,
} from '@/features/admin/api';
import type { QuestDto } from '@/features/quest/api';

const KEY = ['admin', 'quests'] as const;

export const useAdminQuests = () =>
  useQuery<QuestDto[]>({
    queryKey: KEY,
    queryFn: adminListQuests,
  });

export const useCreateAdminQuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: QuestUpsertInput) => adminCreateQuest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });
};

export const useUpdateAdminQuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<QuestUpsertInput> }) =>
      adminUpdateQuest(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });
};

export const useDeleteAdminQuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminDeleteQuest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });
};
