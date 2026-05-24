import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adminApproveDocument,
  adminListPendingDocuments,
  adminRejectDocument,
  fetchDownloadUrl,
  listQuestDocuments,
  uploadDocument,
  type DocumentDto,
} from '@/features/document/api';

export const useQuestDocuments = (questId: string) =>
  useQuery<DocumentDto[]>({
    queryKey: ['documents', 'quest', questId],
    queryFn: () => listQuestDocuments(questId),
  });

export const useUploadDocument = (questId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadDocument(questId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'quest', questId] });
      queryClient.invalidateQueries({ queryKey: ['documents', 'pending'] });
    },
  });
};

export const useAdminPendingDocuments = () =>
  useQuery<DocumentDto[]>({
    queryKey: ['documents', 'pending'],
    queryFn: adminListPendingDocuments,
  });

export const useApproveDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApproveDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

export const useRejectDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminRejectDocument(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

export const useDownloadDocument = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { url } = await fetchDownloadUrl(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    },
  });
};
