import { env } from '@/config/env';

import type { AuthProvider } from '@/infrastructure/auth/auth.provider';
import { CognitoAuthProvider } from '@/infrastructure/auth/cognito-auth.provider';
import { LocalAuthProvider } from '@/infrastructure/auth/local-auth.provider';

let cached: AuthProvider | null = null;

export const getAuthProvider = (): AuthProvider => {
  if (cached) return cached;

  if (env.AUTH_PROVIDER === 'cognito') {
    if (!env.COGNITO_USER_POOL_ID || !env.COGNITO_CLIENT_ID) {
      throw new Error('AUTH_PROVIDER=cognito requires COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID');
    }
    cached = new CognitoAuthProvider({
      region: env.COGNITO_REGION,
      userPoolId: env.COGNITO_USER_POOL_ID,
      clientId: env.COGNITO_CLIENT_ID,
    });
  } else {
    // process.env を直接読む (テストが beforeEach で書き換えられるように)
    const raw = process.env.ADMIN_EMAILS ?? '';
    const adminEmails = raw.split(',').map((s) => s.trim()).filter(Boolean);
    cached = new LocalAuthProvider(env.AUTH_LOCAL_SECRET, adminEmails);
  }
  return cached;
};

export const __resetAuthProviderForTest = () => {
  cached = null;
};
