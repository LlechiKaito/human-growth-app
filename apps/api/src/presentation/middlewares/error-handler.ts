import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { ERROR_CODES, ERROR_MESSAGES, type ErrorCode } from '@/constants/error-codes';
import { HTTP_STATUS, type HttpStatus } from '@/constants/http-status';
import { DomainError } from '@/domain/errors/domain-errors';

const domainErrorToStatus = (code: ErrorCode): HttpStatus => {
  switch (code) {
    case ERROR_CODES.CHARACTER_NOT_FOUND:
    case ERROR_CODES.QUEST_NOT_FOUND:
    case ERROR_CODES.QUEST_TEST_NOT_FOUND:
    case ERROR_CODES.EMPLOYEE_NOT_FOUND:
    case ERROR_CODES.SKILL_NOT_FOUND:
    case ERROR_CODES.NOT_FOUND:
      return HTTP_STATUS.NOT_FOUND;
    case ERROR_CODES.QUEST_ALREADY_COMPLETED:
    case ERROR_CODES.QUEST_DOCUMENT_REQUIRED:
    case ERROR_CODES.QUEST_TEST_REQUIRED:
    case ERROR_CODES.CONFLICT:
      return HTTP_STATUS.CONFLICT;
    case ERROR_CODES.UNAUTHORIZED:
      return HTTP_STATUS.UNAUTHORIZED;
    case ERROR_CODES.FORBIDDEN:
      return HTTP_STATUS.FORBIDDEN;
    case ERROR_CODES.VALIDATION_FAILED:
      return HTTP_STATUS.BAD_REQUEST;
    case ERROR_CODES.INTERNAL_ERROR:
      return HTTP_STATUS.INTERNAL_SERVER_ERROR;
    default:
      return HTTP_STATUS.BAD_REQUEST;
  }
};

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('[ErrorHandler]', err);

  if (err instanceof HTTPException) {
    return c.json(
      {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: err.message,
      },
      err.status,
    );
  }

  if (err instanceof DomainError) {
    const status = domainErrorToStatus(err.code);
    return c.json({ code: err.code, message: err.message }, status);
  }

  return c.json(
    {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR],
    },
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  );
};
