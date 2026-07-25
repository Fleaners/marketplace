/**
 * @fileoverview Secret rotation service with Google Secret Manager integration.
 * Replaces the previous mock implementation with real Secret Manager API calls.
 *
 * Rotation flow:
 * 1. Generate new credential value
 * 2. Add new version to Secret Manager
 * 3. Wait for propagation (overlap window)
 * 4. Verify new credential works (optional health check)
 * 5. Disable old version
 * 6. Log rotation event to audit trail
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Lazy-load Secret Manager to avoid startup failures if not available
let smClient = null;
async function getSecretManagerClient() {
  if (smClient) return smClient;
  try {
    const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
    smClient = new SecretManagerServiceClient();
    return smClient;
  } catch (err) {
    console.error('[SECRET_ROTATION] Secret Manager client unavailable:', err.message);
    return null;
  }
}

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'marketplace-store-fef91';

/**
 * Secret key inventory with descriptions and rotation metadata.
 * @type {Record<string, {description: string, autoRotatable: boolean}>}
 */
const SECRET_INVENTORY = {
  JWT_SECRET: { description: 'Session authentication signing secret', autoRotatable: true },
  GEMINI_API_KEY: { description: 'Google Generative AI access token', autoRotatable: false },
  NVIDIA_API_KEY: { description: 'NVIDIA NIM endpoint access credential', autoRotatable: false },
  CLOUDINARY_API_SECRET: { description: 'Cloudinary media upload credential', autoRotatable: false },
  RECAPTCHA_SECRET_KEY: { description: 'reCAPTCHA Enterprise secret key', autoRotatable: false },
  SMTP_PASS: { description: 'SMTP email delivery password', autoRotatable: false },
  TWILIO_AUTH_TOKEN: { description: 'Twilio SMS API auth token', autoRotatable: false },
  FIELD_ENCRYPTION_KEY: { description: 'AES-256-GCM field encryption master key', autoRotatable: true },
  FIREBASE_WEB_API_KEY: { description: 'Firebase Web API key (public-facing)', autoRotatable: false },
};

/**
 * Generate a new cryptographically secure secret value.
 * Only used for auto-rotatable secrets (JWT_SECRET, FIELD_ENCRYPTION_KEY).
 * @param {string} secretName
 * @returns {string}
 */
function generateNewSecretValue(secretName) {
  const crypto = require('crypto');
  switch (secretName) {
    case 'JWT_SECRET':
      return crypto.randomBytes(64).toString('hex');
    case 'FIELD_ENCRYPTION_KEY':
      return crypto.randomBytes(32).toString('hex');
    default:
      throw new Error(`Cannot auto-generate value for ${secretName}. Rotation requires manual provider action.`);
  }
}

/**
 * Rotate a secret: add new version to Secret Manager with overlap window.
 *
 * @param {string} secretName - Name of the secret to rotate
 * @param {Object} [options]
 * @param {string} [options.newValue] - Pre-generated new value (for manual rotations)
 * @param {number} [options.overlapWindowMs=120000] - Grace period before disabling old version (ms)
 * @param {boolean} [options.disableOld=true] - Whether to disable the previous version
 * @returns {Promise<{success: boolean, secretName: string, newVersionNumber: string, timestamp: string}>}
 */
export async function rotateApiKey(secretName, options = {}) {
  const timestamp = new Date().toISOString();
  const {
    newValue = null,
    overlapWindowMs = 2 * 60 * 1000,
    disableOld = true,
  } = options;

  console.log(JSON.stringify({
    severity: 'INFO',
    message: `[SECRET_ROTATION] Initiating rotation for: ${secretName}`,
    secretName,
    timestamp,
    overlapWindowMs,
  }));

  const secretMeta = SECRET_INVENTORY[secretName];
  if (!secretMeta) {
    console.error(`[SECRET_ROTATION] Unknown secret: ${secretName}`);
    return { success: false, error: 'Unknown secret identifier', secretName };
  }

  const client = await getSecretManagerClient();
  if (!client) {
    console.error('[SECRET_ROTATION] Secret Manager client not available. Rotation aborted.');
    await logRotationToFirestore(secretName, 'FAILED', 'Secret Manager client unavailable');
    return { success: false, error: 'Secret Manager unavailable', secretName };
  }

  try {
    // Step 1: Determine the new value
    const rotationValue = newValue || generateNewSecretValue(secretName);
    // SECURITY: Never log the actual value
    console.log(`[SECRET_ROTATION] New value generated for ${secretName} (length: ${rotationValue.length})`);

    // Step 2: Get current version number for later disabling
    const secretPath = `projects/${PROJECT_ID}/secrets/${secretName}`;
    let previousVersionNumber = null;

    try {
      const [versions] = await client.listSecretVersions({
        parent: secretPath,
        filter: 'state:ENABLED',
      });
      if (versions.length > 0) {
        // Get the latest enabled version
        const sorted = versions.sort((a, b) =>
          Number(b.createTime?.seconds || 0) - Number(a.createTime?.seconds || 0)
        );
        const latestVersion = sorted[0].name;
        previousVersionNumber = latestVersion.split('/').pop();
      }
    } catch (listErr) {
      console.warn(`[SECRET_ROTATION] Could not list versions for ${secretName}:`, listErr.message);
    }

    // Step 3: Add new version
    const [newVersion] = await client.addSecretVersion({
      parent: secretPath,
      payload: { data: Buffer.from(rotationValue, 'utf8') },
    });
    const newVersionNumber = newVersion.name.split('/').pop();
    console.log(`[SECRET_ROTATION] New version ${newVersionNumber} added for ${secretName}. Overlap window active.`);

    // Step 4: Overlap window — both old and new versions are active
    if (disableOld && previousVersionNumber && overlapWindowMs > 0) {
      console.log(`[SECRET_ROTATION] Waiting ${overlapWindowMs}ms for propagation before disabling old version ${previousVersionNumber}`);
      await new Promise(resolve => setTimeout(resolve, overlapWindowMs));

      // Step 5: Disable old version
      try {
        await client.disableSecretVersion({
          name: `${secretPath}/versions/${previousVersionNumber}`,
        });
        console.log(`[SECRET_ROTATION] Old version ${previousVersionNumber} disabled for ${secretName}`);
      } catch (disableErr) {
        console.warn(`[SECRET_ROTATION] Failed to disable old version ${previousVersionNumber}:`, disableErr.message);
      }
    }

    // Step 6: Audit trail
    await logRotationToFirestore(secretName, 'SUCCESS', `Rotated to version ${newVersionNumber}`);

    return {
      success: true,
      secretName,
      newVersionNumber,
      previousVersionNumber,
      timestamp,
      overlapWindowMs,
    };
  } catch (err) {
    console.error(`[SECRET_ROTATION] Failed to rotate ${secretName}:`, err.message);
    await logRotationToFirestore(secretName, 'FAILED', err.message);
    return { success: false, error: err.message, secretName };
  }
}

/**
 * Log rotation event to Firestore audit trail.
 * NEVER logs the actual key value — only metadata.
 */
async function logRotationToFirestore(secretName, status, details) {
  try {
    const db = getFirestore();
    await db.collection('audit_logs').add({
      event: 'SECRET_KEY_ROTATION',
      secret_name: secretName,
      status,
      timestamp: new Date().toISOString(),
      timestampMs: Date.now(),
      initiated_by: 'Cloud Scheduler Rotation',
      details,
    });
  } catch (err) {
    console.error(`[SECRET_ROTATION] Failed to write audit log:`, err.message);
  }
}

/**
 * Get the rotation inventory with status info.
 * @returns {Record<string, {description: string, autoRotatable: boolean}>}
 */
export function getSecretInventory() {
  return { ...SECRET_INVENTORY };
}
