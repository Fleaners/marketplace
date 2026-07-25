import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Provides structured audit logging for secret rotation events.
 * @module rotationAuditLogger
 */

/**
 * Logs a successful secret rotation event to Firestore and Cloud Logging.
 * Never logs the actual secret values.
 *
 * @param {Object} params - The parameters for the audit log.
 * @param {string} params.secretName - The name of the secret being rotated.
 * @param {string} params.status - The status of the rotation (e.g., 'SUCCESS').
 * @param {string} params.initiatedBy - The user or service account that initiated the rotation.
 * @param {number} params.overlapWindowMs - The overlap window in milliseconds.
 * @param {Object} params.details - Additional metadata about the rotation.
 * @returns {Promise<void>}
 */
export async function logRotationEvent({ secretName, status, initiatedBy, overlapWindowMs, details }) {
    const db = getFirestore();
    const logEntry = {
        event: 'SECRET_KEY_ROTATION',
        secret_name: secretName,
        status,
        initiated_by: initiatedBy,
        overlap_window_ms: overlapWindowMs,
        timestamp: FieldValue.serverTimestamp(),
        details: details || {}
    };

    // Structured logging for Cloud Logging
    console.log(JSON.stringify({
        severity: 'INFO',
        message: 'Secret key rotation event',
        ...logEntry,
        timestamp: new Date().toISOString() // Fallback for console
    }));

    try {
        await db.collection('audit_logs').add(logEntry);
    } catch (error) {
        console.error(JSON.stringify({
            severity: 'ERROR',
            message: 'Failed to write rotation audit log to Firestore',
            error: error.message
        }));
    }
}

/**
 * Logs a failed secret rotation event.
 *
 * @param {Object} params - The parameters for the failure log.
 * @param {string} params.secretName - The name of the secret that failed rotation.
 * @param {Error|string} params.error - The error message or object.
 * @param {string} params.initiatedBy - The user or service account that initiated the rotation.
 * @returns {Promise<void>}
 */
export async function logRotationFailure({ secretName, error, initiatedBy }) {
    const db = getFirestore();
    const errorMessage = error instanceof Error ? error.message : error;
    
    const logEntry = {
        event: 'SECRET_KEY_ROTATION_FAILURE',
        secret_name: secretName,
        status: 'FAILURE',
        initiated_by: initiatedBy,
        error: errorMessage,
        timestamp: FieldValue.serverTimestamp()
    };

    // Structured logging for Cloud Logging
    console.error(JSON.stringify({
        severity: 'ERROR',
        message: 'Secret key rotation failed',
        ...logEntry,
        timestamp: new Date().toISOString()
    }));

    try {
        await db.collection('audit_logs').add(logEntry);
    } catch (dbError) {
        console.error(JSON.stringify({
            severity: 'ERROR',
            message: 'Failed to write rotation failure log to Firestore',
            error: dbError.message
        }));
    }
}
