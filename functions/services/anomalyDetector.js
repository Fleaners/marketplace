import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Provides lightweight anomaly detection for security monitoring.
 * @module anomalyDetector
 */

// In-memory maps to track access windows
const accessTracking = new Map();
const authFailureTracking = new Map();

/**
 * Cleans up old entries from a tracking map based on the window size.
 * @param {Map} trackingMap - The map to clean.
 * @param {number} windowMs - The time window in milliseconds.
 */
function cleanupOldEntries(trackingMap, windowMs) {
    const now = Date.now();
    for (const [key, data] of trackingMap.entries()) {
        const validTimestamps = data.timestamps.filter(ts => now - ts <= windowMs);
        if (validTimestamps.length === 0) {
            trackingMap.delete(key);
        } else {
            data.timestamps = validTimestamps;
        }
    }
}

/**
 * Checks for anomalous access patterns and alerts if thresholds are exceeded.
 * 
 * @param {Object} params - The parameters for the access event.
 * @param {string} params.userId - The ID of the user performing the action.
 * @param {string} params.action - The action being performed (e.g., 'READ', 'AUTH_FAILURE').
 * @param {string} params.targetCollection - The target collection or resource being accessed.
 * @param {string} params.ip - The IP address of the user.
 * @returns {Promise<void>}
 */
export async function checkAccessAnomaly({ userId, action, targetCollection, ip }) {
    const now = Date.now();
    const db = getFirestore();

    if (action === 'READ' && targetCollection === 'merchants') {
        const windowMs = 10 * 60 * 1000; // 10 minutes
        const threshold = 100;
        
        cleanupOldEntries(accessTracking, windowMs);
        
        let userData = accessTracking.get(userId) || { timestamps: [] };
        userData.timestamps.push(now);
        accessTracking.set(userId, userData);

        if (userData.timestamps.length > threshold && !userData.alerted) {
            userData.alerted = true; // Prevent spamming alerts
            await triggerAlert({
                type: 'EXCESSIVE_MERCHANT_READS',
                userId,
                ip,
                count: userData.timestamps.length,
                threshold,
                action_taken: 'LOG_AND_ALERT'
            });
        }
    }

    if (action === 'AUTH_FAILURE') {
        const windowMs = 5 * 60 * 1000; // 5 minutes
        const threshold = 50;

        cleanupOldEntries(authFailureTracking, windowMs);

        let ipData = authFailureTracking.get(ip) || { timestamps: [] };
        ipData.timestamps.push(now);
        authFailureTracking.set(ip, ipData);

        if (ipData.timestamps.length > threshold && !ipData.alerted) {
            ipData.alerted = true;
            await triggerAlert({
                type: 'EXCESSIVE_AUTH_FAILURES',
                userId,
                ip,
                count: ipData.timestamps.length,
                threshold,
                action_taken: 'LOG_AND_ALERT'
            });
        }
    }
}

/**
 * Internal function to trigger and log an alert to Firestore and Cloud Logging.
 * @param {Object} alertData - The alert metadata.
 * @returns {Promise<void>}
 */
async function triggerAlert(alertData) {
    const db = getFirestore();
    const alertEntry = {
        ...alertData,
        timestamp: FieldValue.serverTimestamp()
    };

    console.warn(JSON.stringify({
        severity: 'WARNING',
        message: 'Security anomaly detected',
        ...alertData,
        timestamp: new Date().toISOString()
    }));

    try {
        await db.collection('security_alerts').add(alertEntry);
    } catch (error) {
        console.error('Failed to write security alert to Firestore:', error);
    }
}

/**
 * Retrieves recently triggered security alerts from Firestore.
 * @returns {Promise<Array>} A list of recent alerts.
 */
export async function getActiveAlerts() {
    const db = getFirestore();
    try {
        const snapshot = await db.collection('security_alerts')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        const alerts = [];
        snapshot.forEach(doc => {
            alerts.push({ id: doc.id, ...doc.data() });
        });
        return alerts;
    } catch (error) {
        console.error('Failed to retrieve security alerts:', error);
        return [];
    }
}

/**
 * Resets the in-memory tracking counters. Primarily used for testing.
 */
export function resetCounters() {
    accessTracking.clear();
    authFailureTracking.clear();
}
