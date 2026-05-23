import axios from 'axios';

// 空文字 (相対 URL) がデフォルト: dev は Next.js の rewrite、prod は CloudFront 経由で /api/* を API に振る
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export const httpClient = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: false,
});

httpClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.sessionStorage.getItem('idToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
