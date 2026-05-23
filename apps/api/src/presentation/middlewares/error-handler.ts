import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { ERROR_CODES, ERROR_MESSAGES } from '@/constants/error-codes';
import { HTTP_STATUS } from '@/constants/http-status';
import { DomainError } from '@/domain/errors/domain-errors';

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
    const status =
      err.code === ERROR_CODES.CHARACTER_NOT_FOUND ||
      err.code === ERROR_CODES.QUEST_NOT_FOUND ||
      err.code === ERROR_CODES.EMPLOYEE_NOT_FOUND ||
      err.code === ERROR_CODES.SKILL_NOT_FOUND
        ? HTTP_STATUS.NOT_FOUND
        : err.code === ERROR_CODES.QUEST_ALREADY_COMPLETED
          ? HTTP_STATUS.CONFLICT
          : HTTP_STATUS.BAD_REQUEST;
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
