import type { MiddlewareHandler } from 'hono';

import { ERROR_CODES, ERROR_MESSAGES } from '@/constants/error-codes';
import { HTTP_STATUS } from '@/constants/http-status';

/**
 * 管理者ロールチェック。authMiddleware の後に置く。
 * isAdmin=false なら 403 FORBIDDEN。
 */
export const adminMiddleware: MiddlewareHandler = async (c, next) => {
  if (!c.get('isAdmin')) {
    return c.json(
      { code: ERROR_CODES.FORBIDDEN, message: ERROR_MESSAGES[ERROR_CODES.FORBIDDEN] },
      HTTP_STATUS.FORBIDDEN,
    );
  }
  return next();
};
