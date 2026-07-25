/**
 * @fileoverview Scheduled Cloud Function for automated secret rotation.
 * Runs daily via Cloud Scheduler to check if any rotatable secrets are overdue
 * for rotation based on their configured policy.
 *
 * Rotation policies:
 * - JWT_SECRET: every 90 days
 * - GEMINI_API_KEY: every 90 days
 * - NVIDIA_API_KEY: every 90 days
 * - RECAPTCHA_SECRET_KEY: every 180 days
 * - SMTP_PASS: manual (alert 14 days before deadline)
 * - TWILIO_AUTH_TOKEN: manual (alert 14 days before deadline)
 * - FIELD_ENCRYPTION_KEY: every 365 days
 */

const functions = require('firebase-functions/v1');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

/** Rotation policy definitions (in days) */
const ROTATION_POLICIES = {
  JWT_SECRET: { intervalDays: 90, autoRotate: false, alertBeforeDays: 14 },
  GEMINI_API_KEY: { intervalDays: 90, autoRotate: false, alertBeforeDays: 14 },
  NVIDIA_API_KEY: { intervalDays: 90, autoRotate: false, alertBeforeDays: 14 },
  RECAPTCHA_SECRET_KEY: { intervalDays: 180, autoRotate: false, alertBeforeDays: 14 },
  RECAPTCHA_SITE_KEY: { intervalDays: 180, autoRotate: false, alertBeforeDays: 14 },
  SMTP_PASS: { intervalDays: 180, autoRotate: false, alertBeforeDays: 14 },
  TWILIO_AUTH_TOKEN: { intervalDays: 180, autoRotate: false, alertBeforeDays: 14 },
  CLOUDINARY_API_SECRET: { intervalDays: 180, autoRotate: false, alertBeforeDays: 14 },
  FIELD_ENCRYPTION_KEY: { intervalDays: 365, autoRotate: false, alertBeforeDays: 30 },
  FIREBASE_WEB_API_KEY: { intervalDays: 180, autoRotate: false, alertBeforeDays: 14 },
  GOOGLE_CLIENT_ID: { intervalDays: 365, autoRotate: false, alertBeforeDays: 30 },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Get or initialize rotation tracking for a secret.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} secretName
 * @returns {Promise<{lastRotatedAt: number, policyIntervalDays: number}>}
 */
async function getRotationStatus(db, secretName) {
  const docRef = db.collection('secret_rotation_policy').doc(secretName);
  const doc = await docRef.get();

  if (!doc.exists) {
    // Initialize tracking — assume rotated today
    const now = Date.now();
    await docRef.set({
      secretName,
      lastRotatedAt: now,
      lastRotatedAtISO: new Date(now).toISOString(),
      intervalDays: ROTATION_POLICIES[secretName]?.intervalDays || 90,
      autoRotate: ROTATION_POLICIES[secretName]?.autoRotate || false,
      alertBeforeDays: ROTATION_POLICIES[secretName]?.alertBeforeDays || 14,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { lastRotatedAt: now, overdueDays: 0, needsAlert: false };
  }

  const data = doc.data();
  const policy = ROTATION_POLICIES[secretName] || { intervalDays: 90, alertBeforeDays: 14 };
  const lastRotated = Number(data.lastRotatedAt || Date.now());
  const daysSinceRotation = Math.floor((Date.now() - lastRotated) / MS_PER_DAY);
  const overdueDays = daysSinceRotation - policy.intervalDays;
  const needsAlert = daysSinceRotation >= (policy.intervalDays - policy.alertBeforeDays);

  return { lastRotatedAt: lastRotated, daysSinceRotation, overdueDays, needsAlert };
}

/**
 * Write a rotation alert to Firestore and Cloud Logging.
 * Never logs the actual key value.
 */
async function writeRotationAlert(db, secretName, status, details) {
  const alertData = {
    type: 'SECRET_ROTATION_ALERT',
    secretName,
    status,
    details,
    daysSinceRotation: status.daysSinceRotation,
    overdueDays: status.overdueDays,
    timestamp: FieldValue.serverTimestamp(),
    timestampMs: Date.now(),
  };

  try {
    await db.collection('security_alerts').add(alertData);
  } catch (err) {
    console.error(`[ROTATION_SCHEDULER] Failed to write alert for ${secretName}:`, err.message);
  }

  // Structured log for Cloud Logging (no secret values)
  console.warn(JSON.stringify({
    severity: 'WARNING',
    message: `Secret rotation ${status.overdueDays > 0 ? 'OVERDUE' : 'upcoming'}: ${secretName}`,
    secretName,
    daysSinceRotation: status.daysSinceRotation,
    overdueDays: status.overdueDays,
    details,
  }));
}

/**
 * Scheduled function: runs daily to check rotation status of all tracked secrets.
 * Triggers: Cloud Scheduler at 02:00 UTC daily.
 */
const checkRotationStatus = functions
  .region('us-central1')
  .pubsub.schedule('0 2 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const db = getFirestore();
    const results = [];

    for (const [secretName, policy] of Object.entries(ROTATION_POLICIES)) {
      try {
        const status = await getRotationStatus(db, secretName);

        if (status.overdueDays > 0) {
          await writeRotationAlert(db, secretName, status,
            `Secret ${secretName} is ${status.overdueDays} days overdue for rotation (policy: every ${policy.intervalDays} days).`
          );
          results.push({ secretName, status: 'OVERDUE', overdueDays: status.overdueDays });
        } else if (status.needsAlert) {
          await writeRotationAlert(db, secretName, status,
            `Secret ${secretName} rotation due in ${-status.overdueDays} days (policy: every ${policy.intervalDays} days).`
          );
          results.push({ secretName, status: 'UPCOMING', daysUntilDue: -status.overdueDays });
        } else {
          results.push({ secretName, status: 'OK', daysSinceRotation: status.daysSinceRotation });
        }
      } catch (err) {
        console.error(`[ROTATION_SCHEDULER] Error checking ${secretName}:`, err.message);
        results.push({ secretName, status: 'ERROR', error: err.message });
      }
    }

    // Summary log (structured for Cloud Logging)
    console.log(JSON.stringify({
      severity: 'INFO',
      message: 'Secret rotation check complete',
      results,
      timestamp: new Date().toISOString(),
    }));

    return null;
  });

/**
 * Record that a secret was rotated (called after successful rotation).
 * @param {string} secretName
 */
async function markSecretRotated(secretName) {
  const db = getFirestore();
  const now = Date.now();
  const docRef = db.collection('secret_rotation_policy').doc(secretName);

  await docRef.set({
    lastRotatedAt: now,
    lastRotatedAtISO: new Date(now).toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // Audit log (no key values logged)
  await db.collection('audit_logs').add({
    event: 'SECRET_ROTATION_COMPLETED',
    secret_name: secretName,
    status: 'SUCCESS',
    timestamp: new Date().toISOString(),
    timestampMs: now,
    initiated_by: 'rotation_system',
  });

  console.log(JSON.stringify({
    severity: 'INFO',
    message: `Secret rotation recorded: ${secretName}`,
    secretName,
    timestamp: new Date(now).toISOString(),
  }));
}

module.exports = { checkRotationStatus, markSecretRotated, ROTATION_POLICIES };
