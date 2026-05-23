export const API_PATHS = {
  HEALTH: '/api/health',
  CHARACTERS: '/api/characters',
  CHARACTER_BY_ID: (id: string) => `/api/characters/${id}`,
  QUESTS: '/api/quests',
  QUEST_COMPLETE: (id: string) => `/api/quests/${id}/complete`,
  AUTH_LOGIN: '/api/auth/login',
  AUTH_SIGNUP: '/api/auth/signup',
} as const;
