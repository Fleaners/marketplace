const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SALT = 'ZTA_ROOT_PERMISSION_MFA_SALT_2026';
const AUDIT_LOG_PATH = path.join(__dirname, '..', 'logs', 'unauthorized_vault_access.log');

let isVaultInitialized = false;

// Ensure directory for logs exists
function ensureLogDir() {
  try {
    const logDir = path.dirname(AUDIT_LOG_PATH);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (err) {
    // Silently ignore directory creation failure in read-only filesystems
  }
}

function writeAuditLog(event, details) {
  const logMessage = `[${new Date().toISOString()}] [HIGH-SEVERITY] [ZTA-VIOLATION] Event: ${event} | Details: ${details}`;
  try {
    ensureLogDir();
    fs.appendFileSync(AUDIT_LOG_PATH, logMessage + '\n', 'utf8');
  } catch (err) {
    if (err.code === 'EROFS') {
      console.warn(`[AUDIT-LOG-REDIRECT] Persistent file write bypassed on read-only serverless container. Event securely routed to system console output stream.`);
    } else {
      console.error('CRITICAL: Failed to write to audit log:', err);
    }
  }
  // Guarantee logging to unalterable console system stream (GCP Cloud Logging)
  console.error(`[SYSTEM-AUDIT-TRAIL] ${logMessage}`);
}

function terminateWithViolation(event, details) {
  writeAuditLog(event, details);
  console.error(`\n==================================================`);
  console.error(`!!! CRITICAL SECURITY BREACH DETECTED !!!`);
  console.error(`Event: ${event}`);
  console.error(`Details: ${details}`);
  console.error(`Action: Terminating process, dropping all session states.`);
  console.error(`==================================================\n`);
  
  // Terminate instantly to prevent memory/key leakage
  process.exit(1);
}

function initVault() {
  const handshakeKey = process.env.MP_OWNER_HANDSHAKE_KEY;
  if (!handshakeKey) {
    console.warn('WARNING: MP_OWNER_HANDSHAKE_KEY is missing. Vault initialization deferred.');
    isVaultInitialized = false;
    return;
  }

  // Derive the cryptographic key
  const key = crypto.scryptSync(handshakeKey, SALT, 32);

  const encryptedPath = path.join(__dirname, '..', '.env.encrypted');
  if (!fs.existsSync(encryptedPath)) {
    const standardEnvPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(standardEnvPath)) {
      console.warn('WARNING: Running in fallback mode using standard .env file.');
      require('dotenv').config();
      isVaultInitialized = true;
      return;
    }
    terminateWithViolation('MISSING_VAULT_FILE', 'No .env.encrypted vault found in directory.');
  }

  try {
    const rawContent = fs.readFileSync(encryptedPath, 'utf8').trim();
    const parts = rawContent.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid vault payload format. Expected iv:tag:ciphertext');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const ciphertext = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, 'binary', 'utf8');
    decrypted += decipher.final('utf8');

    // Parse decrypted content as env format
    const lines = decrypted.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index === -1) continue;
      const k = trimmed.slice(0, index).trim();
      const v = trimmed.slice(index + 1).trim();
      process.env[k] = v;
    }

    isVaultInitialized = true;
    console.log('Secure secrets vault decrypted and mounted successfully in memory.');
  } catch (err) {
    terminateWithViolation('DECRYPTION_FAILED', `Failed to decrypt the secure secrets vault. Invalid handshake token. Error: ${err.message}`);
  }
}

function shieldEndpoint(req, res, next) {
  // Ensure vault is initialized before processing any requests
  if (!isVaultInitialized) {
    return terminateWithViolation(
      'MISSING_HANDSHAKE_KEY',
      `API request received on ${req.originalUrl || req.url} from IP ${req.ip} but secrets vault was never initialized due to missing MP_OWNER_HANDSHAKE_KEY.`
    );
  }

  // Ensure that no internal administrative parameters ever leak to public endpoints.
  const authHeader = req.headers.authorization;
  const pathQueried = req.originalUrl || req.url;

  if (pathQueried.includes('config') && authHeader) {
    const maskedAuth = authHeader.length > 16
      ? authHeader.slice(0, 7) + '***...' + authHeader.slice(-8)
      : '[REDACTED]';
    return terminateWithViolation(
      'UNAUTHORIZED_ADMIN_READ_ATTEMPT',
      `IP: ${req.ip} attempted to read configuration parameters with authorization headers: ${maskedAuth}`
    );
  }
  
  next();
}

module.exports = {
  initVault,
  shieldEndpoint,
  writeAuditLog,
  terminateWithViolation,
};
