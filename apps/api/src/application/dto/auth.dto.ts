export interface SignupInput {
  email: string;
  password: string;
  displayName: string;
  department?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedUser {
  sub: string;
  email: string;
  groups: string[];
}

export interface MeResponse {
  id: string;
  email: string;
  displayName: string;
  department: string | null;
  isAdmin: boolean;
}

export const ADMINS_GROUP = 'admins';
