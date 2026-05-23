const ID_TOKEN_KEY = 'idToken';

export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(ID_TOKEN_KEY);
  },
  set: (token: string) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(ID_TOKEN_KEY, token);
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(ID_TOKEN_KEY);
  },
};
