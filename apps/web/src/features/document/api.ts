import { API_PATHS } from '@/constants/api-paths';
import { httpClient } from '@/lib/http-client';

export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DocumentDto {
  id: string;
  questId: string;
  uploadedByCharacterId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export const uploadDocument = async (questId: string, file: File): Promise<DocumentDto> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await httpClient.post<DocumentDto>(
    API_PATHS.QUEST_DOCUMENTS(questId),
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
};

export const listQuestDocuments = async (questId: string): Promise<DocumentDto[]> => {
  const { data } = await httpClient.get<DocumentDto[]>(API_PATHS.QUEST_DOCUMENTS(questId));
  return data;
};

export const fetchDownloadUrl = async (id: string): Promise<{ url: string; expiresInSec: number }> => {
  const { data } = await httpClient.get<{ url: string; expiresInSec: number }>(
    API_PATHS.DOCUMENT_DOWNLOAD(id),
  );
  return data;
};

export const adminListPendingDocuments = async (): Promise<DocumentDto[]> => {
  const { data } = await httpClient.get<DocumentDto[]>(API_PATHS.ADMIN_DOCUMENTS_PENDING);
  return data;
};

export const adminApproveDocument = async (id: string): Promise<DocumentDto> => {
  const { data } = await httpClient.post<DocumentDto>(API_PATHS.ADMIN_DOCUMENT_APPROVE(id));
  return data;
};

export const adminRejectDocument = async (id: string, reason: string): Promise<DocumentDto> => {
  const { data } = await httpClient.post<DocumentDto>(API_PATHS.ADMIN_DOCUMENT_REJECT(id), {
    reason,
  });
  return data;
};
