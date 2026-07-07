const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SALT = 'ZTA_ROOT_PERMISSION_MFA_SALT_2026';

function encrypt() {
  const handshakeKey = process.env.MP_OWNER_HANDSHAKE_KEY || process.argv[2];
  if (!handshakeKey) {
    console.error('ERROR: MP_OWNER_HANDSHAKE_KEY must be provided as process.env.MP_OWNER_HANDSHAKE_KEY or as the first argument.');
    console.error('Usage: node encrypt_vault.cjs [handshake_key]');
    process.exit(1);
  }

  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error(`ERROR: Raw environment file not found at: ${envPath}`);
    process.exit(1);
  }

  const rawEnv = fs.readFileSync(envPath, 'utf8');

  // Derive the cryptographic key
  const key = crypto.scryptSync(handshakeKey, SALT, 32);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(rawEnv, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const tag = cipher.getAuthTag().toString('hex');
  const payload = `${iv.toString('hex')}:${tag}:${ciphertext}`;

  const encryptedPath = path.join(__dirname, '..', '.env.encrypted');
  fs.writeFileSync(encryptedPath, payload, 'utf8');

  console.log(`==================================================`);
  console.log(`SECURE VAULT ENCRYPTION COMPLETE`);
  console.log(`Input: ${envPath}`);
  console.log(`Output: ${encryptedPath}`);
  console.log(`Status: Immutable Ciphertext Written (AES-256-GCM)`);
  console.log(`==================================================`);
}

encrypt();
