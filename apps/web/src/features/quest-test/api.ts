import { API_PATHS } from '@/constants/api-paths';
import { httpClient } from '@/lib/http-client';

export interface PublicChoiceDto {
  id: string;
  text: string;
  order: number;
}

export interface PublicQuestionDto {
  id: string;
  text: string;
  order: number;
  choices: PublicChoiceDto[];
}

export interface PublicQuestTestDto {
  questId: string;
  questions: PublicQuestionDto[];
}

export interface AdminChoiceDto extends PublicChoiceDto {
  isCorrect: boolean;
}

export interface AdminQuestionDto {
  id: string;
  text: string;
  order: number;
  choices: AdminChoiceDto[];
}

export interface AdminQuestTestDto {
  questId: string;
  questions: AdminQuestionDto[];
}

export interface SubmitTestResultDto {
  attemptId: string;
  score: number;
  total: number;
  passed: boolean;
  results: {
    questionId: string;
    correctChoiceId: string;
    userChoiceId: string | null;
    isCorrect: boolean;
  }[];
}

export interface QuestionUpsertInput {
  text: string;
  choices: { text: string; isCorrect: boolean }[];
}

export const fetchQuestTest = async (questId: string): Promise<PublicQuestTestDto> => {
  const { data } = await httpClient.get<PublicQuestTestDto>(API_PATHS.QUEST_TEST(questId));
  return data;
};

export const submitQuestTest = async (
  questId: string,
  answers: { questionId: string; choiceId: string }[],
): Promise<SubmitTestResultDto> => {
  const { data } = await httpClient.post<SubmitTestResultDto>(
    API_PATHS.QUEST_TEST_ATTEMPT(questId),
    { answers },
  );
  return data;
};

export const adminFetchQuestTest = async (questId: string): Promise<AdminQuestTestDto> => {
  const { data } = await httpClient.get<AdminQuestTestDto>(API_PATHS.ADMIN_QUEST_TEST(questId));
  return data;
};

export const adminUpsertQuestTest = async (
  questId: string,
  questions: QuestionUpsertInput[],
): Promise<AdminQuestTestDto> => {
  const { data } = await httpClient.put<AdminQuestTestDto>(
    API_PATHS.ADMIN_QUEST_TEST(questId),
    { questions },
  );
  return data;
};
