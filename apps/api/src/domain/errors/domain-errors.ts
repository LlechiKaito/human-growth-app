import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';

export class DomainError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'DomainError';
    this.code = code;
  }
}

export class CharacterNotFoundError extends DomainError {
  constructor(characterId: string) {
    super(ERROR_CODES.CHARACTER_NOT_FOUND, `Character not found: ${characterId}`);
  }
}

export class QuestNotFoundError extends DomainError {
  constructor(questId: string) {
    super(ERROR_CODES.QUEST_NOT_FOUND, `Quest not found: ${questId}`);
  }
}

export class QuestAlreadyCompletedError extends DomainError {
  constructor(questId: string) {
    super(ERROR_CODES.QUEST_ALREADY_COMPLETED, `Quest already completed: ${questId}`);
  }
}
