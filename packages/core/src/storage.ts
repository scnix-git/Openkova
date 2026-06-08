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
    return path.join(this.basePath, sessionId, imageId);
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
      return entries.filter((e) => /\.(png|jpe?g|webp|pdf)$/i.test(e));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }

  async delete(sessionId: string, imageId: string): Promise<void> {
    await fs.unlink(this.filePath(sessionId, imageId));
  }

  async cleanup(maxAgeMs: number): Promise<number> {
    let deleted = 0;
    try {
      const sessions = await fs.readdir(this.basePath);
      const cutoff = Date.now() - maxAgeMs;
      for (const sessionId of sessions) {
        const dir = this.sessionDir(sessionId);
        try {
          const stat = await fs.stat(dir);
          if (stat.mtimeMs < cutoff) {
            await fs.rm(dir, { recursive: true });
            deleted++;
          }
        } catch {}
      }
    } catch {}
    return deleted;
  }
}
