import fs from 'node:fs/promises';
import path from 'node:path';

export interface StorageAdapter {
  save(sessionId: string, imageId: string, data: Buffer): Promise<void>;
  get(sessionId: string, imageId: string): Promise<Buffer | null>;
  list(sessionId: string): Promise<string[]>;
  delete(sessionId: string, imageId: string): Promise<void>;
}

export class LocalStorageAdapter implements StorageAdapter {
  private readonly basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath ?? process.env['OPENKOVA_STORAGE_PATH'] ?? './data';
  }

  private filePath(sessionId: string, imageId: string): string {
    return path.join(this.basePath, sessionId, `${imageId}.png`);
  }

  private sessionDir(sessionId: string): string {
    return path.join(this.basePath, sessionId);
  }

  async save(sessionId: string, imageId: string, data: Buffer): Promise<void> {
    const dir = this.sessionDir(sessionId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath(sessionId, imageId), data);
  }

  async get(sessionId: string, imageId: string): Promise<Buffer | null> {
    try {
      const data = await fs.readFile(this.filePath(sessionId, imageId));
      return Buffer.from(data);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async list(sessionId: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.sessionDir(sessionId));
      return entries.filter((e) => e.endsWith('.png')).map((e) => e.replace(/\.png$/, ''));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }

  async delete(sessionId: string, imageId: string): Promise<void> {
    await fs.unlink(this.filePath(sessionId, imageId));
  }
}
