// Set up mock env and firebase admin mock before importing router
process.env.JWT_SECRET = 'local-dev-jwt-secret-change-me';

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
initializeApp({ projectId: 'mock-project-id' });

import productsRouter from '../routes/products.js';

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

test('POST /adjust validates quantityChange is an integer', async () => {
  const req = {
    method: 'POST',
    path: '/adjust',
    body: {
      productId: 'prod-123',
      quantityChange: 'not-a-number',
      type: 'received',
      reason: 'restock',
    },
    user: { businessId: 'demo-business', uid: 'demo-uid', role: 'seller' },
  };
  const res = createMockRes();

  const stack = productsRouter.stack.find((s) => s.route?.path === '/adjust').route.stack;
  const adjustHandler = stack[stack.length - 1].handle;

  await adjustHandler(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.match(String(res.payload?.error || ''), /quantityChange must be a valid integer/i);
});

test('POST /adjust validates transaction type', async () => {
  const req = {
    method: 'POST',
    path: '/adjust',
    body: {
      productId: 'prod-123',
      quantityChange: '10',
      type: 'invalid-type',
      reason: 'restock',
    },
    user: { businessId: 'demo-business', uid: 'demo-uid', role: 'seller' },
  };
  const res = createMockRes();

  const stack = productsRouter.stack.find((s) => s.route?.path === '/adjust').route.stack;
  const adjustHandler = stack[stack.length - 1].handle;

  await adjustHandler(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.match(String(res.payload?.error || ''), /type must be one of/i);
});

test('POST /bulk-import validates csvRows parameter is an array', async () => {
  const req = {
    method: 'POST',
    path: '/bulk-import',
    body: {
      csvRows: 'not-an-array',
    },
    user: { businessId: 'demo-business', uid: 'demo-uid', role: 'seller' },
  };
  const res = createMockRes();

  const stack = productsRouter.stack.find((s) => s.route?.path === '/bulk-import').route.stack;
  const importHandler = stack[stack.length - 1].handle;

  await importHandler(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.match(String(res.payload?.error || ''), /csvRows must be an array/i);
});
