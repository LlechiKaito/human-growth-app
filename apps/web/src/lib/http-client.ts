import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!baseURL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
}

export const httpClient = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
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
