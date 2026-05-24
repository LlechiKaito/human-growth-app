import { env } from '@/config/env';

import {
  InMemoryStorageService,
  S3StorageService,
  type StorageService,
} from '@/infrastructure/storage/s3.service';

let cached: StorageService | null = null;

export const getStorageService = (): StorageService => {
  if (cached) return cached;
  if (!env.DOCUMENTS_BUCKET) {
    cached = new InMemoryStorageService();
  } else {
    cached = new S3StorageService(env.DOCUMENTS_BUCKET, env.AWS_REGION);
  }
  return cached;
};

export const __resetStorageForTest = () => {
  cached = null;
};

export const __setStorageForTest = (svc: StorageService) => {
  cached = svc;
};
