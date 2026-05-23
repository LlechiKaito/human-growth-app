import { API_PATHS } from '@/constants/api-paths';
import { httpClient } from '@/lib/http-client';

export interface AuthTokensDto {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

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

export interface MeDto {
  id: string;
  email: string;
  displayName: string;
  department: string | null;
}

export const signup = async (
  input: SignupInput,
): Promise<{ employeeId: string; tokens: AuthTokensDto }> => {
  const { data } = await httpClient.post(API_PATHS.AUTH_SIGNUP, input);
  return data;
};

export const login = async (
  input: LoginInput,
): Promise<{ employeeId: string; tokens: AuthTokensDto }> => {
  const { data } = await httpClient.post(API_PATHS.AUTH_LOGIN, input);
  return data;
};

export const fetchMe = async (): Promise<MeDto> => {
  const { data } = await httpClient.get<MeDto>('/api/auth/me');
  return data;
};
