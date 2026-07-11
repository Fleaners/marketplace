import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signOut, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

type FirebaseRuntimeConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
};

function deriveProjectIdFromHost(hostname = typeof window !== 'undefined' ? window.location.hostname : ''): string {
  const host = String(hostname || '').toLowerCase().trim();
  if (host.endsWith('.web.app')) return host.replace('.web.app', '');
  if (host.endsWith('.firebaseapp.com')) return host.replace('.firebaseapp.com', '');
  return '';
}

function normalizeRuntimeConfig(input: Partial<FirebaseRuntimeConfig>): FirebaseRuntimeConfig {
  const projectId = input.projectId || deriveProjectIdFromHost() || 'marketplace-store-fef91';

  return {
    apiKey: String(input.apiKey || '').trim(),
    authDomain: String(input.authDomain || `${projectId}.firebaseapp.com`).trim(),
    projectId: String(projectId).trim(),
    storageBucket: String(input.storageBucket || `${projectId}.appspot.com`).trim(),
    messagingSenderId: String(input.messagingSenderId || '').trim(),
    appId: String(input.appId || '').trim(),
  };
}

function envConfig(): FirebaseRuntimeConfig {
  return normalizeRuntimeConfig({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

let servicesPromise: Promise<FirebaseServices | null> | null = null;

async function fetchConfigFromPublicEndpoint(): Promise<Partial<FirebaseRuntimeConfig>> {
  if (typeof window === 'undefined') return {};

  try {
    const apiBase = String(process.env.NEXT_PUBLIC_API_BASE || '').trim();
    const url = apiBase ? `${apiBase}/api/public/config` : '/api/public/config';
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) return {};

    const payload = await response.json();
    const firebase = payload?.firebase || {};

    return {
      apiKey: firebase.apiKey,
      authDomain: firebase.authDomain,
      projectId: firebase.projectId,
      storageBucket: firebase.storageBucket,
      messagingSenderId: firebase.messagingSenderId,
      appId: firebase.appId,
    };
  } catch {
    return {};
  }
}

export async function getFirebaseServices(): Promise<FirebaseServices | null> {
  if (servicesPromise) return servicesPromise;

  servicesPromise = (async () => {
    const fromEnv = envConfig();
    const missingCritical = !fromEnv.apiKey || !fromEnv.appId;
    const fromEndpoint = missingCritical ? await fetchConfigFromPublicEndpoint() : {};
    const resolved = normalizeRuntimeConfig({ ...fromEnv, ...fromEndpoint });

    if (!resolved.apiKey || !resolved.appId || !resolved.projectId || !resolved.authDomain) {
      console.warn('Firebase runtime config missing critical keys for Next app.');
      return null;
    }

    const app = getApps().length ? getApp() : initializeApp(resolved);
    return {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app),
    };
  })();

  return servicesPromise;
}

export async function logoutUser(): Promise<void> {
  try {
    const services = await getFirebaseServices();
    if (services?.auth) {
      await signOut(services.auth);
    }
  } catch (err) {
    console.warn('Firebase signOut failed:', err);
  }

  if (typeof window !== 'undefined') {
    // Clear all application-related localStorage keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('mp_') ||
        key.startsWith('marketplace_') ||
        key.startsWith('dashboard_') ||
        key === 'APP_VERSION'
      )) {
        localStorage.removeItem(key);
      }
    }

    // Clear all sessionStorage
    try {
      sessionStorage.clear();
    } catch {}

    // Hard redirect to clear React and memory state completely
    window.location.href = '/';
  }
}
