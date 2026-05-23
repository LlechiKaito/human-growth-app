import { createHmac, randomUUID } from 'node:crypto';

import { SignJWT, jwtVerify } from 'jose';

import type {
  AuthTokens,
  AuthenticatedUser,
  LoginInput,
  SignupInput,
} from '@/application/dto/auth.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { DomainError } from '@/domain/errors/domain-errors';

import type { AuthProvider } from '@/infrastructure/auth/auth.provider';

interface StoredUser {
  sub: string;
  email: string;
  passwordHash: string;
}

const ID_TOKEN_TTL_SEC = 60 * 60;

/**
 * ローカル開発 / テスト用の AuthProvider
 * - パスワードはメモリ上に SHA-256 ハッシュで保管
 * - JWT は HS256 (ローカルシークレット)
 * - 本番では CognitoAuthProvider に切り替える
 */
export class LocalAuthProvider implements AuthProvider {
  private readonly users = new Map<string, StoredUser>();
  private readonly secret: Uint8Array;

  constructor(secret: string) {
    this.secret = new TextEncoder().encode(secret);
  }

  async signup(input: SignupInput): Promise<{ sub: string; tokens: AuthTokens }> {
    if (this.users.has(input.email)) {
      throw new DomainError(ERROR_CODES.CONFLICT, 'Email already registered');
    }
    const sub = randomUUID();
    this.users.set(input.email, {
      sub,
      email: input.email,
      passwordHash: this.hash(input.password),
    });
    const tokens = await this.issueTokens(sub, input.email);
    return { sub, tokens };
  }

  async login(input: LoginInput): Promise<{ sub: string; tokens: AuthTokens }> {
    const user = this.users.get(input.email);
    if (!user || user.passwordHash !== this.hash(input.password)) {
      throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Invalid credentials');
    }
    const tokens = await this.issueTokens(user.sub, user.email);
    return { sub: user.sub, tokens };
  }

  async verify(idToken: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(idToken, this.secret, {
        issuer: 'local-auth',
        audience: 'human-growth',
      });
      return {
        sub: payload.sub as string,
        email: payload.email as string,
      };
    } catch {
      throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Invalid token');
    }
  }

  private hash(plain: string): string {
    return createHmac('sha256', 'salt').update(plain).digest('hex');
  }

  private async issueTokens(sub: string, email: string): Promise<AuthTokens> {
    const now = Math.floor(Date.now() / 1000);
    const idToken = await new SignJWT({ email })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(sub)
      .setIssuer('local-auth')
      .setAudience('human-growth')
      .setIssuedAt(now)
      .setExpirationTime(now + ID_TOKEN_TTL_SEC)
      .sign(this.secret);
    return {
      idToken,
      accessToken: idToken,
      refreshToken: idToken,
      expiresIn: ID_TOKEN_TTL_SEC,
    };
  }
}
