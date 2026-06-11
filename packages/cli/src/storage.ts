import fs from 'node:fs/promises';
import path from 'node:path';
import type { StorageAdapter } from '@openkova/core';

export class CliStorageAdapter implements StorageAdapter {
  constructor(private readonly outDir: string) {}

  async save(_sessionId: string, imageId: string, data: Buffer): Promise<void> {
    await fs.mkdir(this.outDir, { recursive: true });
    await fs.writeFile(path.join(this.outDir, imageId), data);
  }

  async get(_sessionId: string, imageId: string): Promise<Buffer | null> {
    try {
      return Buffer.from(await fs.readFile(path.join(this.outDir, imageId)));
    } catch {
      return null;
    }
  }

  async list(_sessionId: string): Promise<string[]> {
    return [];
  }

  async delete(_sessionId: string, imageId: string): Promise<void> {
    await fs.unlink(path.join(this.outDir, imageId));
  }
}
