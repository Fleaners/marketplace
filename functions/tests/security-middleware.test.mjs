import test from 'node:test';
import assert from 'node:assert/strict';
import security from '../middleware/security.cjs';

const {
  sanitizeInputMiddleware,
  replayProtectionMiddleware,
} = security;

function createMockRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

test('sanitizeInputMiddleware blocks NoSQL operator keys', () => {
  const req = {
    headers: { 'content-type': 'application/json' },
    body: { price: { $gt: '' } },
    query: {},
  };
  const res = createMockRes();
  let called = false;

  sanitizeInputMiddleware(req, res, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(res.statusCode, 400);
  assert.match(String(res.payload?.error || ''), /unsafe field/i);
});

test('sanitizeInputMiddleware allows simple payloads', () => {
  const req = {
    headers: { 'content-type': 'application/json' },
    body: { name: 'Motor' },
    query: { city: 'Mumbai' },
  };
  const res = createMockRes();
  let called = false;

  sanitizeInputMiddleware(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});

test('replayProtectionMiddleware rejects missing nonce/timestamp', () => {
  const req = {
    method: 'POST',
    path: '/api/auth/login',
    headers: {},
  };
  const res = createMockRes();
  let called = false;

  replayProtectionMiddleware(req, res, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(res.statusCode, 400);
  assert.match(String(res.payload?.error || ''), /replay-protection/i);
});

test('replayProtectionMiddleware accepts fresh nonce and timestamp', () => {
  const req = {
    method: 'POST',
    path: '/api/auth/login',
    headers: {
      'x-timestamp': String(Date.now()),
      'x-nonce': `nonce-${Date.now()}`,
    },
  };
  const res = createMockRes();
  let called = false;

  replayProtectionMiddleware(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});
