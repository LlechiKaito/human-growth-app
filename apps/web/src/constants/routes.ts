export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  QUESTS: '/quests',
  MY_CHARACTER: '/characters/me',
  CHARACTER: (id: string) => `/characters/${id}`,
} as const;
