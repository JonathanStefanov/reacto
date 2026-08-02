/**
 * Reacto — File Storage Backends
 *
 * Local filesystem and S3 storage for file uploads.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredFile {
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  storage: 'local' | 's3';
}

export interface LocalStorageOptions {
  uploadDir?: string;
  urlPrefix?: string;
}

export interface S3StorageOptions {
  bucket: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  baseUrl?: string;
}

// ─── Local Storage ────────────────────────────────────────────────────────────

export class LocalStorage {
  private uploadDir: string;
  private urlPrefix: string;

  constructor(options: LocalStorageOptions = {}) {
    this.uploadDir = path.resolve(options.uploadDir ?? './uploads');
    this.urlPrefix = options.urlPrefix ?? '/uploads';

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async store(buffer: Buffer, originalName: string, mimeType: string, subDir?: string): Promise<StoredFile> {
    const ext = path.extname(originalName);
    const uniqueName = `${crypto.randomBytes(8).toString('hex')}${ext}`;
    const dir = subDir ? path.join(this.uploadDir, subDir) : this.uploadDir;
    const filePath = path.join(dir, uniqueName);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);

    const relativePath = subDir ? `${subDir}/${uniqueName}` : uniqueName;

    return {
      originalName,
      filename: uniqueName,
      mimeType,
      size: buffer.length,
      path: `${this.urlPrefix}/${relativePath}`,
      storage: 'local',
    };
  }

  async delete(filePath: string): Promise<void> {
    const relativePath = filePath.replace(this.urlPrefix, '');
    const fullPath = path.join(this.uploadDir, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  exists(filePath: string): boolean {
    const relativePath = filePath.replace(this.urlPrefix, '');
    return fs.existsSync(path.join(this.uploadDir, relativePath));
  }

  read(filePath: string): Buffer {
    const relativePath = filePath.replace(this.urlPrefix, '');
    return fs.readFileSync(path.join(this.uploadDir, relativePath));
  }
}

// ─── S3 Storage ───────────────────────────────────────────────────────────────

export class S3Storage {
  private options: S3StorageOptions;

  constructor(options: S3StorageOptions) {
    this.options = options;
  }

  /**
   * Store a file in S3.
   * Requires @aws-sdk/client-s3 to be installed as a peer dependency.
   */
  async store(buffer: Buffer, originalName: string, mimeType: string, subDir?: string): Promise<StoredFile> {
    const ext = path.extname(originalName);
    const uniqueName = `${crypto.randomBytes(8).toString('hex')}${ext}`;
    const key = subDir ? `${subDir}/${uniqueName}` : uniqueName;

    try {
      // Use Function() to avoid TypeScript analyzing the import
      const s3mod = await (Function('return import("@aws-sdk/client-s3")')() as Promise<Record<string, unknown>>);
      const S3Client = s3mod.S3Client as new (config: Record<string, unknown>) => { send: (cmd: unknown) => Promise<unknown> };
      const PutObjectCommand = s3mod.PutObjectCommand as new (input: Record<string, unknown>) => unknown;

      const client = new S3Client({
        region: this.options.region ?? 'us-east-1',
        endpoint: this.options.endpoint,
        credentials: { accessKeyId: this.options.accessKeyId, secretAccessKey: this.options.secretAccessKey },
      });

      await client.send(new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }));

      const baseUrl = this.options.baseUrl ?? `https://${this.options.bucket}.s3.${this.options.region ?? 'us-east-1'}.amazonaws.com`;

      return { originalName, filename: uniqueName, mimeType, size: buffer.length, path: `${baseUrl}/${key}`, storage: 's3' };
    } catch (err: unknown) {
      throw new Error(`S3 upload failed. Make sure @aws-sdk/client-s3 is installed. Error: ${(err as Error).message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const s3mod = await (Function('return import("@aws-sdk/client-s3")')() as Promise<Record<string, unknown>>);
      const S3Client = s3mod.S3Client as new (config: Record<string, unknown>) => { send: (cmd: unknown) => Promise<unknown> };
      const DeleteObjectCommand = s3mod.DeleteObjectCommand as new (input: Record<string, unknown>) => unknown;

      const client = new S3Client({
        region: this.options.region ?? 'us-east-1',
        endpoint: this.options.endpoint,
        credentials: { accessKeyId: this.options.accessKeyId, secretAccessKey: this.options.secretAccessKey },
      });

      await client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }));
    } catch (err: unknown) {
      throw new Error(`S3 delete failed: ${(err as Error).message}`);
    }
  }
}

// ─── Storage Manager ──────────────────────────────────────────────────────────

let defaultStorage: LocalStorage | S3Storage | null = null;

export function setDefaultStorage(storage: LocalStorage | S3Storage): void {
  defaultStorage = storage;
}

export function getDefaultStorage(): LocalStorage | S3Storage {
  if (!defaultStorage) {
    defaultStorage = new LocalStorage();
  }
  return defaultStorage;
}
