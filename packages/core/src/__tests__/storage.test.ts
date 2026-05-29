import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LocalStorageAdapter } from '../storage.js';

let tmpDir: string;
let adapter: LocalStorageAdapter;

before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openkova-test-'));
  adapter = new LocalStorageAdapter(tmpDir);
});

after(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('save and get round-trips a buffer', async () => {
  const data = Buffer.from('hello png');
  await adapter.save('session-1', 'img-1', data);
  const result = await adapter.get('session-1', 'img-1');
  assert.ok(result !== null);
  assert.deepEqual(result, data);
});

test('get returns null for missing image', async () => {
  const result = await adapter.get('session-1', 'nonexistent');
  assert.equal(result, null);
});

test('list returns saved image ids', async () => {
  await adapter.save('session-2', 'img-a', Buffer.from('a'));
  await adapter.save('session-2', 'img-b', Buffer.from('b'));
  const list = await adapter.list('session-2');
  assert.ok(list.includes('img-a'));
  assert.ok(list.includes('img-b'));
  assert.equal(list.length, 2);
});

test('list returns empty array for unknown session', async () => {
  const list = await adapter.list('no-such-session');
  assert.deepEqual(list, []);
});

test('delete removes the file', async () => {
  await adapter.save('session-3', 'img-del', Buffer.from('x'));
  await adapter.delete('session-3', 'img-del');
  const result = await adapter.get('session-3', 'img-del');
  assert.equal(result, null);
});
