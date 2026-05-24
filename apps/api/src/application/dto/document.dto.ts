import type { DocumentStatus } from '@/domain/entities/quest-document.entity';

export interface DocumentDto {
  id: string;
  questId: string;
  uploadedByCharacterId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface UploadDocumentInput {
  questId: string;
  filename: string;
  mimeType: string;
  body: Uint8Array;
}

export interface DownloadResultDto {
  url: string;
  expiresInSec: number;
}
