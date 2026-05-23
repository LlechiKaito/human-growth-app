'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import {
  fetchMe,
  login,
  signup,
  type LoginInput,
  type MeDto,
  type SignupInput,
} from '@/features/auth/api';
import { tokenStorage } from '@/features/auth/token-storage';

export const useMe = () =>
  useQuery<MeDto>({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: typeof window !== 'undefined' && !!tokenStorage.get(),
    retry: false,
  });

export const useLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: ({ tokens }) => {
      tokenStorage.set(tokens.idToken);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push(ROUTES.DASHBOARD);
    },
  });
};

export const useSignup = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SignupInput) => signup(input),
    onSuccess: ({ tokens }) => {
      tokenStorage.set(tokens.idToken);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push(ROUTES.DASHBOARD);
    },
  });
};

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  return () => {
    tokenStorage.clear();
    queryClient.clear();
    router.push(ROUTES.LOGIN);
  };
};
