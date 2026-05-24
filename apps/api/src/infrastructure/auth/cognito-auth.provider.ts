import {
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  MessageActionType,
  UsernameExistsException,
  NotAuthorizedException,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
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
 * Cognito AuthProvider
 * - signup: AdminCreateUser + AdminSetUserPassword (メール確認スキップ)
 * - login: AdminInitiateAuth with ADMIN_USER_PASSWORD_AUTH
 * - verify: JWKS で ID トークン検証 (jose)
 *
 * IAM 権限 (App Runner instance role):
 *  - cognito-idp:AdminCreateUser
 *  - cognito-idp:AdminSetUserPassword
 *  - cognito-idp:AdminInitiateAuth
 *  - cognito-idp:AdminGetUser
 */
export class CognitoAuthProvider implements AuthProvider {
  private readonly client: CognitoIdentityProviderClient;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor(private readonly config: CognitoConfig) {
    this.client = new CognitoIdentityProviderClient({ region: config.region });
    this.issuer = `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
  }

  async signup(input: SignupInput): Promise<{ sub: string; tokens: AuthTokens }> {
    try {
      const created = await this.client.send(
        new AdminCreateUserCommand({
          UserPoolId: this.config.userPoolId,
          Username: input.email,
          MessageAction: MessageActionType.SUPPRESS,
          UserAttributes: [
            { Name: 'email', Value: input.email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'given_name', Value: input.displayName },
          ],
        }),
      );

      await this.client.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: this.config.userPoolId,
          Username: input.email,
          Password: input.password,
          Permanent: true,
        }),
      );

      const sub = created.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
      if (!sub) {
        throw new DomainError(ERROR_CODES.INTERNAL_ERROR, 'Cognito did not return sub');
      }

      const tokens = await this.adminAuth(input.email, input.password);
      return { sub, tokens };
    } catch (e) {
      if (e instanceof UsernameExistsException) {
        throw new DomainError(ERROR_CODES.CONFLICT, 'Email already registered');
      }
      if (e instanceof DomainError) throw e;
      throw new DomainError(
        ERROR_CODES.INTERNAL_ERROR,
        `Cognito signup failed: ${(e as Error).message}`,
      );
    }
  }

  async login(input: LoginInput): Promise<{ sub: string; tokens: AuthTokens }> {
    try {
      const tokens = await this.adminAuth(input.email, input.password);
      const claims = await this.verify(tokens.idToken);
      return { sub: claims.sub, tokens };
    } catch (e) {
      if (e instanceof NotAuthorizedException || e instanceof UserNotFoundException) {
        throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Invalid credentials');
      }
      if (e instanceof DomainError) throw e;
      throw new DomainError(
        ERROR_CODES.INTERNAL_ERROR,
        `Cognito login failed: ${(e as Error).message}`,
      );
    }
  }

  async verify(idToken: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: this.issuer,
        audience: this.config.clientId,
      });
      const groupsClaim = payload['cognito:groups'];
      const groups = Array.isArray(groupsClaim) ? (groupsClaim as string[]) : [];
      const displayName = (payload.given_name as string | undefined) ?? null;
      return {
        sub: payload.sub as string,
        email: payload.email as string,
        groups,
        displayName,
      };
    } catch {
      throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Invalid Cognito token');
    }
  }

  private async adminAuth(email: string, password: string): Promise<AuthTokens> {
    const res = await this.client.send(
      new AdminInitiateAuthCommand({
        UserPoolId: this.config.userPoolId,
        ClientId: this.config.clientId,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }),
    );
    const ar = res.AuthenticationResult;
    if (!ar?.IdToken || !ar?.AccessToken || !ar?.RefreshToken || !ar?.ExpiresIn) {
      throw new DomainError(ERROR_CODES.INTERNAL_ERROR, 'Cognito returned incomplete tokens');
    }
    return {
      idToken: ar.IdToken,
      accessToken: ar.AccessToken,
      refreshToken: ar.RefreshToken,
      expiresIn: ar.ExpiresIn,
    };
  }
}
