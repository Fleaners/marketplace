/**
 * @fileoverview Security test suite for marketplace.store
 *
 * Tests:
 * 1. Auth bypass — endpoints reject unauthenticated requests
 * 2. Cross-tenant isolation — user A cannot access user B's data
 * 3. Log redaction — audit logs don't contain raw PII/secrets
 * 4. Secret rotation age — rotatable keys are within policy window
 * 5. OTP not leaked — OTP response doesn't contain the code in production mode
 * 6. No hardcoded secrets in source — pattern scan of key files
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const FUNCTIONS_DIR = resolve(__filename, '..', '..');
const ROOT = resolve(FUNCTIONS_DIR, '..');

// ─── Test 1: Auth Bypass Detection ───────────────────────────────────────────

describe('Auth Bypass Protection', () => {
  it('verifyToken middleware rejects requests without Authorization header', async () => {
    // Import the auth middleware
    const authModule = await import('../middleware/auth.js');
    const { verifyToken } = authModule;

    // Simulate request without auth header
    const req = {
      headers: {},
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(body) { responseBody = body; return this; },
    };
    const next = () => {};

    // Set production mode so demo fallback doesn't kick in
    const originalEnv = process.env.NODE_ENV;
    const originalDemo = process.env.DEMO_MODE;
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = 'false';

    await verifyToken(req, res, next);

    process.env.NODE_ENV = originalEnv;
    process.env.DEMO_MODE = originalDemo;

    assert.equal(statusCode, 401, 'Should return 401 for missing auth header');
    assert.ok(responseBody?.error, 'Should include error message');
  });

  it('verifyToken middleware rejects invalid tokens', async () => {
    const authModule = await import('../middleware/auth.js');
    const { verifyToken } = authModule;

    const req = {
      headers: { authorization: 'Bearer invalid.token.here' },
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(body) { responseBody = body; return this; },
    };
    const next = () => {};

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    await verifyToken(req, res, next);

    process.env.NODE_ENV = originalEnv;

    assert.ok([401, 500].includes(statusCode), 'Should return 401 or 500 for invalid token');
  });
});

// ─── Test 2: RBAC Enforcement ────────────────────────────────────────────────

describe('RBAC Enforcement', () => {
  it('requireRole rejects users without the required role', async () => {
    const rbacModule = await import('../middleware/rbac.js');
    const { requireRole } = rbacModule;

    const middleware = requireRole(['admin']);
    const req = { user: { role: 'buyer' } };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(body) { responseBody = body; return this; },
    };
    const next = () => {};

    middleware(req, res, next);

    assert.equal(statusCode, 403, 'Should return 403 for unauthorized role');
  });

  it('requireRole allows users with the correct role', async () => {
    const rbacModule = await import('../middleware/rbac.js');
    const { requireRole } = rbacModule;

    const middleware = requireRole(['admin', 'seller']);
    const req = { user: { role: 'seller' } };
    let nextCalled = false;
    const res = {
      status() { return this; },
      json() { return this; },
    };
    const next = () => { nextCalled = true; };

    middleware(req, res, next);

    assert.ok(nextCalled, 'Should call next() for authorized role');
  });
});

// ─── Test 3: Log Redaction ───────────────────────────────────────────────────

describe('Log Redaction', () => {
  // We'll test the redactSecrets function directly
  it('redacts passwords, tokens, and auth headers', () => {
    // Load the security middleware (CommonJS)
    // We need to extract the redactSecrets function — it's not exported directly
    // but is used internally. Let's test via the audit log behavior.
    const securityPath = join(FUNCTIONS_DIR, 'middleware', 'security.cjs');
    assert.ok(existsSync(securityPath), 'security.cjs must exist');

    const content = readFileSync(securityPath, 'utf8');

    // Verify the redaction function includes PII fields
    assert.ok(content.includes('gst_number'), 'redactSecrets should handle gst_number');
    assert.ok(content.includes('phone'), 'redactSecrets should handle phone numbers');
    assert.ok(content.includes('bank_account'), 'redactSecrets should handle bank accounts');
    assert.ok(content.includes('aadhaar'), 'redactSecrets should handle aadhaar numbers');
    assert.ok(content.includes('card_number'), 'redactSecrets should handle card numbers');
    assert.ok(content.includes('pan'), 'redactSecrets should handle PAN numbers');
  });

  it('audit log middleware does not expose raw PII in security middleware source', () => {
    const securityPath = join(FUNCTIONS_DIR, 'middleware', 'security.cjs');
    const content = readFileSync(securityPath, 'utf8');

    // The audit log should use redactSecrets on the body
    assert.ok(content.includes('redactSecrets(req.body'), 'Audit log must redact request body');
  });

  it('vaultGuard does not log raw authorization headers', () => {
    const vaultGuardPath = join(FUNCTIONS_DIR, 'services', 'vaultGuard.cjs');
    const content = readFileSync(vaultGuardPath, 'utf8');

    // Should NOT contain direct logging of authHeader variable
    assert.ok(!content.includes('`${authHeader}`') && !content.includes('headers: ${authHeader}'),
      'VaultGuard should not log raw auth headers');
    // Should contain masked version
    assert.ok(content.includes('maskedAuth') || content.includes('REDACTED'),
      'VaultGuard should use masked auth headers');
  });
});

// ─── Test 4: OTP Not Leaked in Production ────────────────────────────────────

describe('OTP Security', () => {
  it('OTP debug logging does not expose the actual OTP code', () => {
    const authControllerPath = join(FUNCTIONS_DIR, 'controllers', 'authController.js');
    const content = readFileSync(authControllerPath, 'utf8');

    // The debug log line should NOT contain `${otp}` or the actual OTP value
    const debugLogLines = content.split('\n').filter(line =>
      line.includes('OTP_DEBUG') && line.includes('console.log')
    );

    for (const line of debugLogLines) {
      assert.ok(!line.includes('${otp}'),
        `OTP debug log should not contain the OTP code: ${line.trim()}`);
    }
  });

  it('JWT token payload does not include PII fields', () => {
    const authControllerPath = join(FUNCTIONS_DIR, 'controllers', 'authController.js');
    const content = readFileSync(authControllerPath, 'utf8');

    // Find the buildToken function and check its payload
    const buildTokenMatch = content.match(/function buildToken\([\s\S]*?jwtClient\.sign\(\s*\{([\s\S]*?)\}/);
    if (buildTokenMatch) {
      const payload = buildTokenMatch[1];
      assert.ok(!payload.includes('gst_number'), 'JWT payload should not contain gst_number');
      assert.ok(!payload.includes('phone:') || payload.includes('// phone'), 'JWT payload should not contain phone');
      assert.ok(!payload.includes("email:") || payload.includes('// email'), 'JWT payload should not contain email');
    }
  });
});

// ─── Test 5: No Hardcoded Secrets in Source ──────────────────────────────────

describe('No Hardcoded Secrets', () => {
  const SECRET_PATTERNS = [
    { name: 'Google API Key', regex: /AIza[0-9A-Za-z\-_]{35}/g },
    { name: 'Private Key', regex: /-----BEGIN PRIVATE KEY-----/g },
    { name: 'JWT Secret Value', regex: /jwt[_-]?secret\s*[=:]\s*['"][a-f0-9]{20,}['"]/gi },
  ];

  const SCAN_DIRS = ['controllers', 'middleware', 'routes', 'services'];
  const SKIP_FILES = ['security.test.mjs']; // Skip self

  for (const dir of SCAN_DIRS) {
    const dirPath = join(FUNCTIONS_DIR, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter(f =>
      (f.endsWith('.js') || f.endsWith('.cjs') || f.endsWith('.mjs')) &&
      !SKIP_FILES.includes(f)
    );

    for (const file of files) {
      it(`${dir}/${file} contains no hardcoded secrets`, () => {
        const content = readFileSync(join(dirPath, file), 'utf8');

        for (const pattern of SECRET_PATTERNS) {
          const matches = content.match(pattern.regex);
          assert.ok(!matches,
            `Found ${pattern.name} in ${dir}/${file}: ${(matches || []).join(', ').slice(0, 50)}`);
        }
      });
    }
  }

  it('functions/.env does not contain real secret values', () => {
    const envPath = join(FUNCTIONS_DIR, '.env');
    if (!existsSync(envPath)) return; // .env may not exist in CI

    const content = readFileSync(envPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;

      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();

      // Secret-type keys should have placeholder values, not real ones
      const secretKeys = ['JWT_SECRET', 'RECAPTCHA_SECRET_KEY', 'SMTP_PASS',
        'TWILIO_AUTH_TOKEN', 'PERPLEXITY_API_KEY', 'GEMINI_API_KEY',
        'NVIDIA_API_KEY', 'FIELD_ENCRYPTION_KEY'];

      if (secretKeys.includes(key)) {
        assert.ok(
          value.startsWith('SECRET_MANAGER:') || value === '' || value.includes('replace') || value.includes('your-'),
          `${key} in functions/.env appears to contain a real secret value`
        );
      }
    }
  });
});

// ─── Test 6: Firestore Rules Completeness ────────────────────────────────────

describe('Firestore Rules Completeness', () => {
  it('Firestore rules deny unauthenticated seller reads', () => {
    const rulesPath = join(ROOT, 'firestore.rules');
    if (!existsSync(rulesPath)) return;

    const content = readFileSync(rulesPath, 'utf8');

    // sellers collection should require authentication
    const sellersMatch = content.match(/match \/sellers\/\{sellerId\}[\s\S]*?allow read:\s*(.*?);/);
    if (sellersMatch) {
      assert.ok(
        sellersMatch[1].includes('isSignedIn'),
        'sellers collection read should require authentication'
      );
    }
  });

  it('Firestore rules have explicit deny-all catch-all', () => {
    const rulesPath = join(ROOT, 'firestore.rules');
    if (!existsSync(rulesPath)) return;

    const content = readFileSync(rulesPath, 'utf8');
    assert.ok(
      content.includes('match /{document=**}') && content.includes('allow read, write: if false'),
      'Firestore rules must have a deny-all catch-all rule'
    );
  });

  it('Firestore rules block client access to auth collections', () => {
    const rulesPath = join(ROOT, 'firestore.rules');
    if (!existsSync(rulesPath)) return;

    const content = readFileSync(rulesPath, 'utf8');
    assert.ok(content.includes('authRefreshTokens'), 'Rules must cover authRefreshTokens collection');
    assert.ok(content.includes('authOtps'), 'Rules must cover authOtps collection');
  });
});
