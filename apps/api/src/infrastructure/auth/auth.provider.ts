import type {
  AuthTokens,
  AuthenticatedUser,
  LoginInput,
  SignupInput,
} from '@/application/dto/auth.dto';

export interface AuthProvider {
  signup(input: SignupInput): Promise<{ sub: string; tokens: AuthTokens }>;
  login(input: LoginInput): Promise<{ sub: string; tokens: AuthTokens }>;
  verify(idToken: string): Promise<AuthenticatedUser>;
}
