import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveApiBase } from '../src/lib/apiBase.ts';

test('keeps the configured address on the server machine itself', () => {
  assert.equal(resolveApiBase('http://localhost:3005', 'localhost'), 'http://localhost:3005');
  assert.equal(resolveApiBase('http://localhost:3005', '127.0.0.1'), 'http://localhost:3005');
  assert.equal(resolveApiBase('http://localhost:3005', undefined), 'http://localhost:3005');
});

test('a phone or LED PC on the network reaches the API through the host it opened', () => {
  assert.equal(resolveApiBase('http://localhost:3005', '192.168.1.20'), 'http://192.168.1.20:3005');
  assert.equal(resolveApiBase(undefined, '172.20.10.8'), 'http://172.20.10.8:3005');
});

test('a real domain is never rewritten', () => {
  assert.equal(resolveApiBase('https://event-bbk.com', '192.168.1.20'), 'https://event-bbk.com');
  assert.equal(resolveApiBase('https://event-bbk.com/', 'event-bbk.com'), 'https://event-bbk.com');
});
