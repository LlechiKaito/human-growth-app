import { API_PATHS } from '@/constants/api-paths';
import { httpClient } from '@/lib/http-client';

export interface QuestVideoMetaDto {
  id: string;
  questId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestVideoForViewerDto extends QuestVideoMetaDto {
  url: string;
  viewed: boolean;
}

export const fetchQuestVideo = async (questId: string): Promise<QuestVideoForViewerDto> => {
  const { data } = await httpClient.get<QuestVideoForViewerDto>(API_PATHS.QUEST_VIDEO(questId));
  return data;
};

export const markVideoViewed = async (questId: string): Promise<void> => {
  await httpClient.post(API_PATHS.QUEST_VIDEO_VIEW(questId), {});
};

export const adminFetchQuestVideo = async (questId: string): Promise<QuestVideoMetaDto | null> => {
  const { data } = await httpClient.get<QuestVideoMetaDto | null>(
    API_PATHS.ADMIN_QUEST_VIDEO(questId),
  );
  return data;
};

export const adminUploadQuestVideo = async (
  questId: string,
  file: File,
): Promise<QuestVideoMetaDto> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await httpClient.post<QuestVideoMetaDto>(
    API_PATHS.ADMIN_QUEST_VIDEO(questId),
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
};

export const adminDeleteQuestVideo = async (questId: string): Promise<void> => {
  await httpClient.delete(API_PATHS.ADMIN_QUEST_VIDEO(questId));
};
