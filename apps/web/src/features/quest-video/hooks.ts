import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adminDeleteQuestVideo,
  adminFetchQuestVideo,
  adminUploadQuestVideo,
  fetchQuestVideo,
  markVideoViewed,
} from '@/features/quest-video/api';

export const useQuestVideo = (questId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['quest-video', questId],
    queryFn: () => fetchQuestVideo(questId),
    enabled,
    retry: false,
  });

export const useMarkVideoViewed = (questId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markVideoViewed(questId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quest-video', questId] });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });
};

export const useAdminQuestVideo = (questId: string) =>
  useQuery({
    queryKey: ['admin-quest-video', questId],
    queryFn: () => adminFetchQuestVideo(questId),
  });

export const useAdminUploadQuestVideo = (questId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => adminUploadQuestVideo(questId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quest-video', questId] });
    },
  });
};

export const useAdminDeleteQuestVideo = (questId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminDeleteQuestVideo(questId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quest-video', questId] });
    },
  });
};
