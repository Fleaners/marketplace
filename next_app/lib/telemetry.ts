import { getFirebaseServices } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export interface TelemetryPayload {
  promptContext: string;        // The input prompt context
  generatedResponse: string;    // Generated response snapshot from the AI
  correctedText: string;        // Final corrected text outcome
  implicitScore: number;        // Implicit score/rating (e.g. 1 for thumb-up, -1 for thumb-down, etc.)
  timestamp: string;            // ISO Timestamp
  userId?: string;              // Active seller/user ID
  featureArea: string;          // E.g. 'whatsapp-campaign', 'forecasting-lstm', 'chat-bot'
}

export async function dispatchTelemetry(payload: Omit<TelemetryPayload, 'timestamp'>) {
  try {
    const services = await getFirebaseServices();
    if (!services) {
      console.warn('Firebase services not available for telemetry dispatch');
      return;
    }
    const { db, auth } = services;
    const userId = auth.currentUser?.uid || 'anonymous';
    
    const fullPayload: TelemetryPayload = {
      ...payload,
      userId,
      timestamp: new Date().toISOString(),
    };
    
    await addDoc(collection(db, 'ai_training_feedback'), fullPayload);
    console.log('AI Self-Training Interaction Telemetry dispatched successfully:', fullPayload);
  } catch (error) {
    console.error('Failed to dispatch AI interaction telemetry:', error);
  }
}
