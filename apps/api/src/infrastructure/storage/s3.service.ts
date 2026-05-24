import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageService {
  upload(input: { key: string; body: Uint8Array; contentType: string }): Promise<void>;
  getDownloadUrl(key: string, expiresSec?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

export class S3StorageService implements StorageService {
  private readonly client: S3Client;

  constructor(
    private readonly bucketName: string,
    region: string,
  ) {
    this.client = new S3Client({ region });
  }

  async upload(input: { key: string; body: Uint8Array; contentType: string }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  async getDownloadUrl(key: string, expiresSec = 300): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
      { expiresIn: expiresSec },
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }
}

/**
 * テスト / ローカル用 in-memory 実装
 */
export class InMemoryStorageService implements StorageService {
  readonly objects = new Map<string, { body: Uint8Array; contentType: string }>();

  async upload(input: { key: string; body: Uint8Array; contentType: string }): Promise<void> {
    this.objects.set(input.key, { body: input.body, contentType: input.contentType });
  }
  async getDownloadUrl(key: string): Promise<string> {
    if (!this.objects.has(key)) throw new Error(`Object not found: ${key}`);
    return `memory://${key}`;
  }
  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}
