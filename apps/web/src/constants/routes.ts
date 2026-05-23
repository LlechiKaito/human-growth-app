export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  QUESTS: '/quests',
  CHARACTER: (id: string) => `/characters/${id}`,
} as const;
