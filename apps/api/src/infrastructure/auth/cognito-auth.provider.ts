import { createRemoteJWKSet, jwtVerify } from 'jose';

import type {
  AuthTokens,
  AuthenticatedUser,
  LoginInput,
  SignupInput,
} from '@/application/dto/auth.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { DomainError } from '@/domain/errors/domain-errors';

import type { AuthProvider } from '@/infrastructure/auth/auth.provider';

interface CognitoConfig {
  region: string;
  userPoolId: string;
  clientId: string;
}

/**
 * 本番用 Cognito AuthProvider
 * - signup/login は AWS SDK 経由で実装 (POC スコープでは未実装、ログイン経路は Web 側 SDK でも可)
 * - verify は JWKS で ID トークンを検証
 */
export class CognitoAuthProvider implements AuthProvider {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor(private readonly config: CognitoConfig) {
    this.issuer = `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
  }

  signup(_input: SignupInput): Promise<{ sub: string; tokens: AuthTokens }> {
    throw new DomainError(
      ERROR_CODES.INTERNAL_ERROR,
      'Cognito signup must be performed via aws-sdk; not implemented in this POC server',
    );
  }

  login(_input: LoginInput): Promise<{ sub: string; tokens: AuthTokens }> {
    throw new DomainError(
      ERROR_CODES.INTERNAL_ERROR,
      'Cognito login must be performed via aws-sdk or Web SDK; not implemented in this POC server',
    );
  }

  async verify(idToken: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: this.issuer,
        audience: this.config.clientId,
      });
      return {
        sub: payload.sub as string,
        email: payload.email as string,
      };
    } catch {
      throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Invalid Cognito token');
    }
  }
}
