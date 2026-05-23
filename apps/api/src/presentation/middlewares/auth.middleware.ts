import type { MiddlewareHandler } from 'hono';

import { ERROR_CODES, ERROR_MESSAGES } from '@/constants/error-codes';
import { HTTP_STATUS } from '@/constants/http-status';

/**
 * Cognito JWT 検証ミドルウェア (雛形)
 * POC 後続コミットで jose を使った JWKS 検証を実装する
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        code: ERROR_CODES.UNAUTHORIZED,
        message: ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED],
      },
      HTTP_STATUS.UNAUTHORIZED,
    );
  }

  c.set('userId', 'todo-extract-from-jwt');
  await next();
};
