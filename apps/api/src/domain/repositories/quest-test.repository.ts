import type {
  QuestQuestion,
  QuestTestAttempt,
} from '@/domain/entities/quest-test.entity';

export interface QuestQuestionInput {
  text: string;
  order: number;
  choices: { text: string; isCorrect: boolean; order: number }[];
}

export interface QuestTestRepository {
  listQuestionsByQuestId(questId: string): Promise<QuestQuestion[]>;
  replaceQuestions(questId: string, questions: QuestQuestionInput[]): Promise<QuestQuestion[]>;
  createAttempt(attempt: QuestTestAttempt): Promise<QuestTestAttempt>;
  hasPassedAttempt(questId: string, characterId: string): Promise<boolean>;
  listAttempts(questId: string, characterId: string): Promise<QuestTestAttempt[]>;
}
