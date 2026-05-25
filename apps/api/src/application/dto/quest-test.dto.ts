/**
 * 受講者向け: 設問を返すが、正解 (isCorrect) は隠す
 */
export interface PublicQuestChoiceDto {
  id: string;
  text: string;
  order: number;
}

export interface PublicQuestQuestionDto {
  id: string;
  text: string;
  order: number;
  choices: PublicQuestChoiceDto[];
}

export interface PublicQuestTestDto {
  questId: string;
  questions: PublicQuestQuestionDto[];
}

/**
 * 管理者向け: 正解を含む完全な設問
 */
export interface AdminQuestChoiceDto {
  id: string;
  text: string;
  order: number;
  isCorrect: boolean;
}

export interface AdminQuestQuestionDto {
  id: string;
  text: string;
  order: number;
  choices: AdminQuestChoiceDto[];
}

export interface AdminQuestTestDto {
  questId: string;
  questions: AdminQuestQuestionDto[];
}

/**
 * 受験結果
 */
export interface SubmitTestResultDto {
  attemptId: string;
  score: number;
  total: number;
  passed: boolean;
  // 設問ごとに正解 / 不正解を返す (受験後なので正解を見せて良い)
  results: { questionId: string; correctChoiceId: string; userChoiceId: string | null; isCorrect: boolean }[];
}
