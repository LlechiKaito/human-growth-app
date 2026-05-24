export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  QUESTS: '/quests',
  MY_CHARACTER: '/characters/me',
  CHARACTER: (id: string) => `/characters/${id}`,
  ADMIN_QUESTS: '/admin/quests',
  ADMIN_QUEST_NEW: '/admin/quests/new',
  // Next.js output:'export' が [id] 動的ルートを許さないので、edit はクエリパラメータ
  ADMIN_QUEST_EDIT: (id: string) => `/admin/quests/edit?id=${encodeURIComponent(id)}`,
} as const;
