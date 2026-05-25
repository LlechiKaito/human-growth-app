import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adminFetchQuestTest,
  adminUpsertQuestTest,
  fetchQuestTest,
  submitQuestTest,
  type QuestionUpsertInput,
  type SubmitTestResultDto,
} from '@/features/quest-test/api';

export const useQuestTest = (questId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['quest-test', questId],
    queryFn: () => fetchQuestTest(questId),
    enabled,
    retry: false,
  });

export const useSubmitQuestTest = (questId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: { questionId: string; choiceId: string }[]) =>
      submitQuestTest(questId, answers),
    onSuccess: (_result: SubmitTestResultDto) => {
      // 合格すると quests の hasPassedTest が変わるので再 fetch
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });
};

export const useAdminQuestTest = (questId: string) =>
  useQuery({
    queryKey: ['admin-quest-test', questId],
    queryFn: () => adminFetchQuestTest(questId),
  });

export const useAdminUpsertQuestTest = (questId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questions: QuestionUpsertInput[]) => adminUpsertQuestTest(questId, questions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quest-test', questId] });
    },
  });
};
