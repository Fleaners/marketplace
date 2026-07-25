import { getFirestore } from 'firebase-admin/firestore';

const MEMORY_COLLECTION = 'ai_memory';
const MAX_MEMORY_ENTRIES = 50;

/**
 * Save an AI interaction to business memory.
 */
export async function saveMemory(businessId, entry) {
  if (!businessId) return null;
  try {
    const db = getFirestore();
    const ref = db
      .collection('businesses')
      .doc(businessId)
      .collection(MEMORY_COLLECTION);

    const doc = await ref.add({
      agent_domain: entry.agentDomain || 'general',
      prompt_summary: String(entry.promptSummary || '').slice(0, 500),
      recommendation: String(entry.recommendation || '').slice(0, 2000),
      confidence: entry.confidence || 'Medium',
      evidence: Array.isArray(entry.evidence) ? entry.evidence.slice(0, 5) : [],
      alternatives: Array.isArray(entry.alternatives) ? entry.alternatives.slice(0, 3) : [],
      impact: String(entry.impact || '').slice(0, 500),
      draft_actions: Array.isArray(entry.draftActions) ? entry.draftActions.slice(0, 5) : [],
      feedback: null, // 'approved' | 'rejected' | null
      created_at: new Date().toISOString(),
    });

    // Prune old entries to keep memory lean
    const snapshot = await ref.orderBy('created_at', 'asc').get();
    if (snapshot.size > MAX_MEMORY_ENTRIES) {
      const toDelete = snapshot.docs.slice(0, snapshot.size - MAX_MEMORY_ENTRIES);
      const batch = db.batch();
      toDelete.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    return doc.id;
  } catch (err) {
    console.warn('aiMemory.saveMemory error:', err.message);
    return null;
  }
}

/**
 * Retrieve recent AI memory for a business.
 */
export async function getMemory(businessId, limit = 10) {
  if (!businessId) return [];
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection(MEMORY_COLLECTION)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn('aiMemory.getMemory error:', err.message);
    return [];
  }
}

/**
 * Apply user feedback to a memory entry (approved | rejected).
 */
export async function applyFeedback(businessId, memoryId, feedback) {
  if (!businessId || !memoryId) return false;
  try {
    const db = getFirestore();
    await db
      .collection('businesses')
      .doc(businessId)
      .collection(MEMORY_COLLECTION)
      .doc(memoryId)
      .update({ feedback, feedback_at: new Date().toISOString() });
    return true;
  } catch (err) {
    console.warn('aiMemory.applyFeedback error:', err.message);
    return false;
  }
}

/**
 * Reset all AI memory for a business.
 */
export async function resetMemory(businessId) {
  if (!businessId) return false;
  try {
    const db = getFirestore();
    const ref = db
      .collection('businesses')
      .doc(businessId)
      .collection(MEMORY_COLLECTION);

    const snapshot = await ref.get();
    if (snapshot.empty) return true;

    const batch = db.batch();
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return true;
  } catch (err) {
    console.warn('aiMemory.resetMemory error:', err.message);
    return false;
  }
}
