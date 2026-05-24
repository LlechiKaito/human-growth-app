import type { MiddlewareHandler } from 'hono';

import { ADMINS_GROUP } from '@/application/dto/auth.dto';
import { ERROR_CODES, ERROR_MESSAGES } from '@/constants/error-codes';
import { HTTP_STATUS } from '@/constants/http-status';

import { getAuthProvider } from '@/infrastructure/auth';

declare module 'hono' {
  interface ContextVariableMap {
    cognitoSub: string;
    userEmail: string;
    userGroups: string[];
    isAdmin: boolean;
  }
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return c.json(
      { code: ERROR_CODES.UNAUTHORIZED, message: ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED] },
      HTTP_STATUS.UNAUTHORIZED,
    );
  }

  const token = header.slice('Bearer '.length).trim();
  let user;
  try {
    user = await getAuthProvider().verify(token);
  } catch {
    return c.json(
      { code: ERROR_CODES.UNAUTHORIZED, message: ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED] },
      HTTP_STATUS.UNAUTHORIZED,
    );
  }
  c.set('cognitoSub', user.sub);
  c.set('userEmail', user.email);
  c.set('userGroups', user.groups);
  c.set('isAdmin', user.groups.includes(ADMINS_GROUP));
  return next();
};
