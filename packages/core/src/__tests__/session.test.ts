import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../session.js';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('createSession returns a valid UUID v4', () => {
  const id = createSession();
  assert.match(id, UUID_V4_RE);
});

test('createSession returns unique values', () => {
  const ids = new Set(Array.from({ length: 100 }, () => createSession()));
  assert.equal(ids.size, 100);
});
