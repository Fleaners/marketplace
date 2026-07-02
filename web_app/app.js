const API_URL = (() => {
  const params = new URLSearchParams(window.location.search);
  const queryApi = params.get('api');
  const storedApi = localStorage.getItem('API_URL');
  const PERMANENT_API_URL = 'https://marketplacestore-production.up.railway.app';
  const hostname = window.location.hostname;
  const isGitHubHosted = hostname.endsWith('github.io');
  const isFirebaseHosted = hostname.endsWith('web.app') || hostname.endsWith('firebaseapp.com');

  if (queryApi) return queryApi;
  if (storedApi) return storedApi;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:5000';
  if (isFirebaseHosted) return window.location.origin;
  if (isGitHubHosted) return PERMANENT_API_URL;
  return window.location.origin || PERMANENT_API_URL;
})();

let firebaseConfig = null;

let auth = null;
let googleProvider = null;
let db = null;
let analyticsInstance = null;
let currentUser = null;
let currentUserProfile = null;
let confirmationResult = null;
let pendingPhoneAuthContext = null;
let authMode = 'login';
let recaptchaSiteKey = '';
let isPhoneOtpSending = false;
let isPhoneOtpVerifying = false;
let isGoogleSignInInProgress = false;
let otpSendCooldownUntil = 0;
let isAuthSubmitting = false;

// Lightweight non-blocking toast for user messages (replaces alert())
function showToast(message, { type = 'info', duration = 4000 } = {}) {
  try {
    const existing = document.getElementById('mp_toast_container');
    const container = existing || (() => {
      const el = document.createElement('div');
      el.id = 'mp_toast_container';
      el.style.position = 'fixed';
      el.style.zIndex = 99999;
      el.style.right = '16px';
      el.style.bottom = '16px';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.gap = '8px';
      document.body.appendChild(el);
      return el;
    })();

    const toast = document.createElement('div');
    toast.className = `mp_toast mp_toast_${type}`;
    toast.textContent = String(message || '');
    toast.style.background = type === 'error' ? 'rgba(180,40,40,0.95)' : 'rgba(32,33,36,0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    toast.style.maxWidth = '320px';
    toast.style.fontSize = '14px';
    toast.style.lineHeight = '1.3';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 220ms ease, transform 220ms ease';
    toast.style.transform = 'translateY(6px)';

    container.appendChild(toast);
    // allow CSS/paint
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
    return toast;
  } catch (e) {
    // Fallback to console
    try { console.log('Toast:', message); } catch (err) {}
    return null;
  }
}

// Replace blocking alert() with non-blocking toast for better UX and test stability.
try { window.alert = (msg) => showToast(String(msg || ''), { type: 'info' }); } catch (e) {}

const AUTH_STORAGE_KEYS = {
  user: 'mp_user',
  backendToken: 'mp_backend_token',
  backendRefreshToken: 'mp_backend_refresh_token',
  backendBusiness: 'mp_backend_business',
  pendingGoogleRole: 'mp_pending_google_role',
  pendingGoogleMode: 'mp_pending_google_mode',
  pendingGoogleGst: 'mp_pending_google_gst',
};

const SELLER_REQUIRED_FIELDS = ['businessName', 'category', 'whatsappNumber', 'mobileNumber'];

const wizardState = {
  open: false,
  role: 'buyer',
  step: 1,
  data: {},
};

function deriveProjectIdFromHost(hostname = window.location.hostname) {
  const host = String(hostname || '').toLowerCase().trim();
  if (host.endsWith('.web.app')) return host.replace('.web.app', '');
  if (host.endsWith('.firebaseapp.com')) return host.replace('.firebaseapp.com', '');
  return '';
}

function hydrateFirebaseConfig(partialConfig = {}) {
  const projectId = partialConfig.projectId || deriveProjectIdFromHost();
  return {
    ...partialConfig,
    projectId,
    authDomain: partialConfig.authDomain || (projectId ? `${projectId}.firebaseapp.com` : ''),
    storageBucket: partialConfig.storageBucket || (projectId ? `${projectId}.appspot.com` : ''),
  };
}

const GA_MEASUREMENT_ID = (() => {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('ga4_id');
  const fromStorage = localStorage.getItem('GA4_MEASUREMENT_ID');
  if (fromQuery) {
    localStorage.setItem('GA4_MEASUREMENT_ID', fromQuery);
    return fromQuery;
  }
  return fromStorage || '';
})();

function setupGa4() {
  if (!GA_MEASUREMENT_ID || window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: true,
    page_title: 'marketplace-store-fef91.web.app',
  });
}

function getDeviceType() {
  const width = window.innerWidth;
  if (width <= 760) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

function trackGaEvent(eventName, params = {}) {
  const privacy = JSON.parse(localStorage.getItem('mp_privacy_settings') || '{}');
  if (privacy.analytics === false) return;

  if (window.gtag) {
    window.gtag('event', eventName, params);
  }

  // Server-side analytics ingestion is disabled client-side until CSRF-compatible
  // event ingestion is finalized. This avoids noisy failed network requests.
}

async function safeClipboardWrite(textToCopy) {
  const text = String(textToCopy || '').slice(0, 4000);
  if (!text) return false;

  const consent = window.confirm('Copy this text to your clipboard?');
  if (!consent) return false;

  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'clipboard-write' });
      if (status.state === 'denied') {
        return false;
      }
    }
  } catch (error) {
    // Some browsers do not support querying clipboard permissions.
  }

  if (!navigator.clipboard?.writeText) return false;
  await navigator.clipboard.writeText(text);
  return true;
}

const FIRESTORE_COLLECTIONS = {
  users: 'users',
  products: 'products',
  orders: 'orders',
  productViews: 'productViews',
  inquiries: 'inquiries',
  wishlist: 'wishlist',
  analytics: 'analytics',
  messages: 'messages',
  savedSuppliers: 'savedSuppliers',
  rfqs: 'rfqs',
  sellers: 'sellers',
  categories: 'categories',
};

function initFirebaseAuth() {
  if (!window.firebase || !window.firebase.apps) {
    console.warn('Firebase SDK not loaded.');
    return;
  }

  firebaseConfig = hydrateFirebaseConfig(firebaseConfig || {});
  if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    console.warn('Firebase client configuration is missing.');
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  auth = firebase.auth();
  db = firebase.firestore();
  googleProvider = new firebase.auth.GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
    console.warn('Unable to set auth persistence to LOCAL', error);
  });

  auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      const profile = await ensureUserProfile(user, null, '', { createIfMissing: false });
      if (profile) {
        currentUserProfile = profile;
        localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(profile));
        fillProfile();
        routeSignedInUser(profile);
        await maybeLaunchProfileWizard(profile, user);
        await refreshBackendSessionIfNeeded();
      } else {
        currentUserProfile = null;
        localStorage.removeItem(AUTH_STORAGE_KEYS.user);
        fillProfile();
      }
    } else {
      currentUserProfile = null;
      localStorage.removeItem(AUTH_STORAGE_KEYS.user);
      clearBackendSession();
      fillProfile();
      showView('homeView');
    }
  });

  handleGoogleRedirectResult();

  analyticsInstance = firebase.analytics ? firebase.analytics() : null;
}

async function loadFirebasePublicConfig() {
  const fromWindow = window.MP_FIREBASE_CONFIG || null;
  if (fromWindow && fromWindow.apiKey) {
    firebaseConfig = hydrateFirebaseConfig(fromWindow);
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/public/config`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return;
    const payload = await response.json();
    const config = payload?.firebase || null;
    const recaptchaConfig = payload?.recaptcha || null;
    const hydratedConfig = hydrateFirebaseConfig(config || {});
    if (hydratedConfig && hydratedConfig.apiKey && hydratedConfig.authDomain && hydratedConfig.projectId) {
      firebaseConfig = hydratedConfig;
    } else {
      console.warn('Firebase public config loaded but missing required keys (apiKey/authDomain/projectId).');
    }
    if (recaptchaConfig && recaptchaConfig.siteKey) {
      recaptchaSiteKey = recaptchaConfig.siteKey;
    }
  } catch (error) {
    // Keep auth disabled if config cannot be loaded.
  }
}

async function executeRecaptchaAction(action) {
  const siteKey = String(recaptchaSiteKey || '').trim();
  if (!siteKey) return '';
  if (!window.grecaptcha || !window.grecaptcha.enterprise) return '';

  try {
    await new Promise((resolve) => {
      window.grecaptcha.enterprise.ready(resolve);
    });
    const token = await window.grecaptcha.enterprise.execute(siteKey, { action });
    return String(token || '').trim();
  } catch (error) {
    return '';
  }
}

async function ensureUserProfile(user, roleOverride = null, gstNumber = '', options = {}) {
  const createIfMissing = options.createIfMissing !== false;
  const extra = options.extra || {};

  if (!db) {
    if (!createIfMissing && !roleOverride) return null;

    const role = roleOverride || 'buyer';
    const whatsappNumber = String(extra.whatsappNumber || '').trim();
    const isSellerActive = role !== 'seller' || !!whatsappNumber;
    return {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Marketplace User',
      email: user.email,
      role,
      createdAt: new Date().toISOString(),
      profileComplete: role === 'seller' ? false : true,
      profileCompletion: role === 'seller' ? 45 : 55,
      verified: role === 'seller' ? isSellerActive : true,
      whatsappNumber,
      mobileNumber: extra.mobileNumber || '',
      businessName: extra.businessName || '',
      category: extra.category || '',
      website: extra.website || '',
      businessRegistrationNumber: extra.businessRegistrationNumber || '',
      address: extra.address || '',
      gstNumber: gstNumber || '',
      whatsappVerified: role === 'seller' ? !!whatsappNumber : false,
      gstVerified: !!gstNumber,
      onboardingCompleted: false,
      sellerActive: isSellerActive,
    };
  }

  const userRef = db.collection(FIRESTORE_COLLECTIONS.users).doc(user.uid);
  const snapshot = await userRef.get();
  if (!snapshot.exists && !createIfMissing) return null;

  const existing = snapshot.exists ? snapshot.data() : {};
  const role = roleOverride || existing?.role || 'buyer';
  const whatsappNumber = String(extra.whatsappNumber || existing?.whatsappNumber || '').trim();
  const businessName = String(extra.businessName || existing?.businessName || '').trim();
  const category = String(extra.category || existing?.category || '').trim();
  const mobileNumber = String(extra.mobileNumber || existing?.mobileNumber || existing?.phone || '').trim();
  const website = String(extra.website || existing?.website || '').trim();
  const businessRegistrationNumber = String(extra.businessRegistrationNumber || existing?.businessRegistrationNumber || '').trim();
  const address = String(extra.address || existing?.address || '').trim();
  const city = String(extra.city || existing?.city || '').trim();
  const stateName = String(extra.state || existing?.state || '').trim();

  const sellerReady = role !== 'seller' || SELLER_REQUIRED_FIELDS.every((field) => {
    const valueMap = {
      businessName,
      category,
      whatsappNumber,
      mobileNumber,
    };
    return String(valueMap[field] || '').trim().length > 0;
  });

  const profileData = {
    uid: user.uid,
    name: user.displayName || existing?.name || user.email?.split('@')[0] || 'Marketplace User',
    email: user.email,
    role,
    createdAt: existing?.createdAt || new Date().toISOString(),
    profileComplete: existing?.profileComplete || false,
    profileCompletion: Number(existing?.profileCompletion || 0),
    verified: role === 'seller' ? sellerReady : true,
    mobileNumber,
    whatsappNumber,
    businessName,
    category,
    website,
    businessRegistrationNumber,
    address,
    city,
    state: stateName,
    gstNumber: gstNumber || existing?.gstNumber || '',
    whatsappVerified: existing?.whatsappVerified || false,
    gstVerified: !!(gstNumber || existing?.gstNumber || ''),
    onboardingCompleted: existing?.onboardingCompleted || false,
    sellerActive: role === 'seller' ? sellerReady : true,
    lastLogin: new Date(),
  };

  await userRef.set(profileData, { merge: true });
  return profileData;
}

function routeSignedInUser(profile) {
  if (!profile) return;
  const path = window.location.pathname || '/';

  if (path === '/messages') {
    if (profile.role === 'seller') {
      showView('sellerDashboard');
      loadSellerDashboard(profile);
      scrollToSection('#sellerLeadInbox');
      return;
    }
    showView('homeView');
    showBuyerTab('messages');
    return;
  }

  if (path === '/seller') {
    if (profile.role === 'seller') {
      showView('sellerDashboard');
      loadSellerDashboard(profile);
      return;
    }
    showView('homeView');
    openAuthDrawer('register');
    const roleSelect = document.getElementById('authRole');
    if (roleSelect) roleSelect.value = 'seller';
    return;
  }

  if (path === '/buyer') {
    showView('homeView');
    if (profile) {
      showBuyerTab('profile');
    } else {
      showBuyerTab('home');
      openAuthDrawer('login');
    }
    return;
  }

  if (path.startsWith('/business/')) {
    showView('homeView');
    return;
  }

  if (profile.role === 'seller') {
    showView('sellerDashboard');
    loadSellerDashboard(profile);
    return;
  }

  if (profile.role === 'admin') {
    showView('adminDashboard');
    loadAdminDashboard();
    return;
  }

  showView('homeView');
  showBuyerTab('home');
}

function openMessagesPage() {
  const user = JSON.parse(localStorage.getItem('mp_user') || 'null');
  history.pushState({ type: 'messages' }, '', '/messages');

  if (!user) {
    showView('homeView');
    showBuyerTab('home');
    openAuthDrawer('login');
    return;
  }

  if (user.role === 'seller') {
    showView('sellerDashboard');
    loadSellerDashboard(user);
    scrollToSection('#sellerLeadInbox');
    return;
  }

  showView('homeView');
  showBuyerTab('messages');
  scrollToSection('#messagesView');
}

function showView(view) {
  const views = ['homeView', 'sellerDashboard', 'adminDashboard'];
  views.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('hidden', id !== view);
  });

  const isHome = view === 'homeView';
  const loginBtn = document.getElementById('navLoginBtn');
  if (loginBtn) loginBtn.style.display = isHome ? 'inline-flex' : 'none';
}

function getAuthDrawerContext() {
  const roleSelect = document.getElementById('authRole');
  const gstInput = document.getElementById('authGst');
  const nameInput = document.getElementById('authName');
  const phoneInput = document.getElementById('authPhone');
  const whatsappInput = document.getElementById('authWhatsapp');
  const businessNameInput = document.getElementById('authBusinessName');
  const categoryInput = document.getElementById('authCategory');
  const websiteInput = document.getElementById('authWebsite');
  const businessRegInput = document.getElementById('authBusinessReg');
  const addressInput = document.getElementById('authAddress');
  const role = roleSelect?.value || 'buyer';
  const gstNumber = gstInput?.value.trim() || '';
  const name = nameInput?.value.trim() || '';
  const mobileNumber = phoneInput?.value.trim() || '';
  const whatsappNumber = whatsappInput?.value.trim() || '';
  const businessName = businessNameInput?.value.trim() || '';
  const category = categoryInput?.value.trim() || '';
  const website = websiteInput?.value.trim() || '';
  const businessRegistrationNumber = businessRegInput?.value.trim() || '';
  const address = addressInput?.value.trim() || '';

  return {
    mode: authMode || 'login',
    role,
    gstNumber,
    name,
    mobileNumber,
    whatsappNumber,
    businessName,
    category,
    website,
    businessRegistrationNumber,
    address,
  };
}

function askGoogleAuthRole(defaultRole = 'buyer') {
  const seed = defaultRole === 'seller' ? 'seller' : 'buyer';
  return new Promise((resolve) => {
    const modal = document.getElementById('googleRoleModal');
    const continueBtn = document.getElementById('googleRoleContinue');
    const closeBtn = document.getElementById('googleRoleClose');
    const choices = document.querySelectorAll('input[name="googleRoleChoice"]');

    if (!modal || !continueBtn || !closeBtn || !choices.length) {
      resolve(seed);
      return;
    }

    choices.forEach((input) => {
      input.checked = input.value === seed;
    });

    const cleanup = () => {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      continueBtn.onclick = null;
      closeBtn.onclick = null;
    };

    continueBtn.onclick = () => {
      const selected = document.querySelector('input[name="googleRoleChoice"]:checked');
      const role = selected?.value === 'seller' ? 'seller' : 'buyer';
      cleanup();
      resolve(role);
    };

    closeBtn.onclick = () => {
      cleanup();
      resolve(null);
    };

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  });
}

function getFriendlyFirebaseAuthError(error, fallback = 'Authentication failed.') {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').trim();

  if (code === 'auth/internal-error' || message.includes('auth/internal-error')) {
    return 'Authentication service had a temporary issue. Please refresh and try again.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network issue detected. Please check internet and retry.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts detected. Please wait a few minutes and try again.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is disabled in Firebase Auth settings. Enable Email/Password in Firebase Console to continue.';
  }
  if (code === 'auth/invalid-login-credentials' || code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This email is already registered. Please login instead.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use a stronger password.';
  }

  return message || fallback;
}

function persistBackendSession(data) {
  if (!data || typeof data !== 'object') return;
  if (data.token) {
    localStorage.setItem(AUTH_STORAGE_KEYS.backendToken, String(data.token));
  }
  if (data.refreshToken) {
    localStorage.setItem(AUTH_STORAGE_KEYS.backendRefreshToken, String(data.refreshToken));
  }
  if (data.business) {
    localStorage.setItem(AUTH_STORAGE_KEYS.backendBusiness, JSON.stringify(data.business));
  }
}

function clearBackendSession() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.backendToken);
  localStorage.removeItem(AUTH_STORAGE_KEYS.backendRefreshToken);
  localStorage.removeItem(AUTH_STORAGE_KEYS.backendBusiness);
}

function clearPendingGoogleRedirectState() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.pendingGoogleRole);
  localStorage.removeItem(AUTH_STORAGE_KEYS.pendingGoogleMode);
  localStorage.removeItem(AUTH_STORAGE_KEYS.pendingGoogleGst);
}

async function refreshBackendSessionIfNeeded() {
  const refreshToken = String(localStorage.getItem(AUTH_STORAGE_KEYS.backendRefreshToken) || '').trim();
  if (!refreshToken) return;

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      clearBackendSession();
      return;
    }
    const payload = await response.json();
    persistBackendSession(payload);
  } catch (error) {
    // Keep existing state and retry during the next auth lifecycle event.
  }
}

async function exchangeFirebaseTokenForBackendSession(user, recaptchaAction = 'auth_login_firebase') {
  if (!user) return;

  try {
    const idToken = await user.getIdToken(true);
    const recaptchaToken = await executeRecaptchaAction(recaptchaAction);
    const backendRes = await fetch(`${API_URL}/api/auth/login/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, recaptchaToken }),
    });

    if (!backendRes.ok) return;
    const backendData = await backendRes.json();
    persistBackendSession(backendData);
  } catch (backendAuthError) {
    console.warn('Backend Firebase login exchange failed', backendAuthError);
  }
}

async function finalizeAuthenticatedUser(user, options = {}) {
  if (!user) throw new Error('Authentication did not return a user.');

  const roleOverride = options.roleOverride || null;
  const gstNumber = options.gstNumber || '';
  const name = String(options.name || '').trim();
  const mode = options.mode || 'login';
  const profileExtra = options.profileExtra || {};

  if (name && typeof user.updateProfile === 'function') {
    await user.updateProfile({ displayName: name });
  }

  const profile = await ensureUserProfile(user, roleOverride, gstNumber, {
    createIfMissing: true,
    extra: {
      ...profileExtra,
      name,
    },
  });
  currentUserProfile = profile;
  localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(profile));
  fillProfile();
  closeAuthDrawer();
  routeSignedInUser(profile);
  await maybeLaunchProfileWizard(profile, user);

  await exchangeFirebaseTokenForBackendSession(user);

  if (mode === 'register') {
    alert('Registered and signed in.');
  } else {
    alert('Logged in successfully.');
  }
}

function computeProfileCompletion(profile = {}) {
  const role = profile.role || 'buyer';
  const baseFields = role === 'seller'
    ? ['name', 'mobileNumber', 'whatsappNumber', 'businessName', 'category', 'address', 'businessDescription']
    : ['name', 'mobileNumber', 'city', 'state', 'favoriteCategories'];

  const filled = baseFields.filter((field) => {
    const value = profile[field];
    if (Array.isArray(value)) return value.length > 0;
    return String(value || '').trim().length > 0;
  });

  const optional = ['gstNumber', 'website', 'businessRegistrationNumber'];
  const optionalFilled = optional.filter((field) => String(profile[field] || '').trim().length > 0);
  const percent = Math.min(100, Math.round(((filled.length + optionalFilled.length * 0.3) / baseFields.length) * 100));

  const missing = baseFields
    .filter((field) => !filled.includes(field))
    .map((field) => {
      const labelMap = {
        mobileNumber: 'Mobile Number',
        whatsappNumber: 'WhatsApp Number',
        businessName: 'Business Name',
        favoriteCategories: 'Favorite Categories',
        businessDescription: 'Business Description',
      };
      return labelMap[field] || `${field.charAt(0).toUpperCase()}${field.slice(1)}`;
    });

  return {
    percent,
    missing,
    badges: [
      percent === 100 ? '100% Complete Profile' : '',
      profile.verified ? 'Verified Business' : '',
      profile.gstNumber ? 'GST Verified' : '',
      profile.whatsappVerified ? 'WhatsApp Verified' : '',
      profile.fastResponder ? 'Fast Responder' : '',
    ].filter(Boolean),
  };
}

function renderCompletionPanels(profile = {}) {
  const completion = computeProfileCompletion(profile);
  const panelHtml = `
    <h3>Profile Completion</h3>
    <div class="completion-meter"><div class="completion-meter-bar" style="width:${completion.percent}%;"></div></div>
    <p><strong>${completion.percent}%</strong> complete</p>
    <div class="completion-missing-list">
      ${completion.missing.slice(0, 4).map((item) => `<span>□ ${item}</span>`).join('') || '<span>All key profile details are complete.</span>'}
    </div>
    <div class="completion-badges">${completion.badges.map((badge) => `<span class="badge badgeSoft">${badge}</span>`).join('')}</div>
  `;

  const buyerPanel = document.getElementById('profileCompletionPanel');
  if (buyerPanel) buyerPanel.innerHTML = panelHtml;
  const sellerPanel = document.getElementById('sellerCompletionPanel');
  if (sellerPanel) sellerPanel.innerHTML = panelHtml;
}

function getWizardStepTemplate(role, step, data) {
  if (role === 'seller') {
    if (step === 1) {
      return `
        <div class="wizard-grid">
          <label>Business Logo URL<input id="wizardBusinessLogo" value="${data.businessLogo || ''}" placeholder="https://..." /></label>
          <label>Business Name<input id="wizardBusinessName" value="${data.businessName || ''}" /></label>
          <label>Category<input id="wizardCategory" value="${data.category || ''}" /></label>
          <label>Years in Business<input id="wizardYears" value="${data.yearsInBusiness || ''}" /></label>
        </div>
      `;
    }
    if (step === 2) {
      return `
        <div class="wizard-grid">
          <label>Mobile Number<input id="wizardMobile" value="${data.mobileNumber || ''}" /></label>
          <label>WhatsApp Number (Mandatory)<input id="wizardWhatsapp" value="${data.whatsappNumber || ''}" /></label>
          <label>Email<input id="wizardEmail" value="${data.email || ''}" /></label>
          <label>Address<textarea id="wizardAddress">${data.address || ''}</textarea></label>
        </div>
      `;
    }
    return `
      <div class="wizard-grid">
        <label>GST Number (Optional)<input id="wizardGst" value="${data.gstNumber || ''}" /></label>
        <label>Website<input id="wizardWebsite" value="${data.website || ''}" /></label>
        <label>Social Links<input id="wizardSocial" value="${data.socialLinks || ''}" /></label>
        <label>Business Description<textarea id="wizardDescription">${data.businessDescription || ''}</textarea></label>
      </div>
    `;
  }

  if (step === 1) {
    return `
      <div class="wizard-grid">
        <label>Profile Photo URL<input id="wizardPhoto" value="${data.profilePhoto || ''}" placeholder="https://..." /></label>
        <label>Full Name<input id="wizardName" value="${data.name || ''}" /></label>
        <label>Phone Number<input id="wizardMobile" value="${data.mobileNumber || ''}" /></label>
        <label>City<input id="wizardCity" value="${data.city || ''}" /></label>
        <label>State<input id="wizardState" value="${data.state || ''}" /></label>
      </div>
    `;
  }
  if (step === 2) {
    return `
      <div class="wizard-grid">
        <label>Favorite Categories<input id="wizardFavorites" value="${(data.favoriteCategories || []).join(', ')}" placeholder="e.g. Electrical, Industrial" /></label>
        <label>Notification Preferences<input id="wizardNotifications" value="${data.notificationPreferences || 'WhatsApp, Email'}" /></label>
      </div>
    `;
  }
  return `
    <div class="wizard-grid">
      <p>Review your profile details and continue to your dashboard.</p>
      <div class="completion-missing-list">
        <span>✓ Name: ${data.name || 'Not provided'}</span>
        <span>✓ Phone: ${data.mobileNumber || 'Not provided'}</span>
        <span>✓ City: ${data.city || 'Not provided'}</span>
        <span>✓ Preferences: ${(data.favoriteCategories || []).join(', ') || 'Not provided'}</span>
      </div>
    </div>
  `;
}

function collectWizardStepData(role, step) {
  const get = (id) => String(document.getElementById(id)?.value || '').trim();
  if (role === 'seller') {
    if (step === 1) {
      wizardState.data.businessLogo = get('wizardBusinessLogo');
      wizardState.data.businessName = get('wizardBusinessName');
      wizardState.data.category = get('wizardCategory');
      wizardState.data.yearsInBusiness = get('wizardYears');
      return true;
    }
    if (step === 2) {
      const whatsapp = get('wizardWhatsapp');
      if (!whatsapp) {
        alert('WhatsApp Number is mandatory for seller activation.');
        return false;
      }
      wizardState.data.mobileNumber = get('wizardMobile');
      wizardState.data.whatsappNumber = whatsapp;
      wizardState.data.email = get('wizardEmail');
      wizardState.data.address = get('wizardAddress');
      wizardState.data.whatsappVerified = true;
      return true;
    }
    wizardState.data.gstNumber = get('wizardGst');
    wizardState.data.website = get('wizardWebsite');
    wizardState.data.socialLinks = get('wizardSocial');
    wizardState.data.businessDescription = get('wizardDescription');
    return true;
  }

  if (step === 1) {
    wizardState.data.profilePhoto = get('wizardPhoto');
    wizardState.data.name = get('wizardName') || wizardState.data.name;
    wizardState.data.mobileNumber = get('wizardMobile');
    wizardState.data.city = get('wizardCity');
    wizardState.data.state = get('wizardState');
    return true;
  }
  if (step === 2) {
    wizardState.data.favoriteCategories = get('wizardFavorites').split(',').map((item) => item.trim()).filter(Boolean);
    wizardState.data.notificationPreferences = get('wizardNotifications');
    return true;
  }
  return true;
}

function renderProfileWizardStep() {
  const body = document.getElementById('profileWizardBody');
  const subtitle = document.getElementById('profileWizardSubtitle');
  const progress = document.getElementById('wizardProgressBar');
  const backBtn = document.getElementById('profileWizardBack');
  const nextBtn = document.getElementById('profileWizardNext');
  if (!body || !subtitle || !progress || !backBtn || !nextBtn) return;

  body.innerHTML = getWizardStepTemplate(wizardState.role, wizardState.step, wizardState.data);
  subtitle.textContent = `Step ${wizardState.step} of 3`;
  progress.style.width = `${Math.round((wizardState.step / 3) * 100)}%`;
  backBtn.disabled = wizardState.step === 1;
  nextBtn.textContent = wizardState.step === 3 ? 'Finish' : 'Next';
}

async function closeProfileWizardAndPersist() {
  if (!currentUser || !db) return;
  const userRef = db.collection(FIRESTORE_COLLECTIONS.users).doc(currentUser.uid);
  const completion = computeProfileCompletion({ ...currentUserProfile, ...wizardState.data, role: wizardState.role });
  await userRef.set({
    ...wizardState.data,
    onboardingCompleted: true,
    profileCompletion: completion.percent,
    profileComplete: completion.percent >= 90,
    sellerActive: wizardState.role === 'seller' ? !!wizardState.data.whatsappNumber : true,
    whatsappVerified: wizardState.role === 'seller' ? !!wizardState.data.whatsappNumber : false,
    gstVerified: !!wizardState.data.gstNumber,
    lastOnboardingUpdate: new Date(),
  }, { merge: true });

  const updated = await ensureUserProfile(currentUser, wizardState.role, wizardState.data.gstNumber || '', { createIfMissing: true, extra: wizardState.data });
  currentUserProfile = updated;
  localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(updated));
  renderCompletionPanels(updated);

  const modal = document.getElementById('profileWizardModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
  wizardState.open = false;
}

async function maybeLaunchProfileWizard(profile, user) {
  if (!profile || !user || wizardState.open) {
    renderCompletionPanels(profile || {});
    return;
  }

  renderCompletionPanels(profile);
  if (profile.onboardingCompleted && Number(profile.profileCompletion || 0) >= 70) return;

  const modal = document.getElementById('profileWizardModal');
  const backBtn = document.getElementById('profileWizardBack');
  const nextBtn = document.getElementById('profileWizardNext');
  if (!modal || !backBtn || !nextBtn) return;

  wizardState.open = true;
  wizardState.role = profile.role || 'buyer';
  wizardState.step = 1;
  wizardState.data = { ...profile };
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  renderProfileWizardStep();

  backBtn.onclick = () => {
    if (wizardState.step > 1) {
      wizardState.step -= 1;
      renderProfileWizardStep();
    }
  };

  nextBtn.onclick = async () => {
    const valid = collectWizardStepData(wizardState.role, wizardState.step);
    if (!valid) return;

    if (wizardState.step === 3) {
      await closeProfileWizardAndPersist();
      return;
    }
    wizardState.step += 1;
    renderProfileWizardStep();
  };
}

async function handleGoogleRedirectResult() {
  if (!auth || typeof auth.getRedirectResult !== 'function') return;

  try {
    const result = await auth.getRedirectResult();
    const user = result?.user;
    if (!user) return;

    const savedRole = String(localStorage.getItem(AUTH_STORAGE_KEYS.pendingGoogleRole) || '').trim();
    const savedMode = String(localStorage.getItem(AUTH_STORAGE_KEYS.pendingGoogleMode) || '').trim() || 'login';
    const savedGst = String(localStorage.getItem(AUTH_STORAGE_KEYS.pendingGoogleGst) || '').trim();
    clearPendingGoogleRedirectState();

    const role = savedRole === 'buyer' || savedRole === 'seller' ? savedRole : null;
    const gstNumber = role === 'seller' ? savedGst : '';
    await finalizeAuthenticatedUser(user, {
      mode: savedMode,
      roleOverride: role,
      gstNumber,
    });
  } catch (error) {
    console.error('Google redirect result error', error);
  }
}

function normalizeIndianPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  return digits.slice(-10);
}

function setAuthActionButtonsBusy(actionKey, busy) {
  const buttonIds = actionKey === 'google'
    ? ['authGoogle']
    : ['authSendOtp', 'authLoginOtp', 'authSubmit'];

  buttonIds.forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = !!busy;
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resetRecaptchaVerifier() {
  try {
    if (window.recaptchaVerifier && typeof window.recaptchaVerifier.clear === 'function') {
      window.recaptchaVerifier.clear();
    }
  } catch (error) {
    // Ignore cleanup errors.
  }
  window.recaptchaVerifier = null;
}

async function getRecaptchaVerifier() {
  if (window.recaptchaVerifier) return window.recaptchaVerifier;
  if (!window.firebase?.auth) return null;

  window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptchaContainer', {
    size: 'invisible',
    callback: () => {},
  });

  try {
    await window.recaptchaVerifier.render();
  } catch (error) {
    console.warn('Recaptcha render warning', error);
  }

  return window.recaptchaVerifier;
}

async function signInWithGoogle() {
  if (!auth || !googleProvider) {
    alert('Firebase auth is not configured. Please add your Firebase configuration.');
    return;
  }

  if (isGoogleSignInInProgress) {
    alert('Google sign-in is already in progress. Please wait.');
    return;
  }

  const { mode, role, gstNumber, ...profileExtra } = getAuthDrawerContext();
  if (mode === 'register' && role === 'seller' && gstNumber && !validateGSTIN(gstNumber)) {
    alert('Please enter a valid GSTIN.');
    return;
  }

  isGoogleSignInInProgress = true;
  setAuthActionButtonsBusy('google', true);

  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    if (!user) return;

    const existingProfile = await ensureUserProfile(user, null, '', { createIfMissing: false });
    if (existingProfile) {
      await finalizeAuthenticatedUser(user, {
        mode: 'login',
        roleOverride: existingProfile.role,
        gstNumber: existingProfile.gstNumber || '',
        profileExtra: existingProfile,
      });
      return;
    }

    const chosenRole = await askGoogleAuthRole(role);
    if (!chosenRole) {
      await auth.signOut().catch(() => {});
      return;
    }

    if (chosenRole === 'seller' && !String(profileExtra.whatsappNumber || '').trim()) {
      alert('WhatsApp Number is mandatory for sellers. Please enter it and continue.');
      return;
    }

    await finalizeAuthenticatedUser(user, {
      mode: 'register',
      roleOverride: chosenRole,
      gstNumber: chosenRole === 'seller' ? gstNumber : '',
      profileExtra,
    });
  } catch (error) {
    const code = String(error?.code || '');
    if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
      alert('Popup was blocked/closed. Redirect sign-in will start now.');
      const chosenRole = await askGoogleAuthRole(role);
      if (!chosenRole) return;
      localStorage.setItem(AUTH_STORAGE_KEYS.pendingGoogleRole, chosenRole);
      localStorage.setItem(AUTH_STORAGE_KEYS.pendingGoogleMode, mode);
      localStorage.setItem(AUTH_STORAGE_KEYS.pendingGoogleGst, chosenRole === 'seller' ? gstNumber : '');
      auth.signInWithRedirect(googleProvider).catch((redirectError) => {
        console.error('Google redirect sign-in error', redirectError);
        clearPendingGoogleRedirectState();
        alert(getFriendlyFirebaseAuthError(redirectError, 'Google sign-in failed.'));
      });
      return;
    }
    console.error('Google sign-in error', error);
    alert(getFriendlyFirebaseAuthError(error, 'Google sign-in failed.'));
  } finally {
    isGoogleSignInInProgress = false;
    setAuthActionButtonsBusy('google', false);
  }
}

function signOutCurrentUser() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  clearBackendSession();
  clearPendingGoogleRedirectState();
  currentUserProfile = null;
  if (auth && auth.currentUser) {
    auth.signOut().catch((err) => console.warn('Firebase sign-out error', err));
  }
  fillProfile();
  showView('homeView');
}

const state = {
  query: '',
  category: '',
  selectedState: '',
  location: '',
  loading: false,
  products: [],
  categories: [],
  dealers: [],
  nearby: [],
  recommended: [],
  seasonal: [],
  aiSuggestions: [],
  recentlyViewed: [],
  businessBySlug: new Map(),
  favoriteProductIds: JSON.parse(localStorage.getItem('mp_favorite_products') || '[]'),
  favoriteBusinessNames: JSON.parse(localStorage.getItem('mp_favorite_businesses') || '[]'),
  messages: [],
  verifiedSellers: [],
  heroStats: {
    products: 0,
    suppliers: 0,
    verified: 0,
  },
  successStories: [],
  sellerProfile: null,
};

const elements = {
  globalSearch: document.getElementById('globalSearch'),
  categorySelect: document.getElementById('categorySelect'),
  stateSelect: document.getElementById('stateSelect'),
  locationSelect: document.getElementById('locationSelect'),
  searchHeroForm: document.getElementById('searchHeroForm'),
  trendingProductsList: document.getElementById('trendingProductsList'),
  featuredDealersList: document.getElementById('featuredDealersList'),
  newArrivalsList: document.getElementById('newArrivalsList'),
  topCategoriesList: document.getElementById('topCategoriesList'),
  recommendedProductsList: document.getElementById('recommendedProductsList'),
  successStoriesList: document.getElementById('successStoriesList'),
  nearbyBusinessesList: document.getElementById('nearbyBusinessesList'),
  verifiedSellersList: document.getElementById('verifiedSellersList'),
  profileName: document.getElementById('profileName'),
  profileMeta: document.getElementById('profileMeta'),
  buyerGreeting: document.getElementById('buyerGreeting'),
  heroSearchBtn: document.getElementById('heroSearchBtn'),
  exploreBusinessesBtn: document.getElementById('exploreBusinessesBtn'),
  becomeSellerBtn: document.getElementById('becomeSellerBtn'),
  buyerBrowseBtn: document.getElementById('buyerBrowseBtn'),
  sellerAddProductBtn: document.getElementById('sellerAddProductBtn'),
  navSellerBtn: document.getElementById('navSellerBtn'),
  navSellerBtnSecondary: document.getElementById('navSellerBtnSecondary'),
  navDashboardBtn: document.getElementById('navDashboardBtn'),
  navLoginBtn: document.getElementById('navLoginBtn'),
  exploreSuppliersBtn: document.getElementById('exploreSuppliersBtn'),
  viewAllProductsBtn: document.getElementById('viewAllProductsBtn'),
  exploreDealersBtn: document.getElementById('exploreDealersBtn'),
  seeNewListingsBtn: document.getElementById('seeNewListingsBtn'),
  whatsAppFab: document.getElementById('whatsAppFab'),
  mobileNavItems: Array.from(document.querySelectorAll('.mobile-nav-item')),
  voiceSearchBtn: document.getElementById('voiceSearchBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  textSizeToggleBtn: document.getElementById('textSizeToggleBtn'),
  exploreView: document.getElementById('exploreView'),
  favoritesView: document.getElementById('favoritesView'),
  messagesView: document.getElementById('messagesView'),
  profileView: document.getElementById('profileView'),
  buyerRails: document.getElementById('buyerRails'),
  trendingWeekChips: document.getElementById('trendingWeekChips'),
  aiAssistantCard: document.getElementById('aiAssistantCard'),
  exploreGrid: document.getElementById('exploreGrid'),
  recentlyViewedRail: document.getElementById('recentlyViewedRail'),
  trendingRail: document.getElementById('trendingRail'),
  nearbyRail: document.getElementById('nearbyRail'),
  verifiedRail: document.getElementById('verifiedRail'),
  recommendedRail: document.getElementById('recommendedRail'),
  seasonalRail: document.getElementById('seasonalRail'),
  aiSuggestionsRail: document.getElementById('aiSuggestionsRail'),
  favoritesCollections: document.getElementById('favoritesCollections'),
  favoritesProducts: document.getElementById('favoritesProducts'),
  favoritesBusinesses: document.getElementById('favoritesBusinesses'),
  favoritesCompare: document.getElementById('favoritesCompare'),
  messagesTimeline: document.getElementById('messagesTimeline'),
  profileSavedProducts: document.getElementById('profileSavedProducts'),
  profileSavedBusinesses: document.getElementById('profileSavedBusinesses'),
  profileRecentSearches: document.getElementById('profileRecentSearches'),
  profileMessages: document.getElementById('profileMessages'),
  profileHelp: document.getElementById('profileHelp'),
  profileDarkModeBtn: document.getElementById('profileDarkModeBtn'),
  profileAccountSettingsBtn: document.getElementById('profileAccountSettingsBtn'),
  profileLogoutBtn: document.getElementById('profileLogoutBtn'),
  onboardingBanner: document.getElementById('onboardingBanner'),
  onboardingCtaBtn: document.getElementById('onboardingCtaBtn'),
  exportDataBtn: document.getElementById('exportDataBtn'),
  deleteAccountBtn: document.getElementById('deleteAccountBtn'),
  privacyAnalyticsToggle: document.getElementById('privacyAnalyticsToggle'),
  privacyPersonalizationToggle: document.getElementById('privacyPersonalizationToggle'),
  privacyLocationToggle: document.getElementById('privacyLocationToggle'),
  businessProfileView: document.getElementById('businessProfileView'),
  businessProfileTitle: document.getElementById('businessProfileTitle'),
  businessBackBtn: document.getElementById('businessBackBtn'),
  businessProfileLogo: document.getElementById('businessProfileLogo'),
  businessProfileName: document.getElementById('businessProfileName'),
  businessProfileMeta: document.getElementById('businessProfileMeta'),
  businessTrustStats: document.getElementById('businessTrustStats'),
  businessStory: document.getElementById('businessStory'),
  businessWhatsappLink: document.getElementById('businessWhatsappLink'),
  businessCallLink: document.getElementById('businessCallLink'),
  businessCertifications: document.getElementById('businessCertifications'),
  businessSocialLinks: document.getElementById('businessSocialLinks'),
  businessGallery: document.getElementById('businessGallery'),
  businessProductsGrid: document.getElementById('businessProductsGrid'),
};

const categories = [
  { name: 'Electronics', icon: '🔌', count: '8.9K' },
  { name: 'Mobiles', icon: '📱', count: '11.2K' },
  { name: 'Fashion', icon: '👗', count: '6.4K' },
  { name: 'Home & Kitchen', icon: '🏠', count: '5.1K' },
  { name: 'Automotive', icon: '🚗', count: '9.3K' },
  { name: 'Industrial', icon: '🏭', count: '7.8K' },
  { name: 'Wholesale', icon: '📦', count: '4.6K' },
  { name: 'Services', icon: '🛠️', count: '3.9K' },
];

const INDIAN_CITIES = [
  'Agartala', 'Agra', 'Ahmedabad', 'Aizawl', 'Ajmer', 'Aligarh', 'Allahabad', 'Alwar', 'Amaravati', 'Ambala',
  'Amravati', 'Amritsar', 'Anand', 'Asansol', 'Aurangabad', 'Ayodhya', 'Bareilly', 'Belagavi', 'Bengaluru', 'Bharatpur',
  'Bhatinda', 'Bhilai', 'Bhilwara', 'Bhiwandi', 'Bhopal', 'Bhubaneswar', 'Bikaner', 'Bilaspur', 'Bokaro', 'Chandigarh',
  'Chennai', 'Coimbatore', 'Cuttack', 'Dehradun', 'Delhi', 'Dhanbad', 'Dibrugarh', 'Dimapur', 'Durgapur', 'Erode',
  'Faridabad', 'Gandhinagar', 'Gangtok', 'Gaya', 'Ghaziabad', 'Goa', 'Gorakhpur', 'Greater Noida', 'Guntur', 'Gurugram',
  'Guwahati', 'Gwalior', 'Haldwani', 'Haridwar', 'Hisar', 'Hubballi', 'Hyderabad', 'Imphal', 'Indore', 'Itanagar',
  'Jabalpur', 'Jaipur', 'Jalandhar', 'Jammu', 'Jamnagar', 'Jamshedpur', 'Jhansi', 'Jodhpur', 'Jorhat', 'Kakinada',
  'Kanpur', 'Karimnagar', 'Karnal', 'Kochi', 'Kohima', 'Kolhapur', 'Kolkata', 'Kollam', 'Kota', 'Kozhikode',
  'Kurnool', 'Lucknow', 'Ludhiana', 'Madurai', 'Mangaluru', 'Meerut', 'Mohali', 'Moradabad', 'Mumbai', 'Mysuru',
  'Nagpur', 'Nanded', 'Nashik', 'Navi Mumbai', 'Noida', 'Panaji', 'Patiala', 'Patna', 'Pimpri-Chinchwad', 'Puducherry',
  'Pune', 'Raipur', 'Rajkot', 'Ranchi', 'Rourkela', 'Salem', 'Siliguri', 'Srinagar', 'Surat', 'Thane',
  'Thiruvananthapuram', 'Thrissur', 'Tiruchirappalli', 'Tirunelveli', 'Tirupati', 'Tiruppur', 'Udaipur', 'Udupi', 'Ujjain',
  'Vadodara', 'Varanasi', 'Vellore', 'Vijayawada', 'Visakhapatnam', 'Warangal'
];

const STATE_CITY_MAP = {
  'Andhra Pradesh': ['Amaravati', 'Anantapur', 'Guntur', 'Kakinada', 'Kurnool', 'Nellore', 'Rajahmundry', 'Tirupati', 'Vijayawada', 'Visakhapatnam'],
  'Arunachal Pradesh': ['Itanagar'],
  Assam: ['Dibrugarh', 'Guwahati', 'Jorhat', 'Silchar'],
  Bihar: ['Darbhanga', 'Gaya', 'Muzaffarpur', 'Patna'],
  Chhattisgarh: ['Bhilai', 'Bilaspur', 'Raipur'],
  Delhi: ['Delhi'],
  Goa: ['Goa', 'Panaji'],
  Gujarat: ['Ahmedabad', 'Anand', 'Bhavnagar', 'Gandhinagar', 'Jamnagar', 'Rajkot', 'Surat', 'Vadodara'],
  Haryana: ['Ambala', 'Faridabad', 'Gurugram', 'Hisar', 'Karnal'],
  'Himachal Pradesh': ['Shimla'],
  'Jammu and Kashmir': ['Jammu', 'Srinagar'],
  Jharkhand: ['Bokaro', 'Dhanbad', 'Jamshedpur', 'Ranchi'],
  Karnataka: ['Belagavi', 'Bengaluru', 'Hubballi', 'Kalaburagi', 'Mangaluru', 'Mysuru', 'Udupi'],
  Kerala: ['Kochi', 'Kollam', 'Kottayam', 'Kozhikode', 'Thiruvananthapuram', 'Thrissur'],
  'Madhya Pradesh': ['Bhopal', 'Gwalior', 'Indore', 'Jabalpur', 'Ujjain'],
  Maharashtra: ['Amravati', 'Aurangabad', 'Jalgaon', 'Kolhapur', 'Mumbai', 'Nagpur', 'Nanded', 'Nashik', 'Navi Mumbai', 'Pimpri-Chinchwad', 'Pune', 'Thane'],
  Manipur: ['Imphal'],
  Meghalaya: ['Shillong'],
  Mizoram: ['Aizawl'],
  Nagaland: ['Dimapur', 'Kohima'],
  Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela'],
  Punjab: ['Amritsar', 'Bhatinda', 'Jalandhar', 'Ludhiana', 'Mohali', 'Patiala'],
  Rajasthan: ['Ajmer', 'Alwar', 'Bharatpur', 'Bikaner', 'Jaipur', 'Jodhpur', 'Kota', 'Udaipur'],
  Sikkim: ['Gangtok'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Erode', 'Madurai', 'Salem', 'Tiruchirappalli', 'Tirunelveli', 'Tiruppur', 'Vellore'],
  Telangana: ['Hyderabad', 'Karimnagar', 'Warangal'],
  Tripura: ['Agartala'],
  'Uttar Pradesh': ['Agra', 'Aligarh', 'Allahabad', 'Ayodhya', 'Bareilly', 'Firozabad', 'Ghaziabad', 'Gorakhpur', 'Greater Noida', 'Jhansi', 'Kanpur', 'Lucknow', 'Meerut', 'Moradabad', 'Noida', 'Saharanpur', 'Varanasi'],
  Uttarakhand: ['Dehradun', 'Haldwani', 'Haridwar'],
  'West Bengal': ['Asansol', 'Durgapur', 'Kolkata', 'Siliguri'],
  'Union Territories': ['Chandigarh', 'Puducherry']
};

// Placeholder demo arrays removed — UI uses live Firestore data in `state`.

function formatPrice(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

function updateBuyerGreeting() {
  if (!elements.buyerGreeting) return;
  const hours = Number(new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hour12: false,
  }).format(new Date()));
  const period = hours < 12 ? 'Morning' : hours < 17 ? 'Afternoon' : 'Evening';
  const user = JSON.parse(localStorage.getItem('mp_user') || 'null');
  const name = user?.name || 'Gaurav';
  elements.buyerGreeting.textContent = `Good ${period}, ${name} 👋`;
}

function populateIndianCities() {
  if (!elements.locationSelect) return;
  const selectedState = state.selectedState || '';
  const cityList = selectedState && STATE_CITY_MAP[selectedState]
    ? STATE_CITY_MAP[selectedState]
    : INDIAN_CITIES;

  elements.locationSelect.innerHTML = '';
  const anyOption = document.createElement('option');
  anyOption.value = '';
  anyOption.textContent = selectedState ? 'Any City' : 'Any Location';
  elements.locationSelect.appendChild(anyOption);

  cityList.forEach((city) => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    elements.locationSelect.appendChild(option);
  });

  if (state.location && cityList.includes(state.location)) {
    elements.locationSelect.value = state.location;
  } else {
    state.location = '';
    elements.locationSelect.value = '';
  }
}

function populateStateOptions() {
  if (!elements.stateSelect) return;
  const states = Object.keys(STATE_CITY_MAP).sort((a, b) => a.localeCompare(b));
  elements.stateSelect.innerHTML = '<option value="">Any State</option>';
  states.forEach((stateName) => {
    const option = document.createElement('option');
    option.value = stateName;
    option.textContent = stateName;
    elements.stateSelect.appendChild(option);
  });
  if (state.selectedState) {
    elements.stateSelect.value = state.selectedState;
  }
}

function getAiTrainingState() {
  const fallback = { queries: [], categories: {}, cities: {}, actions: {} };
  try {
    const raw = JSON.parse(localStorage.getItem('mp_ai_training') || 'null');
    if (!raw || typeof raw !== 'object') return fallback;
    return {
      queries: Array.isArray(raw.queries) ? raw.queries : [],
      categories: raw.categories && typeof raw.categories === 'object' ? raw.categories : {},
      cities: raw.cities && typeof raw.cities === 'object' ? raw.cities : {},
      actions: raw.actions && typeof raw.actions === 'object' ? raw.actions : {},
    };
  } catch (_error) {
    return fallback;
  }
}

function trainAiAssistant(signal, payload = {}) {
  const profile = getAiTrainingState();
  profile.actions[signal] = (profile.actions[signal] || 0) + 1;

  const query = String(payload.query || '').trim();
  if (query) {
    profile.queries = [query, ...profile.queries.filter((item) => item !== query)].slice(0, 12);
  }

  const category = String(payload.category || '').trim();
  if (category) {
    profile.categories[category] = (profile.categories[category] || 0) + 1;
  }

  const city = String(payload.city || state.location || '').trim();
  if (city) {
    profile.cities[city] = (profile.cities[city] || 0) + 1;
  }

  localStorage.setItem('mp_ai_training', JSON.stringify(profile));

  const topCategory = Object.entries(profile.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Industrial';
  const topCity = Object.entries(profile.cities).sort((a, b) => b[1] - a[1])[0]?.[0] || (state.location || 'your city');
  const recentIntent = profile.queries[0] || 'verified suppliers';
  const actionCount = profile.actions.contactDealer || 0;

  state.aiSuggestions = [
    `You often search for ${topCategory}. I am prioritizing ${topCategory} dealers first.`,
    `Top demand cluster: ${topCity}. I can focus recommendations around ${topCity}.`,
    `Recent intent detected: "${recentIntent}".`,
    `Learning update: ${actionCount} dealer-contact actions tracked for better ranking.`,
  ];
  renderRails();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function initials(value) {
  return String(value || 'Business')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

async function fetchHybridRecommendations() {
  const uid = currentUserProfile?.uid || currentUser?.uid || '';
  const params = new URLSearchParams();
  if (uid) params.set('uid', uid);
  if (state.location) params.set('city', state.location);
  if (state.category) params.set('category', state.category);
  params.set('limit', '12');

  try {
    const response = await fetch(`${API_URL}/api/recommendations/buyer?${params.toString()}`);
    if (!response.ok) return;
    const payload = await response.json();
    if (Array.isArray(payload.recommendations) && payload.recommendations.length) {
      state.recommended = payload.recommendations.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        image: item.image,
        price: item.price,
        seller: item.seller,
        location: item.location,
        category: item.category,
        verified: !!item.verified,
        responseTime: item.responseTime || 'Responds in 2 hours',
        rating: 4.6,
        status: item.reason || 'Recommended for you',
      }));
    }
    if (Array.isArray(payload.insights) && payload.insights.length) {
      state.aiSuggestions = payload.insights;
    }
  } catch (error) {
    console.warn('recommendation fetch failed', error);
  }
}

function renderCategories() {
  if (!elements.topCategoriesList) return;
  elements.topCategoriesList.innerHTML = categories
    .map((category) => `
      <article class="category-card">
        <div class="category-icon">${category.icon}</div>
        <h3>${category.name}</h3>
        <p>${category.count} products</p>
      </article>
    `)
    .join('');
}

function renderProductCard(product) {
  const response = product.responseTime || 'Responds in 2 hours';
  return `
    <article class="feedCard">
      <img class="feedImage" src="${product.image}" alt="${product.name}" />
      <div class="feedCardBody">
        <div class="feedHead">
          <span>${product.seller}</span>
          <span>${product.location}</span>
        </div>
        <div class="feedTitle">${product.name}</div>
        <div class="productMetaRow">
          <span class="metaBadge">${formatPrice(product.price)}</span>
          <span class="metaBadgeSoft">${product.rating} ★</span>
        </div>
        <p class="feedMeta">${product.description}</p>
        <div class="productMetaRow">
          <span class="badge badgeVerified">${product.verified ? 'Verified Seller' : 'Seller'}</span>
          <span class="badge badgeSoft">${response}</span>
        </div>
        <div class="cardActions">
          <button class="actionPrimary" type="button" data-action="contact" data-id="${product.id}">Contact Dealer</button>
          <button class="actionSecondary" type="button" data-action="whatsapp" data-id="${product.id}">WhatsApp Dealer</button>
          <button class="actionSecondary" type="button" data-action="save-product" data-id="${product.id}">Save Product</button>
          <button class="actionSecondary" type="button" data-action="share-product" data-id="${product.id}">Share</button>
        </div>
      </div>
    </article>
  `;
}

function renderRailCard(item, type = 'product') {
  if (type === 'business') {
    return `
      <article class="rail-card" data-business="${item.name}">
        <div class="rail-business-head">
          <strong>${item.name}</strong>
          <span>${item.location || 'India'}</span>
        </div>
        <p>${item.verified ? 'GST verified business' : 'Trusted local supplier'}</p>
        <div class="productMetaRow">
          <span class="badge badgeVerified">${item.verified ? 'Verified' : 'Trusted'}</span>
          <button class="actionSecondary" type="button" data-action="view-business" data-seller="${item.name}">View Profile</button>
        </div>
      </article>
    `;
  }

  return `
    <article class="rail-card" data-id="${item.id}">
      <img src="${item.image}" alt="${item.name}" />
      <div>
        <strong>${item.name}</strong>
        <p>${item.location || 'India'} • ${item.responseTime || 'Fast response'}</p>
        <div class="productMetaRow">
          <span class="badge badgeVerified">${item.verified ? 'Verified' : 'Trusted'}</span>
          <button class="actionSecondary" type="button" data-action="details" data-id="${item.id}">Open</button>
        </div>
      </div>
    </article>
  `;
}

function renderRails() {
  if (elements.recentlyViewedRail) {
    const items = state.recentlyViewed.length ? state.recentlyViewed : state.products.slice(0, 4);
    elements.recentlyViewedRail.innerHTML = items.map((item) => renderRailCard(item, 'product')).join('')
      || '<div class="empty-state"><h3>Your recently viewed items will appear here</h3><p>Start discovering products near your city.</p></div>';
  }

  if (elements.trendingWeekChips) {
    const tags = state.seasonal.length
      ? state.seasonal.slice(0, 4).map((item) => item.name)
      : ['Copper Wires', 'PVC Pipes', 'Industrial Motors', 'Construction Tools'];

    elements.trendingWeekChips.innerHTML = tags
      .map((tag) => `<button class="trending-chip" type="button" data-chip="${tag}">🔥 ${tag}</button>`)
      .join('');
  }

  if (elements.aiAssistantCard) {
    const suggestions = state.aiSuggestions.length
      ? state.aiSuggestions.slice(0, 4)
      : [
          'Most popular categories around you',
          'Recommended sellers with strong trust signals',
          'Trending products this week',
          'Fast responders for urgent inquiries',
        ];

    elements.aiAssistantCard.innerHTML = `
      <h3>Looking for suppliers?</h3>
      <p>I found ${Math.max(5, state.verifiedSellers.length)} verified businesses near you.</p>
      <div class="ai-assistant-actions">
        ${suggestions.map((line) => `<button class="button buttonGhost" type="button" data-ai-suggestion="${line}">${line}</button>`).join('')}
      </div>
    `;
  }
}

function renderExploreView() {
  if (!elements.exploreGrid) return;
  elements.exploreGrid.innerHTML = state.products.map(renderProductCard).join('') || '<p class="muted">No products available right now.</p>';
}

function renderFavoritesView() {
  const collectionTemplates = [
    'My Industrial Suppliers',
    'Electrical Equipment',
    'Construction Materials',
    'Future Purchases',
  ];

  if (elements.favoritesCollections) {
    elements.favoritesCollections.innerHTML = collectionTemplates
      .map((name) => `<article class="collection-card"><strong>${name}</strong><p>Organize products and suppliers you trust.</p></article>`)
      .join('');
  }

  const favoriteProducts = state.products.filter((product) => state.favoriteProductIds.includes(product.id));
  if (elements.favoritesProducts) {
    elements.favoritesProducts.innerHTML = favoriteProducts.length
      ? favoriteProducts.map(renderProductCard).join('')
      : '<div class="empty-state"><h3>No saved products yet</h3><p>Save products to compare and contact dealers faster.</p></div>';
  }

  const favoriteBusinesses = state.dealers.filter((business) => state.favoriteBusinessNames.includes(business.name));
  if (elements.favoritesBusinesses) {
    elements.favoritesBusinesses.innerHTML = favoriteBusinesses.length
      ? favoriteBusinesses.map((business) => renderRailCard(business, 'business')).join('')
      : '<div class="empty-state"><h3>No saved businesses yet</h3><p>Save businesses to build long-term supplier relationships.</p></div>';
  }

  if (elements.favoritesCompare) {
    if (!favoriteProducts.length) {
      elements.favoritesCompare.innerHTML = '<div class="empty-state"><h3>Compare view is empty</h3><p>Add at least two products to compare response time, trust badges, and location.</p></div>';
    } else {
      elements.favoritesCompare.innerHTML = favoriteProducts.slice(0, 3).map((item) => `
        <article class="lead-card">
          <strong>${item.name}</strong>
          <p>${item.seller} • ${item.location}</p>
          <div class="productMetaRow">
            <span>${formatPrice(item.price)}</span>
            <span>${item.responseTime || 'Responds quickly'}</span>
          </div>
        </article>
      `).join('');
    }
  }
}

function renderMessagesView() {
  if (!elements.messagesTimeline) return;
  const items = state.messages.length ? state.messages : [
    { title: 'Need a quote faster?', summary: 'Contact verified dealers directly from product cards.' },
    { title: 'Conversation quality tip', summary: 'Share quantity and required timeline in the first message.' },
  ];
  elements.messagesTimeline.innerHTML = items.map((item) => `
    <article class="lead-card">
      <strong>${item.title}</strong>
      <p>${item.summary || item.message || ''}</p>
    </article>
  `).join('');
}

function renderProfileView() {
  const favoriteProducts = state.products.filter((product) => state.favoriteProductIds.includes(product.id));
  const favoriteBusinesses = state.dealers.filter((business) => state.favoriteBusinessNames.includes(business.name));

  if (elements.profileSavedProducts) {
    elements.profileSavedProducts.innerHTML = favoriteProducts.length
      ? favoriteProducts.slice(0, 3).map((item) => `<article class="lead-card"><strong>${item.name}</strong><p>${item.seller} • ${item.location}</p></article>`).join('')
      : '<div class="empty-state"><h3>No products saved yet</h3><p>Explore verified businesses to build your collection.</p></div>';
  }

  if (elements.profileSavedBusinesses) {
    elements.profileSavedBusinesses.innerHTML = favoriteBusinesses.length
      ? favoriteBusinesses.slice(0, 3).map((item) => `<article class="lead-card"><strong>${item.name}</strong><p>${item.location}</p></article>`).join('')
      : '<div class="empty-state"><h3>No businesses saved yet</h3><p>Save trusted businesses to revisit instantly.</p></div>';
  }

  if (elements.profileRecentSearches) {
    const searches = JSON.parse(localStorage.getItem('mp_recent_searches') || '[]');
    elements.profileRecentSearches.innerHTML = searches.length
      ? searches.slice(0, 5).map((item) => `<article class="lead-card"><strong>${item}</strong></article>`).join('')
      : '<div class="empty-state"><h3>No recent searches</h3><p>Start discovering products near your city.</p></div>';
  }

  if (elements.profileMessages) {
    const items = state.messages.length ? state.messages : [];
    elements.profileMessages.innerHTML = items.length
      ? items.slice(0, 3).map((item) => `<article class="lead-card"><strong>${item.title || 'Message'}</strong><p>${item.summary || item.message || ''}</p></article>`).join('')
      : '<div class="empty-state"><h3>No messages yet</h3><p>Your dealer conversations will appear here.</p></div>';
  }

  if (elements.profileHelp) {
    elements.profileHelp.innerHTML = [
      'Help Center',
      'Contact Support',
      'Trust and Safety',
      'Account Settings',
    ].map((item) => `<article class="lead-card"><strong>${item}</strong></article>`).join('');
  }
}

function showBuyerTab(tabKey) {
  const sections = [
    ['home', document.getElementById('homeView')],
    ['explore', elements.exploreView],
    ['favorites', elements.favoritesView],
    ['profile', elements.profileView],
    ['business', elements.businessProfileView],
  ];

  sections.forEach(([key, section]) => {
    if (!section) return;
    section.classList.toggle('hidden', key !== tabKey);
  });

  if (tabKey === 'favorites') renderFavoritesView();
  if (tabKey === 'messages') renderMessagesView();
  if (tabKey === 'profile') renderProfileView();
  if (tabKey === 'explore') renderExploreView();
}

async function fetchBusinessProfileData(slug) {
  try {
    const response = await fetch(`${API_URL}/api/business/public/${encodeURIComponent(slug)}`);
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    return null;
  }
}

function renderBusinessProfilePage(business, details = null) {
  if (!business || !elements.businessProfileView) return;

  const relatedProducts = details?.products?.length
    ? details.products.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        image: item.image,
        price: item.price,
        seller: business.name,
        location: details.location || business.location,
        verified: details.verified ?? business.verified,
        responseTime: details.response_time || business.response || 'Responds in 2 hours',
        rating: Math.max(3.9, Number(details.trust_score || 80) / 20),
      }))
    : state.products.filter((item) => item.seller === business.name).slice(0, 12);

  const certifications = [
    ...(details?.certifications || []),
    ...(details?.certifications?.length ? [] : [
      business.verified ? 'GST Verified' : 'Verification pending',
      'Business identity verified',
      'Response quality monitored',
      'Inquiry response SLA enabled',
    ]),
  ];
  const socials = [
    { label: 'Website', value: details?.social_links?.website || `https://${slugify(business.name)}.business.site` },
    { label: 'LinkedIn', value: details?.social_links?.linkedin || `https://www.linkedin.com/company/${slugify(business.name)}` },
    { label: 'Instagram', value: details?.social_links?.instagram || `https://instagram.com/${slugify(business.name).replace(/-/g, '')}` },
  ];

  if (elements.businessProfileTitle) elements.businessProfileTitle.textContent = `${business.name} Profile`;
  if (elements.businessProfileLogo) elements.businessProfileLogo.textContent = initials(business.name);
  if (elements.businessProfileName) elements.businessProfileName.textContent = business.name;
  if (tabKey === 'profile') renderProfileView();
    const years = details?.years_in_business ? `${details.years_in_business}+ years` : `${business.yearsInBusiness || 5}+ years`;
    elements.businessProfileMeta.textContent = `${details?.location || business.location || 'India'} • ${details?.verified || business.verified ? 'GST verified' : 'Trusted supplier'} • ${details?.response_time || business.response || 'Responds in 2 hours'} • ${years}`;
  }
  if (elements.businessStory) {
    elements.businessStory.textContent = details?.story || `${business.name} helps buyers discover reliable products with transparent communication, clear pricing, and long-term supplier relationships.`;
  }

  if (elements.businessTrustStats) {
    elements.businessTrustStats.innerHTML = `
      <article><strong>${details?.trust_score || (business.rating?.toFixed ? Math.round(business.rating * 20) : '84')}/100</strong><span>Trust score</span></article>
      <article><strong>${details?.products_count || business.products || relatedProducts.length}</strong><span>Products listed</span></article>
      <article><strong>${details?.verified || business.verified ? 'Verified' : 'Standard'}</strong><span>GST status</span></article>
      <article><strong>${details?.inquiry_count || Math.max(relatedProducts.length * 7, 12)}</strong><span>Inquiries handled</span></article>
    `;
  }

  if (elements.businessWhatsappLink) {
    const phone = String(business.phone || '').replace(/\D/g, '');
    elements.businessWhatsappLink.href = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  }
  if (elements.businessCallLink) {
    elements.businessCallLink.href = `tel:${business.phone || ''}`;
  }

  if (elements.businessCertifications) {
    elements.businessCertifications.innerHTML = certifications
      .map((item) => `<article class="lead-card"><strong>${item}</strong></article>`)
      .join('');
  }
  if (elements.businessSocialLinks) {
    elements.businessSocialLinks.innerHTML = socials
      .map((item) => `<article class="lead-card"><strong>${item.label}</strong><a href="${item.value}" target="_blank" rel="noopener noreferrer">${item.value}</a></article>`)
      .join('');
  }
  if (elements.businessGallery) {
    const galleryImages = details?.gallery?.length
      ? details.gallery
      : (relatedProducts.length ? relatedProducts.map((item) => item.image) : state.products.slice(0, 6).map((item) => item.image));
    elements.businessGallery.innerHTML = galleryImages
      .map((image, idx) => `<img src="${image}" alt="${business.name} gallery ${idx + 1}" />`)
      .join('');
  }
  if (elements.businessProductsGrid) {
    elements.businessProductsGrid.innerHTML = relatedProducts.length
      ? relatedProducts.map(renderProductCard).join('')
      : '<div class="empty-state"><h3>No products available yet</h3><p>This business is updating listings.</p></div>';
  }

  showBuyerTab('business');
}

async function openBusinessProfileRoute(businessName) {
  const slug = slugify(businessName);
  const business = state.dealers.find((item) => slugify(item.name) === slug);
  if (!business) return;
  history.pushState({ type: 'business', slug }, '', `/business/${slug}`);
  const details = await fetchBusinessProfileData(slug);
  renderBusinessProfilePage(business, details);
}

async function handleAppRoute() {
  const path = window.location.pathname || '/';
  const user = JSON.parse(localStorage.getItem('mp_user') || 'null');

  if (path === '/messages') {
    if (!user) {
      showView('homeView');
      showBuyerTab('home');
      openAuthDrawer('login');
      return;
    }

    if (user.role === 'seller') {
      showView('sellerDashboard');
      loadSellerDashboard(user);
      scrollToSection('#sellerLeadInbox');
      return;
    }

    showView('homeView');
    showBuyerTab('messages');
    return;
  }

  if (path === '/buyer') {
    showView('homeView');
    if (user) {
      showBuyerTab('profile');
    } else {
      showBuyerTab('home');
      openAuthDrawer('login');
    }
    return;
  }

  if (path === '/seller') {
    if (user && user.role === 'seller') {
      showView('sellerDashboard');
      loadSellerDashboard(user);
    } else {
      showView('homeView');
      showBuyerTab('home');
      openAuthDrawer('register');
      const roleSelect = document.getElementById('authRole');
      if (roleSelect) roleSelect.value = 'seller';
    }
    return;
  }

  if (path.startsWith('/business/')) {
    const slug = path.split('/business/')[1] || '';
    const business = state.dealers.find((item) => slugify(item.name) === slug);
    if (business) {
      const details = await fetchBusinessProfileData(slug);
      renderBusinessProfilePage(business, details);
      return;
    }
  }

  showView('homeView');
  showBuyerTab('home');
}

function renderTrendingProducts() {
  if (!elements.trendingProductsList) return;
  elements.trendingProductsList.innerHTML = state.products.map(renderProductCard).join('');
}

function renderFeaturedDealers() {
  if (!elements.featuredDealersList) return;
  elements.featuredDealersList.innerHTML = state.dealers
    .map(
      (dealer) => `
      <article class="dealer-card">
        <div>
          <div class="supplier-logo">${dealer.name.split(' ').slice(0,2).map((s) => s[0]).join('')}</div>
          <h3>${dealer.name}</h3>
          <p>${dealer.location}</p>
        </div>
        <div class="dealer-info">
          <span class="badge ${dealer.verified ? 'badgeVerified' : 'badgeSoft'}">${dealer.verified ? 'GST Verified' : 'Verified'}</span>
          <span>${dealer.rating.toFixed(1)} ★</span>
        </div>
        <p>${dealer.products} products listed</p>
        <button class="button buttonSecondary dealer-btn" type="button" data-seller="${dealer.name}">View Products</button>
        <div style="margin-top:8px;display:flex;gap:8px;">
          <a class="button buttonGhost" href="tel:${dealer.phone}">Call</a>
          <a class="button buttonPrimary" href="https://wa.me/${dealer.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hello, I want to inquire about your products on marketplace-store-fef91.web.app')}" target="_blank">WhatsApp</a>
        </div>
      </article>
    `,
    )
    .join('');
}

function renderNewArrivals() {
  if (!elements.newArrivalsList) return;
  const sliced = state.products.slice(0, 4);
  elements.newArrivalsList.innerHTML = sliced.map(renderProductCard).join('');
}

function renderRecommendedProducts() {
  if (!elements.recommendedProductsList) return;
  if (state.loading) {
    elements.recommendedProductsList.innerHTML = new Array(4).fill(0).map(()=>`<div class="skeleton" style="height:260px;border-radius:16px"></div>`).join('');
    return;
  }
  elements.recommendedProductsList.innerHTML = state.recommended.map(renderProductCard).join('');
}

function renderNearbyBusinesses() {
  if (!elements.nearbyBusinessesList) return;
  elements.nearbyBusinessesList.innerHTML = state.nearby
    .map(
      (business) => `
      <article class="nearby-card">
        <div>
          <h3>${business.name}</h3>
          <p>${business.location}</p>
        </div>
        <div class="dealer-info">
          <span>${business.rating.toFixed(1)} ★</span>
          <span class="badge ${business.verified ? 'badgeVerified' : 'badgeSoft'}">${business.verified ? 'Verified' : 'Not Verified'}</span>
        </div>
      </article>
    `,
    )
    .join('');
}

function renderTopSuppliers() {
  const el = document.getElementById('topSuppliersList');
  if (!el) return;
  el.innerHTML = state.dealers.map((d) => `
    <article class="supplier-card animateEnter">
      <div class="supplier-logo">${d.name.split(' ').slice(0,2).map((s) => s[0]).join('')}</div>
      <div class="supplier-meta">
        <h4>${d.name} <span style="color:var(--muted);font-weight:600;font-size:0.9rem">• ${d.location}</span></h4>
        <p>${d.products} products • ${d.rating.toFixed(1)} ★ • ${d.verified ? 'GST Verified' : 'Unverified'}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
        <a class="button buttonGhost" href="tel:${d.phone}">Call</a>
        <a class="button buttonPrimary" href="https://wa.me/${d.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hello, I saw your profile on marketplace-store-fef91.web.app')}">WhatsApp</a>
      </div>
    </article>
  `).join('');
}

// Testimonials now rendered via renderSuccessStories() using live `state.successStories`.

function renderStats() {
  const metrics = document.querySelector('.hero-metrics');
  if (!metrics) return;
  metrics.innerHTML = `
    <li><strong>${state.heroStats.products.toLocaleString('en-IN')}</strong><span>Products listed</span></li>
    <li><strong>${state.heroStats.suppliers.toLocaleString('en-IN')}</strong><span>Verified businesses</span></li>
    <li><strong>${state.heroStats.verified.toLocaleString('en-IN')}</strong><span>GST verified sellers</span></li>
  `;
}

function renderVerifiedSellers() {
  if (!elements.verifiedSellersList) return;
  elements.verifiedSellersList.innerHTML = (state.verifiedSellers || [])
    .map(
      (seller) => `
      <article class="dealer-card airbnb-card">
        <div class="supplier-logo">${seller.name.split(' ').slice(0,2).map((s) => s[0]).join('')}</div>
        <div>
          <h3>${seller.name}</h3>
          <p>${seller.location || 'India'}</p>
          <p class="muted">${seller.verified ? 'GST Verified' : 'Trusted'} • ${seller.response || 'Responds in 2 hours'}</p>
        </div>
        <div class="productMetaRow">
          <span class="badge badgeVerified">GST Verified</span>
          <span class="badge badgeSoft">${seller.yearsInBusiness || 5}+ years</span>
          <span class="badge badgeSoft">${seller.products || 0} products</span>
          <span class="badge badgeSoft">Trust ${Math.round((seller.rating || 4.6) * 20)}/100</span>
        </div>
        <div class="cardActions">
          <button class="actionPrimary" type="button" data-action="contact-business" data-seller="${seller.name}">Contact Dealer</button>
          <button class="actionSecondary" type="button" data-action="view-business" data-seller="${seller.name}">Visit Store</button>
        </div>
      </article>
    `,
    )
    .join('');
}

function renderSuccessStories() {
  if (!elements.successStoriesList) return;
  elements.successStoriesList.innerHTML = state.successStories
    .map((story) => `
      <article class="testimonial-card">
        <p>“${story.excerpt}”</p>
        <div style="margin-top:12px;font-weight:700;color:var(--primary);">— ${story.seller}</div>
      </article>
    `)
    .join('');
}

function formatOverviewCurrency(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

function renderBuyerDashboard(profile, data = {}) {
  const buyerName = document.getElementById('buyerName');
  if (buyerName) buyerName.textContent = profile.name || 'Buyer';
  document.getElementById('buyerRecCount').textContent = data.recommendedCount || '0';
  document.getElementById('buyerViewedCount').textContent = data.recentViews || '0';
  document.getElementById('buyerWishlistCount').textContent = data.wishlistCount || '0';
  document.getElementById('buyerSupplierCount').textContent = data.savedSuppliers || '0';
  document.getElementById('buyerRfqCount').textContent = data.rfqCount || '0';
  document.getElementById('buyerOrderCount').textContent = data.orderCount || '0';
  document.getElementById('buyerAnalyticsProductsViewed').textContent = data.analytics?.productsViewed || '0';
  document.getElementById('buyerAnalyticsCategoriesViewed').textContent = data.analytics?.categoriesViewed || '0';
  document.getElementById('buyerAnalyticsSearches').textContent = data.analytics?.recentSearches || '0';
  document.getElementById('buyerAnalyticsInquiryHistory').textContent = data.analytics?.inquiryHistory || '0';
  renderDashboardCards('dashboardRecommended', data.recommendedProducts || []);
  renderDashboardCards('dashboardRecentlyViewed', data.recentlyViewed || []);
  renderDashboardList('dashboardWishlist', data.wishlist || []);
  renderDashboardSuppliers('dashboardSavedSuppliers', data.savedSuppliers || []);
  renderDashboardLeads('dashboardRfqs', data.rfqs || []);
  renderDashboardLeads('dashboardOrders', data.orders || []);
}

function renderSellerDashboard(profile, data = {}) {
  const sellerName = document.getElementById('sellerName');
  if (sellerName) sellerName.textContent = profile.name || 'Seller';
  document.getElementById('sellerTotalProducts').textContent = data.totalProducts || '0';
  document.getElementById('sellerTotalViews').textContent = data.totalViews || '0';
  document.getElementById('sellerTotalInquiries').textContent = data.totalInquiries || '0';
  document.getElementById('sellerTotalOrders').textContent = data.totalOrders || '0';
  document.getElementById('sellerRevenue').textContent = formatOverviewCurrency(data.revenue || 0);
  document.getElementById('sellerFollowers').textContent = data.followers || '0';
  renderDashboardLeads('sellerProductPerformance', data.productPerformance || []);
  renderDashboardAnalytics('sellerTrafficAnalytics', data.trafficAnalytics || []);
  renderDashboardAnalytics('sellerSalesAnalytics', data.salesAnalytics || []);
  renderDashboardList('sellerSupplierProfile', [data.supplierProfile || {}]);
  renderDashboardSuppliers('sellerProductsList', data.products || []);
  renderDashboardLeadTable('sellerLeadInbox', data.leads || []);

  const insightsContainer = document.getElementById('sellerInsightsCards');
  if (insightsContainer) {
    const cards = data.sellerInsights || [];
    insightsContainer.innerHTML = cards.map((card) => `
      <article class="insight-widget">
        <strong>${card.title}</strong>
        <p>${card.value}</p>
        <span class="muted">${card.note || ''}</span>
      </article>
    `).join('');
  }

  renderCompletionPanels(profile || {});
}

function renderAdminDashboard(data = {}) {
  document.getElementById('adminTotalUsers').textContent = data.totalUsers || '0';
  document.getElementById('adminTotalBuyers').textContent = data.totalBuyers || '0';
  document.getElementById('adminTotalSellers').textContent = data.totalSellers || '0';
  document.getElementById('adminTotalProducts').textContent = data.totalProducts || '0';
  document.getElementById('adminTotalOrders').textContent = data.totalOrders || '0';
  document.getElementById('adminPlatformRevenue').textContent = formatOverviewCurrency(data.platformRevenue || 0);
}

function renderDashboardCards(listId, items) {
  const container = document.getElementById(listId);
  if (!container) return;
  container.innerHTML = items.map((item) => `
    <article class="feedCard">
      <img class="feedImage" src="${item.image || 'https://images.unsplash.com/photo-1542293787938-c9e299b8804b?auto=format&fit=crop&w=900&q=80'}" alt="${item.name || 'Product'}" />
      <div class="feedCardBody">
        <div class="feedTitle">${item.name || item.title || 'Product'}</div>
        <p class="feedMeta">${item.description || item.summary || ''}</p>
        <div class="productMetaRow">
          <span class="metaBadge">${item.price ? formatPrice(item.price) : ''}</span>
          <span class="badge badgeVerified">${item.status || item.seller || ''}</span>
        </div>
      </div>
    </article>
  `).join('');
}

function renderDashboardSuppliers(listId, suppliers) {
  const container = document.getElementById(listId);
  if (!container) return;
  container.innerHTML = suppliers.map((supplier) => `
    <article class="supplier-card">
      <div class="supplier-logo">${supplier.name?.split(' ').slice(0,2).map((word) => word[0]).join('')}</div>
      <div class="supplier-meta">
        <h4>${supplier.name || 'Supplier'}</h4>
        <p>${supplier.location || ''}</p>
      </div>
      <div class="dealer-info">
        <span class="badge badgeVerified">${supplier.verified ? 'GST Verified' : 'Verified'}</span>
        <span>${supplier.rating ? `${supplier.rating} ★` : ''}</span>
      </div>
    </article>
  `).join('');
}

function renderDashboardLeads(listId, leads) {
  const container = document.getElementById(listId);
  if (!container) return;
  if (!Array.isArray(leads) || leads.length === 0) {
    container.innerHTML = '<p class="muted">No items found.</p>';
    return;
  }
  container.innerHTML = leads.map((item) => `
    <article class="lead-card">
      <strong>${item.title || item.name || item.productName || 'Record'}</strong>
      <p>${item.message || item.summary || item.note || ''}</p>
      <div class="productMetaRow">
        <span>${item.status || item.date || ''}</span>
        <span>${item.contact || ''}</span>
      </div>
    </article>
  `).join('');
}

function renderDashboardAnalytics(listId, items) {
  const container = document.getElementById(listId);
  if (!container) return;
  container.innerHTML = items.map((item) => `
    <article class="analytics-card">
      <strong>${item.value || '0'}</strong>
      <span>${item.label || 'Metric'}</span>
    </article>
  `).join('');
}

function renderDashboardLeadTable(listId, leads) {
  const container = document.getElementById(listId);
  if (!container) return;
  if (!Array.isArray(leads) || leads.length === 0) {
    container.innerHTML = '<p class="muted">No leads yet.</p>';
    return;
  }
  container.innerHTML = `
    <div class="lead-table-header">
      <span>Buyer</span>
      <span>Product</span>
      <span>Message</span>
      <span>Date</span>
      <span>Status</span>
    </div>
    ${leads.map((lead) => `
      <div class="lead-table-row">
        <span>${lead.buyerName || 'Buyer'}</span>
        <span>${lead.productName || 'Product'}</span>
        <span>${lead.message || '--'}</span>
        <span>${lead.date || '--'}</span>
        <span>${lead.status || 'New'}</span>
      </div>
    `).join('')}
  `;
}

async function loadBuyerDashboard(profile) {
  if (!db || !profile) return;
  const [wishlistSnapshot, rfqSnapshot, ordersSnapshot, savedSuppliersSnapshot] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.wishlist).where('buyerId', '==', profile.uid).get(),
    db.collection(FIRESTORE_COLLECTIONS.inquiries).where('buyerId', '==', profile.uid).get(),
    db.collection(FIRESTORE_COLLECTIONS.orders).where('buyerId', '==', profile.uid).get(),
    db.collection(FIRESTORE_COLLECTIONS.savedSuppliers).where('buyerId', '==', profile.uid).get(),
  ]);

  const wishlist = wishlistSnapshot.docs.map((doc) => doc.data());
  const rfqs = rfqSnapshot.docs.map((doc) => doc.data());
  const orders = ordersSnapshot.docs.map((doc) => doc.data());
  const savedSuppliers = savedSuppliersSnapshot.docs.map((doc) => doc.data());

  const analyticsDoc = await db.collection(FIRESTORE_COLLECTIONS.analytics).doc(profile.uid).get();
  const analytics = analyticsDoc.exists ? analyticsDoc.data() : {};

  const recentlyViewedSnapshot = await db.collection(FIRESTORE_COLLECTIONS.productViews)
    .where('viewerId', '==', profile.uid)
    .orderBy('timestamp', 'desc')
    .limit(8)
    .get();

  const recentlyViewed = recentlyViewedSnapshot.docs.map((doc) => doc.data());

  const recommendedProducts = state.products.slice(0, 6);
  renderBuyerDashboard(profile, {
    recommendedCount: recommendedProducts.length,
    recentViews: recentlyViewed.length,
    wishlistCount: wishlist.length,
    savedSuppliers: savedSuppliers.length,
    rfqCount: rfqs.length,
    orderCount: orders.length,
    analytics: {
      productsViewed: analytics.productsViewed || 0,
      categoriesViewed: analytics.categoriesViewed || 0,
      recentSearches: analytics.recentSearches || 0,
      inquiryHistory: rfqs.length,
    },
    recommendedProducts,
    recentlyViewed,
    wishlist,
    savedSuppliers,
    rfqs,
    orders,
  });
}

async function loadSellerDashboard(profile) {
  if (!db || !profile) return;
  const productsSnapshot = await db.collection(FIRESTORE_COLLECTIONS.products).where('sellerId', '==', profile.uid).get();
  const products = productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const productIds = products.map((product) => product.id);
  const viewPromises = productIds.length ? db.collection(FIRESTORE_COLLECTIONS.productViews).where('productId', 'in', productIds).get() : Promise.resolve({ docs: [] });
  const inquiryPromises = productIds.length ? db.collection(FIRESTORE_COLLECTIONS.inquiries).where('productId', 'in', productIds).get() : Promise.resolve({ docs: [] });
  const orderPromises = productIds.length ? db.collection(FIRESTORE_COLLECTIONS.orders).where('productId', 'in', productIds).get() : Promise.resolve({ docs: [] });

  const [viewsSnapshot, inquiriesSnapshot, ordersSnapshot] = await Promise.all([viewPromises, inquiryPromises, orderPromises]);

  const views = viewsSnapshot.docs.map((doc) => doc.data());
  const inquiries = inquiriesSnapshot.docs.map((doc) => doc.data());
  const orders = ordersSnapshot.docs.map((doc) => doc.data());

  const totalViews = views.length;
  const totalInquiries = inquiries.length;
  const totalOrders = orders.length;
  const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

  const productPerformance = products.map((product) => {
    const productViews = views.filter((view) => view.productId === product.id).length;
    const productInquiries = inquiries.filter((inq) => inq.productId === product.id).length;
    const productOrders = orders.filter((order) => order.productId === product.id).length;
    const productWhatsapp = views.filter((view) => view.productId === product.id && view.source === 'whatsapp').length;
    const conversion = productViews ? Math.round((productOrders / productViews) * 100) : 0;
    return {
      title: product.name,
      message: `Views: ${productViews}, Inquiries: ${productInquiries}, Orders: ${productOrders}`,
      status: `WhatsApp: ${productWhatsapp}, Conv: ${conversion}%`,
    };
  });

  const trafficAnalytics = [
    { label: 'People who viewed your products today', value: Math.round(totalViews / 7) || 0 },
    { label: 'People who viewed your products this week', value: totalViews || 0 },
    { label: 'People who viewed your products this month', value: totalViews * 4 || 0 },
  ];

  const salesAnalytics = [
    { label: 'Businesses contacted you today', value: inquiries.filter((inq) => isSameDay(new Date(inq.createdAt?.toDate?.() || inq.createdAt), new Date())).length },
    { label: 'New business inquiries this week', value: inquiries.filter((inq) => isSameWeek(new Date(inq.createdAt?.toDate?.() || inq.createdAt), new Date())).length },
    { label: 'Orders confirmed this month', value: orders.filter((order) => isSameMonth(new Date(order.createdAt?.toDate?.() || order.createdAt), new Date())).length },
  ];

  const topProduct = productPerformance[0]?.title || 'No popular product yet';
  const categoryTrend = products[0]?.category || 'General';
  const sellerInsights = [
    {
      title: 'People interested in your products',
      value: totalViews ? `${totalViews} this week` : 'No views yet. Share your listings on WhatsApp to start activity.',
      note: totalViews ? '+18% this week' : 'Activity appears after the first product views.',
    },
    {
      title: 'Most Popular Product',
      value: totalViews ? `${topProduct}` : 'Your first product will appear here.',
      note: totalViews ? `${Math.max(1, Math.round(totalViews / Math.max(products.length, 1)))} views` : 'Add products to unlock this insight.',
    },
    {
      title: 'Buyer Interest',
      value: totalInquiries ? `${categoryTrend} category is leading` : 'No inquiries yet. Keep profile complete and verified.',
      note: totalInquiries ? `+${Math.max(3, Math.round((totalInquiries / Math.max(totalViews, 1)) * 100))}% interest trend` : 'Insights improve as buyers contact you.',
    },
    {
      title: 'New Business Inquiries',
      value: totalInquiries ? `${totalInquiries} this week` : 'No inquiries yet this week.',
      note: totalOrders ? `${totalOrders} converted to orders` : 'Enable fast response badge to increase conversions.',
    },
  ];

  const leads = inquiries.map((inq) => ({
    buyerName: inq.buyerName || 'Buyer',
    productName: inq.productName || 'Product',
    message: inq.message || '',
    date: inq.createdAt?.toDate ? inq.createdAt.toDate().toLocaleDateString() : inq.createdAt || '',
    status: inq.status || 'New',
  }));

  renderSellerDashboard(profile, {
    totalProducts: products.length,
    totalViews,
    totalInquiries,
    totalOrders,
    revenue,
    followers: 0,
    productPerformance,
    trafficAnalytics,
    salesAnalytics,
    supplierProfile: {
      name: profile.name,
      location: profile.gstNumber ? 'GST verified' : 'Unverified',
      rating: 4.7,
      verified: !!profile.gstNumber,
    },
    products,
    leads,
    sellerInsights,
  });
}

async function loadAdminDashboard() {
  if (!db) return;
  const [usersSnapshot, buyersSnapshot, sellersSnapshot, productsSnapshot, ordersSnapshot] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.users).get(),
    db.collection(FIRESTORE_COLLECTIONS.users).where('role', '==', 'buyer').get(),
    db.collection(FIRESTORE_COLLECTIONS.users).where('role', '==', 'seller').get(),
    db.collection(FIRESTORE_COLLECTIONS.products).get(),
    db.collection(FIRESTORE_COLLECTIONS.orders).get(),
  ]);

  const platformRevenue = ordersSnapshot.docs.reduce((sum, doc) => {
    const order = doc.data();
    return sum + (order.total || 0);
  }, 0);

  renderAdminDashboard({
    totalUsers: usersSnapshot.size,
    totalBuyers: buyersSnapshot.size,
    totalSellers: sellersSnapshot.size,
    totalProducts: productsSnapshot.size,
    totalOrders: ordersSnapshot.size,
    platformRevenue,
  });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameWeek(a, b) {
  const oneJan = new Date(a.getFullYear(), 0, 1);
  const aWeek = Math.ceil((((a - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  const bWeek = Math.ceil((((b - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return a.getFullYear() === b.getFullYear() && aWeek === bWeek;
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

async function trackProductView(product, source = 'browse') {
  if (!db || !currentUserProfile || !product) return;
  await db.collection(FIRESTORE_COLLECTIONS.productViews).add({
    productId: product.id,
    viewerId: currentUserProfile.uid,
    sellerId: product.sellerId || '',
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    source,
  });
}

async function trackWhatsappClick(product) {
  if (!db || !currentUserProfile || !product) return;
  await db.collection(FIRESTORE_COLLECTIONS.analytics).doc(currentUserProfile.uid).set({
    whatsappClicks: firebase.firestore.FieldValue.increment(1),
  }, { merge: true });
  await db.collection(FIRESTORE_COLLECTIONS.productViews).add({
    productId: product.id,
    viewerId: currentUserProfile.uid,
    sellerId: product.sellerId || '',
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    source: 'whatsapp',
  });
}

function fillProfile() {
  const user = JSON.parse(localStorage.getItem('mp_user') || 'null');
  const navDashboardLabel = document.getElementById('navDashboardLabel');
  const navDashboardIcon = document.getElementById('navDashboardIcon');
  const mobileProfileLabel = document.getElementById('mobileProfileLabel');
  const applyAccountState = (label, icon) => {
    if (navDashboardLabel) navDashboardLabel.textContent = label;
    if (mobileProfileLabel) mobileProfileLabel.textContent = label;
    if (navDashboardIcon) navDashboardIcon.textContent = icon;
  };

  if (!elements.profileName || !elements.profileMeta) {
    if (elements.navLoginBtn) elements.navLoginBtn.textContent = user ? 'Logout' : 'Login';
    applyAccountState(user ? 'Profile' : 'Account', user?.name ? user.name.charAt(0).toUpperCase() : '👤');
    return;
  }
  if (user && user.name) {
    elements.profileName.textContent = user.name;
    elements.profileMeta.textContent = `${user.role === 'seller' ? 'Seller' : user.role === 'admin' ? 'Admin' : 'Buyer'} • ${user.email || ''}`;
    if (elements.navLoginBtn) elements.navLoginBtn.textContent = 'Logout';
    applyAccountState('Profile', user.name.charAt(0).toUpperCase());
    renderCompletionPanels(user);
  } else {
    elements.profileName.textContent = 'marketplace-store-fef91.web.app Guest';
    elements.profileMeta.textContent = 'Sign in to see personalized supplier recommendations.';
    if (elements.navLoginBtn) elements.navLoginBtn.textContent = 'Login';
    applyAccountState('Account', '👤');
  }
}

function handleSearchSubmit(event) {
  event.preventDefault();
  const query = elements.globalSearch.value.trim();
  const category = elements.categorySelect.value;
  const selectedState = elements.stateSelect ? elements.stateSelect.value : '';
  const location = elements.locationSelect.value;
  state.query = query;
  state.category = category;
  state.selectedState = selectedState;
  state.location = location;
  trainAiAssistant('search', { query, category, city: location });
  const recentSearches = JSON.parse(localStorage.getItem('mp_recent_searches') || '[]');
  const next = [query || category || location, ...recentSearches].filter(Boolean);
  localStorage.setItem('mp_recent_searches', JSON.stringify([...new Set(next)].slice(0, 10)));
  trackGaEvent('search_query', {
    query,
    category,
    state_location: selectedState || null,
    city_location: location || null,
  });
  applyFilters();
}

function applyFilters() {
  const filtered = state.products.filter((product) => {
    const queryMatch = !state.query || product.name.toLowerCase().includes(state.query.toLowerCase()) || product.description.toLowerCase().includes(state.query.toLowerCase()) || product.seller.toLowerCase().includes(state.query.toLowerCase());
    const categoryMatch = !state.category || product.category === state.category;
    const stateMatch = !state.selectedState || (STATE_CITY_MAP[state.selectedState] || []).includes(product.location);
    const locationMatch = !state.location || product.location === state.location;
    return queryMatch && categoryMatch && stateMatch && locationMatch;
  });
  state.recommended = filtered.slice(0, 4);
  renderTrendingProducts();
  renderNewArrivals();
  renderRecommendedProducts();
  renderExploreView();
  renderRails();
}

function handleTopButton(action) {
  const user = JSON.parse(localStorage.getItem('mp_user') || 'null');
  if (action === 'sell') {
    if (!user) {
      history.pushState({ type: 'seller' }, '', '/seller');
      showView('homeView');
      showBuyerTab('home');
      openAuthDrawer('register');
      const roleSelect = document.getElementById('authRole');
      if (roleSelect) roleSelect.value = 'seller';
      return;
    }
    if (user.role === 'seller') {
      history.pushState({ type: 'seller' }, '', '/seller');
      showView('sellerDashboard');
      loadSellerDashboard(user);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    alert('Switch your role to seller from registration to list products.');
    return;
  }
  if (action === 'profile') {
    if (!user) {
      history.pushState({ type: 'buyer' }, '', '/buyer');
      showView('homeView');
      showBuyerTab('home');
      openAuthDrawer('login');
      return;
    }
    trackGaEvent('seller_profile_view', {
      role: user.role || 'buyer',
    });
    if (user.role === 'buyer') {
      history.pushState({ type: 'buyer' }, '', '/buyer');
      showView('homeView');
      showBuyerTab('profile');
    } else {
      history.pushState({ type: 'seller' }, '', '/seller');
      showView('sellerDashboard');
      loadSellerDashboard(user);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (action === 'messages') {
    openMessagesPage();
    return;
  }
  alert('Feature coming soon.');
}

function handleWhatsApp() {
  trackGaEvent('whatsapp_click', {
    source: 'floating_button',
  });
  const message = encodeURIComponent('Hello, I need help with marketplace-store-fef91.web.app login and products.');
  window.open(`https://wa.me/?text=${message}`, '_blank');
}

function attachEvents() {
  if (elements.searchHeroForm) elements.searchHeroForm.addEventListener('submit', handleSearchSubmit);
  if (elements.stateSelect) {
    elements.stateSelect.addEventListener('change', () => {
      state.selectedState = elements.stateSelect.value || '';
      populateIndianCities();
      applyFilters();
    });
  }
  if (elements.heroSearchBtn) elements.heroSearchBtn.addEventListener('click', () => elements.searchHeroForm.requestSubmit());
  if (elements.exploreBusinessesBtn) elements.exploreBusinessesBtn.addEventListener('click', () => {
    showBuyerTab('explore');
    scrollToSection('#verifiedBusinessesSection');
  });
  if (elements.becomeSellerBtn) elements.becomeSellerBtn.addEventListener('click', () => handleTopButton('sell'));
  if (elements.buyerBrowseBtn) elements.buyerBrowseBtn.addEventListener('click', () => scrollToSection('#trendingProductsList'));
  if (elements.sellerAddProductBtn) elements.sellerAddProductBtn.addEventListener('click', () => handleTopButton('sell'));
  if (elements.navSellerBtn) elements.navSellerBtn.addEventListener('click', () => handleTopButton('sell'));
  if (elements.navSellerBtnSecondary) elements.navSellerBtnSecondary.addEventListener('click', () => handleTopButton('sell'));
  if (elements.navDashboardBtn) elements.navDashboardBtn.addEventListener('click', () => handleTopButton('profile'));
  if (elements.navLoginBtn) elements.navLoginBtn.addEventListener('click', handleLoginButton);
  if (elements.exploreSuppliersBtn) elements.exploreSuppliersBtn.addEventListener('click', () => {
    showBuyerTab('explore');
    scrollToSection('#verifiedBusinessesSection');
  });
  if (elements.viewAllProductsBtn) elements.viewAllProductsBtn.addEventListener('click', () => {
    state.query = '';
    state.category = '';
    state.selectedState = '';
    state.location = '';
    if (elements.globalSearch) elements.globalSearch.value = '';
    if (elements.categorySelect) elements.categorySelect.value = '';
    if (elements.stateSelect) elements.stateSelect.value = '';
    populateIndianCities();
    if (elements.locationSelect) elements.locationSelect.value = '';
    applyFilters();
    scrollToSection('#trendingProductsList');
  });
  if (elements.exploreDealersBtn) elements.exploreDealersBtn.addEventListener('click', () => scrollToSection('#featuredDealersList'));
  if (elements.seeNewListingsBtn) elements.seeNewListingsBtn.addEventListener('click', () => scrollToSection('#newArrivalsList'));
  if (elements.whatsAppFab) elements.whatsAppFab.addEventListener('click', handleWhatsApp);
  if (elements.voiceSearchBtn) elements.voiceSearchBtn.addEventListener('click', handleVoiceSearch);
  if (elements.textSizeToggleBtn) elements.textSizeToggleBtn.addEventListener('click', handleTextSizeToggle);
  if (elements.profileAccountSettingsBtn) elements.profileAccountSettingsBtn.addEventListener('click', () => {
    alert('Account settings panel is opening soon. Contact support for urgent profile updates.');
  });
  if (elements.profileLogoutBtn) elements.profileLogoutBtn.addEventListener('click', () => {
    signOutCurrentUser();
    showBuyerTab('home');
  });
  if (elements.onboardingCtaBtn) elements.onboardingCtaBtn.addEventListener('click', () => {
    showBuyerTab('explore');
    scrollToSection('#searchHeroForm');
    trackGaEvent('onboarding_start', { source: 'onboarding_banner' });
  });
  if (elements.businessBackBtn) elements.businessBackBtn.addEventListener('click', () => {
    history.pushState({ type: 'home' }, '', '/');
    showBuyerTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  if (elements.exportDataBtn) elements.exportDataBtn.addEventListener('click', () => {
    const payload = {
      favorites: state.favoriteProductIds,
      businesses: state.favoriteBusinessNames,
      category: state.category,
      location: state.location,
    };
    alert(`Data export ready: ${JSON.stringify(payload)}`);
  });
  if (elements.deleteAccountBtn) elements.deleteAccountBtn.addEventListener('click', () => {
    alert('Account deletion request submitted. Support will confirm shortly.');
  });

  [
    ['analytics', elements.privacyAnalyticsToggle],
    ['personalization', elements.privacyPersonalizationToggle],
    ['location', elements.privacyLocationToggle],
  ].forEach(([key, node]) => {
    if (!node) return;
    node.addEventListener('change', () => {
      const privacy = JSON.parse(localStorage.getItem('mp_privacy_settings') || '{}');
      privacy[key] = !!node.checked;
      localStorage.setItem('mp_privacy_settings', JSON.stringify(privacy));
    });
  });

  document.querySelectorAll('.quick-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const value = chip.getAttribute('data-chip') || '';
      state.query = value;
      if (elements.globalSearch) elements.globalSearch.value = value;
      trainAiAssistant('quickChip', { query: value, category: value, city: state.location });
      applyFilters();
      trackGaEvent('category_click', { category: value });
    });
  });

  elements.mobileNavItems.forEach((button) => {
    button.addEventListener('click', () => {
      elements.mobileNavItems.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      handleMobileNav(button.dataset.nav);
    });
  });
  // Delegate product card and dealer interactions
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action], button.dealer-btn');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    const seller = btn.getAttribute('data-seller');

    if (action === 'contact' && id) {
      const product = state.products.find((p) => p.id === id);
      if (!product) return;
      trackGaEvent('product_view', {
        product_id: product.id,
      });
      trainAiAssistant('contactDealer', { query: product.name, category: product.category, city: product.location });
      trackProductView(product, 'details');
      openProductModal(product);
      trackGaEvent('seller_contact', {
        product_id: product.id,
      });
      return;
    }

    if (action === 'whatsapp' && id) {
      const product = state.products.find((p) => p.id === id);
      if (!product) return;
      trackWhatsappClick(product);
      trainAiAssistant('whatsappDealer', { query: product.name, category: product.category, city: product.location });
      const text = encodeURIComponent(`Hello, I am interested in ${product.name}.`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
      return;
    }

    if (action === 'save-product' && id) {
      const product = state.products.find((p) => p.id === id);
      if (!state.favoriteProductIds.includes(id)) {
        state.favoriteProductIds.push(id);
        localStorage.setItem('mp_favorite_products', JSON.stringify(state.favoriteProductIds));
      }
      trainAiAssistant('saveProduct', { query: product?.name || '', category: product?.category || '', city: product?.location || '' });
      trackGaEvent('favorite_product', { product_id: id });
      renderFavoritesView();
      return;
    }

    if (action === 'share-product' && id) {
      const product = state.products.find((p) => p.id === id);
      if (!product) return;
      const shareText = `${product.name} by ${product.seller} on marketplace-store-fef91.web.app`;
      const shareUrl = window.location.origin;
      trainAiAssistant('shareProduct', { query: product.name, category: product.category, city: product.location });
      if (navigator.share) {
        navigator.share({ title: product.name, text: shareText, url: shareUrl }).catch(() => {});
      } else {
        safeClipboardWrite(`${shareText} - ${shareUrl}`)
          .then((copied) => {
            if (copied) alert('Product link copied for sharing.');
            else alert('Clipboard access denied. Please copy from the address bar.');
          })
          .catch(() => alert('Clipboard access failed. Please copy from the address bar.'));
      }
      return;
    }

    if (action === 'details' && id) {
      const product = state.products.find((p) => p.id === id);
      if (!product) return;
      openProductModal(product);
      return;
    }

    if (action === 'view-business' && seller) {
      const business = state.dealers.find((d) => d.name === seller);
      if (business) {
        trackGaEvent('business_profile_view', { business_name: seller });
        openBusinessProfileRoute(business.name);
      }
      return;
    }

    if (action === 'contact-business' && seller) {
      const business = state.dealers.find((d) => d.name === seller);
      if (!business) return;
      trackGaEvent('seller_contact', { seller_name: seller });
      const text = encodeURIComponent(`Hello ${seller}, I found your business on marketplace-store-fef91.web.app and would like to connect.`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
      return;
    }

    if (action === 'save-business' && seller) {
      if (!state.favoriteBusinessNames.includes(seller)) {
        state.favoriteBusinessNames.push(seller);
        localStorage.setItem('mp_favorite_businesses', JSON.stringify(state.favoriteBusinessNames));
      }
      renderFavoritesView();
      alert('Business saved to favorites.');
      return;
    }

    if (btn.classList.contains('dealer-btn') && seller) {
      state.query = '';
      state.category = '';
      state.selectedState = '';
      state.location = '';
      if (elements.stateSelect) elements.stateSelect.value = '';
      populateIndianCities();
      state.recommended = state.products.filter((p) => p.seller === seller).slice(0, 8);
      renderRecommendedProducts();
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }
  });

  document.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip]');
    if (chip && chip.classList.contains('trending-chip')) {
      const value = chip.getAttribute('data-chip') || '';
      if (elements.globalSearch) elements.globalSearch.value = value;
      state.query = value;
      applyFilters();
      showBuyerTab('explore');
      return;
    }

    const suggestion = e.target.closest('[data-ai-suggestion]');
    if (suggestion) {
      const phrase = suggestion.getAttribute('data-ai-suggestion') || '';
      if (elements.globalSearch) elements.globalSearch.value = phrase;
      state.query = phrase;
      trainAiAssistant('aiSuggestionClick', { query: phrase, city: state.location });
      applyFilters();
      showBuyerTab('explore');
    }
  });
}

// Simple trending carousel auto-scroll
function initCarousel() {
  const track = document.querySelector('#trendingProductsList');
  if (!track) return;
  let pos = 0;
  setInterval(() => {
    if (track.scrollWidth <= track.clientWidth) return;
    pos = (pos + track.clientWidth * 0.95) % (track.scrollWidth);
    track.scrollTo({ left: pos, behavior: 'smooth' });
  }, 3500);
}

function scrollToSection(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
}

function handleLoginButton() {
  const user = JSON.parse(localStorage.getItem('mp_user') || 'null');
  if (user) {
    signOutCurrentUser();
    alert('Logged out');
    return;
  }
  openAuthDrawer('login');
}

function handleMobileNav(key) {
  switch (key) {
    case 'home':
      showBuyerTab('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'explore':
      showBuyerTab('explore');
      scrollToSection('#exploreView');
      break;
    case 'favorites':
      showBuyerTab('favorites');
      break;
    /* Messages route removed for simplified buyer experience */
    case 'profile':
      const user = JSON.parse(localStorage.getItem('mp_user') || 'null');
      if (!user) {
        openAuthDrawer('login');
        return;
      }
      showBuyerTab('profile');
      trackGaEvent('business_profile_view', { scope: 'buyer_profile' });
      break;
    default:
      break;
  }
}

function bootstrap() {
  populateStateOptions();
  populateIndianCities();
  showBuyerTab('home');
  updateBuyerGreeting();
  fillProfile();
  renderCategories();
  renderTrendingProducts();
  renderFeaturedDealers();
  renderNewArrivals();
  renderRecommendedProducts();
  renderNearbyBusinesses();
  renderVerifiedSellers();
  renderSuccessStories();
  renderExploreView();
  renderFavoritesView();
  renderProfileView();
  renderRails();
  attachEvents();
  window.addEventListener('popstate', handleAppRoute);
  handleAppRoute();
}

async function initializeAppData() {
  state.loading = true;
  renderRecommendedProducts();

  const renderFallbackHomeData = () => {
    state.products = [];
    state.dealers = [];
    state.recommended = [];
    state.successStories = [];
    state.nearby = [];
    state.verifiedSellers = [];
    state.heroStats.products = 0;
    state.heroStats.suppliers = 0;
    state.heroStats.verified = 0;

    renderCategories();
    renderTrendingProducts();
    renderNewArrivals();
    renderRecommendedProducts();
    renderFeaturedDealers();
    renderTopSuppliers();
    renderSuccessStories();
    renderStats();
  };

  if (!db) {
    renderFallbackHomeData();
    state.loading = false;
    return;
  }

  try {
    const [productsSnapshot, categoriesSnapshot, sellersSnapshot] = await Promise.all([
      db.collection(FIRESTORE_COLLECTIONS.products).limit(40).get(),
      db.collection(FIRESTORE_COLLECTIONS.categories).get(),
      db.collection(FIRESTORE_COLLECTIONS.users).where('role', '==', 'seller').limit(16).get(),
    ]);

    state.products = productsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      image: doc.data().image || 'https://via.placeholder.com/520x320?text=Product',
      category: doc.data().category || 'General',
      location: doc.data().location || 'India',
      status: doc.data().status || 'In stock',
      rating: doc.data().rating || 4.2,
      verified: !!doc.data().verified,
    }));

    state.categories = categoriesSnapshot.docs.map((doc) => ({
      name: doc.id,
      icon: doc.data()?.icon || '📦',
      count: doc.data()?.count || `${Math.floor(Math.random() * 5000) + 1000}`,
    }));

    state.dealers = sellersSnapshot.docs.map((doc) => ({
      name: doc.data().name || doc.data().shopName || 'Seller',
      location: doc.data().location || 'India',
      rating: doc.data().rating || 4.5,
      gst: doc.data().gstNumber || 'N/A',
      products: doc.data().productCount || Math.floor(Math.random() * 120) + 20,
      phone: doc.data().phone || '',
      verified: !!doc.data().gstNumber,
      logo: doc.data().logo || '',
    }));

    state.businessBySlug = new Map(state.dealers.map((item) => [slugify(item.name), item]));

    state.recommended = state.products.slice(0, 8);
    await fetchHybridRecommendations();
    state.heroStats.products = state.products.length;
    state.heroStats.suppliers = state.dealers.length;
    state.heroStats.verified = state.dealers.filter((dealer) => dealer.verified).length;
    state.successStories = state.dealers.slice(0, 4).map((dealer) => ({
      excerpt: `${dealer.name} in ${dealer.location} is delivering verified business leads and fast supplier response.`,
      seller: dealer.name,
    }));
    state.nearby = state.dealers.slice(0, 4);
    state.verifiedSellers = state.dealers.slice(0, 4);
    state.seasonal = state.products.slice(4, 10);
    state.aiSuggestions = [
      `${state.category || 'Electrical'} products are trending in your area.`,
      'Verified sellers respond faster for first-time inquiries.',
      'Businesses near you are receiving strong demand this week.',
      'Most buyers compare at least 3 suppliers before contacting.',
    ];
    // messages removed from buyer experience; keep minimal guidance elsewhere

    renderCategories();
    renderTrendingProducts();
    renderNewArrivals();
    renderRecommendedProducts();
    renderFeaturedDealers();
    renderTopSuppliers();
    renderSuccessStories();
    renderStats();
    renderExploreView();
    renderFavoritesView();
    renderMessagesView();
    renderProfileView();
    renderRails();
    initCarousel();
  } catch (error) {
    const code = error?.code || '';
    if (code === 'permission-denied' || /insufficient permissions/i.test(String(error?.message || ''))) {
      console.info('Firestore public home read skipped due to permissions.');
    } else {
      console.error('Error loading app data', error);
    }
    renderFallbackHomeData();
  } finally {
    state.loading = false;
  }
}

function handleVoiceSearch() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    alert('Voice search is not supported in this browser yet.');
    return;
  }

  const recognition = new Recognition();
  recognition.lang = 'en-IN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || '';
    if (elements.globalSearch) {
      elements.globalSearch.value = transcript;
      state.query = transcript;
      trainAiAssistant('voiceSearch', { query: transcript, city: state.location });
      applyFilters();
    }
    trackGaEvent('search_query', { query: transcript, source: 'voice' });
  };
  recognition.start();
}

function handleThemeToggle() {
  document.body.classList.toggle('theme-dark');
}

function handleTextSizeToggle() {
  document.body.classList.toggle('large-text');
}

function openBusinessProfileModal(business) {
  const overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.innerHTML = `
    <div class="modal-card">
      <button class="modal-close">×</button>
      <div class="business-profile-modal">
        <div class="business-profile-top">
          <div class="supplier-logo">${business.name.split(' ').slice(0,2).map((s) => s[0]).join('')}</div>
          <div>
            <h2>${business.name}</h2>
            <p>${business.location} • ${business.verified ? 'GST Verified' : 'Trusted Supplier'}</p>
          </div>
        </div>
        <div class="business-trust-grid">
          <article><strong>${business.rating.toFixed(1)} ★</strong><span>Trust score</span></article>
          <article><strong>${business.products}</strong><span>Products listed</span></article>
          <article><strong>${business.verified ? 'Verified' : 'Pending'}</strong><span>GST status</span></article>
          <article><strong>2 hrs</strong><span>Typical response</span></article>
        </div>
        <p class="muted">Business story: helping buyers discover reliable suppliers with transparent communication and fair pricing.</p>
        <div class="cardActions">
          <a class="button buttonPrimary" href="https://wa.me/${(business.phone || '').replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <button class="button buttonSecondary" type="button" data-action="save-business" data-seller="${business.name}">Save Business</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
}

// initializeAppData and bootstrap will run after DOMContentLoaded and Firebase init

// Auth drawer functions
function openAuthDrawer(mode = 'login') {
  authMode = mode;
  let drawer = document.getElementById('authDrawer');
  if (!drawer) return;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  const title = document.getElementById('authTitle');
  const submit = document.getElementById('authSubmit');
  const sendOtpBtn = document.getElementById('authSendOtp');
  const loginOtpBtn = document.getElementById('authLoginOtp');
  const switchBtn = document.getElementById('authSwitch');
  const nameRow = document.getElementById('authNameRow');
  const emailRow = document.getElementById('authEmailRow');
  const passwordRow = document.getElementById('authPasswordRow');
  const otpRow = document.getElementById('authOtpRow');
  title.textContent = mode === 'login' ? 'Login with OTP or Email' : 'Register with Email';
  switchBtn.textContent = mode === 'login' ? 'Switch to Register' : 'Switch to Login';
  if (submit) submit.textContent = mode === 'login' ? 'Login with Email' : 'Register with Email';
  if (submit) submit.onclick = () => handleAuthSubmit(mode, mode === 'login' ? 'passwordLogin' : 'register');
  if (sendOtpBtn) sendOtpBtn.onclick = () => handleAuthSubmit(mode, 'sendOtp');
  if (loginOtpBtn) loginOtpBtn.onclick = () => handleAuthSubmit(mode, 'login');
  switchBtn.onclick = () => openAuthDrawer(mode === 'login' ? 'register' : 'login');
  document.getElementById('authClose').onclick = closeAuthDrawer;

  const emailInput = document.getElementById('authEmail');
  const emailLabel = document.getElementById('authEmailLabel');
  const passwordInput = document.getElementById('authPassword');
  const passwordLabel = document.getElementById('authPasswordLabel');
  const businessNameLabel = document.getElementById('authBusinessNameLabel');
  const businessNameInput = document.getElementById('authBusinessName');
  const categoryLabel = document.getElementById('authCategoryLabel');
  const categoryInput = document.getElementById('authCategory');
  const whatsappLabel = document.getElementById('authWhatsappLabel');
  const whatsappInput = document.getElementById('authWhatsapp');
  const websiteLabel = document.getElementById('authWebsiteLabel');
  const websiteInput = document.getElementById('authWebsite');
  const businessRegLabel = document.getElementById('authBusinessRegLabel');
  const businessRegInput = document.getElementById('authBusinessReg');
  const addressLabel = document.getElementById('authAddressLabel');
  const addressInput = document.getElementById('authAddress');
  const gstLabel = document.getElementById('authGstLabel');
  const gstInput = document.getElementById('authGst');
  const gstHint = document.getElementById('authGstHint');
  const forgotPasswordBtn = document.getElementById('authForgotPassword');
  const googleBtn = document.getElementById('authGoogle');

  if (nameRow) nameRow.style.display = mode === 'login' ? 'none' : 'block';
  if (emailInput) emailInput.style.display = 'block';
  if (emailLabel) emailLabel.style.display = 'block';
  if (passwordInput) passwordInput.style.display = 'block';
  if (passwordLabel) passwordLabel.style.display = 'block';
  if (businessNameLabel) businessNameLabel.style.display = mode === 'register' ? 'block' : 'none';
  if (businessNameInput) businessNameInput.style.display = mode === 'register' ? 'block' : 'none';
  if (categoryLabel) categoryLabel.style.display = mode === 'register' ? 'block' : 'none';
  if (categoryInput) categoryInput.style.display = mode === 'register' ? 'block' : 'none';
  if (whatsappLabel) whatsappLabel.style.display = mode === 'register' ? 'block' : 'none';
  if (whatsappInput) whatsappInput.style.display = mode === 'register' ? 'block' : 'none';
  if (websiteLabel) websiteLabel.style.display = mode === 'register' ? 'block' : 'none';
  if (websiteInput) websiteInput.style.display = mode === 'register' ? 'block' : 'none';
  if (businessRegLabel) businessRegLabel.style.display = mode === 'register' ? 'block' : 'none';
  if (businessRegInput) businessRegInput.style.display = mode === 'register' ? 'block' : 'none';
  if (addressLabel) addressLabel.style.display = mode === 'register' ? 'block' : 'none';
  if (addressInput) addressInput.style.display = mode === 'register' ? 'block' : 'none';
  if (gstLabel) gstLabel.style.display = mode === 'login' ? 'none' : 'block';
  if (gstInput) gstInput.style.display = mode === 'login' ? 'none' : 'block';
  if (gstHint) gstHint.style.display = mode === 'register' ? 'block' : 'none';
  if (otpRow) otpRow.style.display = 'none';
  if (sendOtpBtn) sendOtpBtn.style.display = mode === 'login' ? 'inline-flex' : 'none';
  if (loginOtpBtn) loginOtpBtn.style.display = mode === 'login' ? 'inline-flex' : 'none';
  if (submit) submit.style.display = 'inline-flex';
  if (forgotPasswordBtn) forgotPasswordBtn.style.display = mode === 'login' ? 'inline-flex' : 'none';
  if (forgotPasswordBtn) {
    forgotPasswordBtn.onclick = async () => {
      const email = String(document.getElementById('authEmail')?.value || '').trim();
      if (!email) {
        alert('Enter your email to reset password.');
        return;
      }
      if (!auth) {
        alert('Password reset is unavailable right now.');
        return;
      }
      try {
        await auth.sendPasswordResetEmail(email);
        alert('Password reset link sent to your email.');
      } catch (error) {
        alert(getFriendlyFirebaseAuthError(error, 'Unable to send password reset email.'));
      }
    };
  }
  if (sendOtpBtn) sendOtpBtn.textContent = mode === 'login' ? 'Send OTP' : 'Send OTP to Register';
  if (loginOtpBtn) loginOtpBtn.textContent = mode === 'login' ? 'Login with OTP' : 'Verify OTP';
  if (googleBtn) googleBtn.textContent = mode === 'login' ? 'Continue with Google' : 'Register with Google';
  updateAuthDrawerBehavior();
}

function closeAuthDrawer() {
  let drawer = document.getElementById('authDrawer');
  if (!drawer) return;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  const otpRow = document.getElementById('authOtpRow');
  if (otpRow) otpRow.style.display = 'none';
  const otpInput = document.getElementById('authOtp');
  if (otpInput) otpInput.value = '';
}

async function sendPhoneOtp(phone, context = null, internalAttempt = 1) {
  if (window.location.protocol === 'file:') {
    alert('Phone OTP is unavailable in local file preview. Open the app via localhost or Firebase Hosting to continue.');
    return;
  }

  if (!auth || !window.firebase?.auth) {
    alert('Login is temporarily unavailable. Please try again after Firebase configuration is enabled.');
    return;
  }

  if (isPhoneOtpSending) {
    alert('OTP request is already in progress. Please wait.');
    return;
  }

  const normalizedPhone = normalizeIndianPhone(phone);
  if (!normalizedPhone) {
    alert('Please enter a valid 10-digit phone number.');
    return;
  }

  if (Date.now() < otpSendCooldownUntil) {
    const seconds = Math.ceil((otpSendCooldownUntil - Date.now()) / 1000);
    alert(`Please wait ${seconds}s before requesting another OTP.`);
    return;
  }

  const appVerifier = await getRecaptchaVerifier();
  if (!appVerifier) {
    alert('Phone login setup is unavailable right now. Please refresh and try again.');
    return;
  }

  try {
    isPhoneOtpSending = true;
    setAuthActionButtonsBusy('phone', true);
    pendingPhoneAuthContext = context;

    let sendError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        confirmationResult = await auth.signInWithPhoneNumber(`+91${normalizedPhone}`, appVerifier);
        sendError = null;
        break;
      } catch (error) {
        sendError = error;
        const code = String(error?.code || '');
        const retryable = code === 'auth/network-request-failed' || code === 'auth/timeout';
        if (!retryable || attempt === 3) break;
        await wait(attempt * 600);
      }
    }

    if (sendError) throw sendError;

    otpSendCooldownUntil = Date.now() + 15000;
    document.getElementById('authOtpRow').style.display = 'flex';
    alert(context?.mode === 'register'
      ? 'OTP sent to your phone. Enter the code to finish registration.'
      : 'OTP sent to your phone. Enter the code to complete login.');
  } catch (error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    if ((code === 'auth/internal-error' || message.includes('auth/internal-error')) && internalAttempt < 2) {
      resetRecaptchaVerifier();
      await wait(800);
      return sendPhoneOtp(normalizedPhone, context, internalAttempt + 1);
    }
    if (message.includes('auth/internal-error') || message.includes('auth/operation-not-supported-in-this-environment')) {
      alert('Phone OTP hit a temporary verification issue. Please refresh and try again.');
      return;
    }
    if (code === 'auth/too-many-requests') {
      alert('Too many OTP requests. Please wait a few minutes and try again.');
      return;
    }
    console.warn('Phone OTP send error', error);
    alert(getFriendlyFirebaseAuthError(error, 'Unable to send OTP.'));
  } finally {
    isPhoneOtpSending = false;
    setAuthActionButtonsBusy('phone', false);
  }
}

async function verifyPhoneOtp(otp) {
  if (!confirmationResult) return alert('Please request an OTP first.');

  if (isPhoneOtpVerifying) {
    alert('OTP verification is already in progress. Please wait.');
    return;
  }

  if (!/^\d{6}$/.test(String(otp || '').trim())) {
    alert('Please enter a valid 6-digit OTP.');
    return;
  }

  try {
    isPhoneOtpVerifying = true;
    setAuthActionButtonsBusy('phone', true);
    const result = await confirmationResult.confirm(otp);
    const user = result.user;
    if (!user) throw new Error('OTP verification failed.');
    const pendingContext = pendingPhoneAuthContext || { mode: 'login', role: 'buyer', gstNumber: '', name: '' };

    if (pendingContext.mode === 'register' && pendingContext.name && user.updateProfile) {
      await user.updateProfile({ displayName: pendingContext.name });
    }

    await exchangeFirebaseTokenForBackendSession(user, 'auth_login_firebase');

    const profile = await ensureUserProfile(
      user,
      pendingContext.mode === 'register' ? pendingContext.role : null,
      pendingContext.gstNumber || '',
      {
        createIfMissing: true,
        extra: {
          mobileNumber: pendingContext.mobileNumber || pendingContext.phone || '',
          whatsappNumber: pendingContext.whatsappNumber || '',
          businessName: pendingContext.businessName || '',
          category: pendingContext.category || '',
          website: pendingContext.website || '',
          businessRegistrationNumber: pendingContext.businessRegistrationNumber || '',
          address: pendingContext.address || '',
        },
      },
    );
    currentUserProfile = profile;
    localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(profile));
    fillProfile();
    closeAuthDrawer();
    pendingPhoneAuthContext = null;
    confirmationResult = null;
    alert(pendingContext.mode === 'register' ? 'Registered with phone successfully.' : 'Logged in successfully.');
    routeSignedInUser(profile);
    await maybeLaunchProfileWizard(profile, user);
  } catch (error) {
    const code = String(error?.code || '');
    if (code === 'auth/invalid-verification-code' || code === 'auth/code-expired') {
      alert('OTP is invalid or expired. Please request a new OTP.');
      return;
    }
    console.error('OTP verification error', error);
    alert(getFriendlyFirebaseAuthError(error, 'OTP verification failed.'));
  } finally {
    isPhoneOtpVerifying = false;
    setAuthActionButtonsBusy('phone', false);
  }
}

function validateGSTIN(gstin) {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase());
}

async function handleAuthSubmit(mode, action = 'register') {
  const name = document.getElementById('authName').value.trim();
  const phone = document.getElementById('authPhone').value.trim();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const role = document.getElementById('authRole').value;
  const gstNumber = document.getElementById('authGst').value.trim();
  const whatsappNumber = String(document.getElementById('authWhatsapp')?.value || '').trim();
  const businessName = String(document.getElementById('authBusinessName')?.value || '').trim();
  const category = String(document.getElementById('authCategory')?.value || '').trim();
  const website = String(document.getElementById('authWebsite')?.value || '').trim();
  const businessRegistrationNumber = String(document.getElementById('authBusinessReg')?.value || '').trim();
  const address = String(document.getElementById('authAddress')?.value || '').trim();
  const otp = document.getElementById('authOtp')?.value.trim();

  const profileExtra = {
    mobileNumber: phone,
    whatsappNumber,
    businessName,
    category,
    website,
    businessRegistrationNumber,
    address,
  };

  if (isAuthSubmitting) {
    alert('Authentication is already in progress. Please wait.');
    return;
  }

  try {
    isAuthSubmitting = true;

    if (mode === 'login') {
      if (action === 'passwordLogin') {
        if (!email || !password) return alert('Please provide email and password to login.');
        if (!auth || !window.firebase?.auth) {
          return alert('Login is temporarily unavailable. Please try again later.');
        }

        const result = await auth.signInWithEmailAndPassword(email, password);
        await finalizeAuthenticatedUser(result.user, { mode: 'login', profileExtra });
        return;
      }

      if (!phone) return alert('Phone number is required for OTP login.');
      if (!normalizeIndianPhone(phone)) return alert('Please enter a valid 10-digit phone number.');

      if (action === 'sendOtp') {
        await sendPhoneOtp(phone);
        return;
      }
      if (!otp) return alert('Enter the OTP and click Login.');
      await verifyPhoneOtp(otp);
      return;
    }

    if (mode === 'register') {
      if (role === 'seller' && gstNumber && !validateGSTIN(gstNumber)) return alert('Please enter a valid GSTIN.');
      if (role === 'seller' && !whatsappNumber) return alert('WhatsApp Number is mandatory for seller accounts.');
      if (role === 'seller' && !businessName) return alert('Business Name is required for seller registration.');
      if (role === 'seller' && !category) return alert('Category is required for seller registration.');
      if (!auth || !window.firebase?.auth) {
        return alert('Registration is temporarily unavailable. Please try again after Firebase authentication is ready.');
      }

      if (action === 'sendOtp') {
        if (!phone) return alert('Phone number is required.');
        if (!normalizeIndianPhone(phone)) return alert('Please enter a valid 10-digit phone number.');
        await sendPhoneOtp(phone, { mode, role, gstNumber, name, ...profileExtra });
        const loginOtpBtn = document.getElementById('authLoginOtp');
        const otpRow = document.getElementById('authOtpRow');
        if (otpRow) otpRow.style.display = 'flex';
        if (loginOtpBtn) loginOtpBtn.style.display = 'inline-flex';
        return;
      }

      if (action === 'login') {
        if (!phone) return alert('Phone number is required.');
        if (!normalizeIndianPhone(phone)) return alert('Please enter a valid 10-digit phone number.');
        if (!name) return alert('Please enter your name to register with phone.');
        if (!otp) return alert('Enter the OTP and click Verify OTP.');
        await verifyPhoneOtp(otp);
        return;
      }

      if (!email || !password) return alert('Please provide email and password for registration.');
      const result = await auth.createUserWithEmailAndPassword(email, password);
      await finalizeAuthenticatedUser(result.user, {
        mode: 'register',
        roleOverride: role,
        gstNumber,
        name,
        profileExtra,
      });
      return;
    }
  } catch (error) {
    console.error('Auth submit error', error);
    alert(getFriendlyFirebaseAuthError(error, 'Authentication failed.'));
  } finally {
    isAuthSubmitting = false;
  }
}

function updateAuthDrawerBehavior() {
  const roleSelect = document.getElementById('authRole');
  const gstLabel = document.getElementById('authGstLabel');
  const gstInput = document.getElementById('authGst');
  const gstHint = document.getElementById('authGstHint');
  const phoneLabel = document.getElementById('authPhoneLabel');
  const phoneInput = document.getElementById('authPhone');
  const businessNameLabel = document.getElementById('authBusinessNameLabel');
  const businessNameInput = document.getElementById('authBusinessName');
  const categoryLabel = document.getElementById('authCategoryLabel');
  const categoryInput = document.getElementById('authCategory');
  const whatsappLabel = document.getElementById('authWhatsappLabel');
  const whatsappInput = document.getElementById('authWhatsapp');
  const otpRow = document.getElementById('authOtpRow');
  const otpInput = document.getElementById('authOtp');
  const sendOtpBtn = document.getElementById('authSendOtp');
  const loginOtpBtn = document.getElementById('authLoginOtp');
  if (!roleSelect || !gstLabel || !gstInput || !phoneLabel || !phoneInput) return;
  const update = () => {
    const mode = authMode || 'login';
    const showGst = mode !== 'login';
    const isSeller = roleSelect.value === 'seller';
    gstLabel.style.display = showGst ? 'block' : 'none';
    gstInput.style.display = showGst ? 'block' : 'none';
    if (gstHint) gstHint.style.display = showGst ? 'block' : 'none';
    if (businessNameLabel) businessNameLabel.style.display = mode === 'register' ? 'block' : 'none';
    if (businessNameInput) businessNameInput.style.display = mode === 'register' ? 'block' : 'none';
    if (categoryLabel) categoryLabel.style.display = mode === 'register' ? 'block' : 'none';
    if (categoryInput) categoryInput.style.display = mode === 'register' ? 'block' : 'none';
    if (whatsappLabel) whatsappLabel.style.display = mode === 'register' ? 'block' : 'none';
    if (whatsappInput) {
      whatsappInput.style.display = mode === 'register' ? 'block' : 'none';
      whatsappInput.placeholder = isSeller ? 'Mandatory for sellers' : 'Optional for buyers';
    }
    if (sendOtpBtn) sendOtpBtn.style.display = 'inline-flex';
    if (loginOtpBtn) loginOtpBtn.style.display = mode === 'login' ? 'inline-flex' : 'none';
    gstLabel.textContent = roleSelect.value === 'seller'
      ? 'GST Number (Optional)'
      : 'GST Number (Optional)';
    gstLabel.style.opacity = showGst ? '1' : '0.6';
    if (sendOtpBtn) sendOtpBtn.textContent = mode === 'login' ? 'Send OTP' : 'Send OTP to Register';
    if (loginOtpBtn) loginOtpBtn.textContent = mode === 'login' ? 'Login with OTP' : 'Verify OTP';
  };
  roleSelect.addEventListener('change', update);
  if (otpInput && loginOtpBtn) {
    otpInput.addEventListener('input', () => {
      loginOtpBtn.style.display = otpInput.value.trim() ? 'inline-flex' : ((authMode || 'login') === 'login' ? 'inline-flex' : 'none');
    });
  }
  update();

  if (otpRow && otpInput) {
    otpRow.style.display = 'none';
  }
}

async function initializeMarketplaceApp() {
  setupGa4();
  trackGaEvent('page_view', { page_name: 'home' });
  trackGaEvent('device_type', { device_type: getDeviceType() });
  trackGaEvent('traffic_source', { traffic_source: document.referrer || 'direct' });
  if (localStorage.getItem('mp_user')) {
    trackGaEvent('returning_user', { returning: true });
  }

  // Hydrate persisted user state for clients that have mp_user but no Firebase session.
  // This supports offline users, Playwright tests, and faster UI rendering without auth.
  function initializePersistedUser() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEYS.user) || localStorage.getItem('mp_user');
      if (!raw) return null;
      const profile = JSON.parse(raw);
      if (!profile || typeof profile !== 'object') return null;
      currentUserProfile = profile;
      // Ensure UI reflects persisted profile immediately.
      try { fillProfile(); } catch (e) { /* best-effort */ }
      try { renderCompletionPanels(profile); } catch (e) { /* best-effort */ }
      // Restore analytics-related state if present
      try {
        if (profile.favoriteProductIds) state.favoriteProductIds = profile.favoriteProductIds;
        if (profile.favoriteBusinessNames) state.favoriteBusinessNames = profile.favoriteBusinessNames;
      } catch (e) {}
      return profile;
    } catch (e) {
      return null;
    }
  }

  // First hydrate any persisted local profile to support offline and test flows.
  initializePersistedUser();
  await loadFirebasePublicConfig();
  initFirebaseAuth();
  const googleBtn = document.getElementById('authGoogle');
  if (googleBtn) googleBtn.addEventListener('click', signInWithGoogle);
  updateAuthDrawerBehavior();

  // Bottom navigation handlers (mobile-first)
  try {
    const bottomHome = document.getElementById('bottomHomeBtn');
    const bottomSearch = document.getElementById('bottomSearchBtn');
    const bottomWishlist = document.getElementById('bottomWishlistBtn');
    const bottomProfile = document.getElementById('bottomProfileBtn');
    const bottomLogout = document.getElementById('bottomLogoutBtn');

    if (bottomHome) bottomHome.addEventListener('click', () => {
      history.pushState({ type: 'home' }, '', '/');
      showView('homeView');
      showBuyerTab('home');
    });
    if (bottomSearch) bottomSearch.addEventListener('click', () => {
      showView('homeView');
      showBuyerTab('explore');
      const search = document.getElementById('globalSearch');
      if (search) { search.focus(); }
    });
    if (bottomWishlist) bottomWishlist.addEventListener('click', () => {
      showView('homeView');
      showBuyerTab('favorites');
    });
    if (bottomProfile) bottomProfile.addEventListener('click', () => {
      history.pushState({ type: 'profile' }, '', '/buyer/profile');
      showView('homeView');
      showBuyerTab('profile');
    });
    if (bottomLogout) bottomLogout.addEventListener('click', () => {
      signOutCurrentUser();
    });
  } catch (e) {
    // best-effort: ignore if elements missing
  }

  const privacy = JSON.parse(localStorage.getItem('mp_privacy_settings') || '{}');
  if (elements.privacyAnalyticsToggle) elements.privacyAnalyticsToggle.checked = privacy.analytics !== false;
  if (elements.privacyPersonalizationToggle) elements.privacyPersonalizationToggle.checked = privacy.personalization !== false;
  if (elements.privacyLocationToggle) elements.privacyLocationToggle.checked = privacy.location !== false;

  if (auth && firebase?.auth && !window.recaptchaVerifier) {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptchaContainer', {
      size: 'invisible',
      callback: () => {},
    });
  }
  // Wait for Firebase `db` to be available before initializing data.
  function startAppWhenReady(attempts = 0) {
    if (db) {
      initializeAppData().catch((err) => console.warn('initializeAppData error', err));
      try {
        bootstrap();
      } catch (err) {
        console.warn('bootstrap error', err);
      }
      return;
    }
    if (attempts > 10) {
      console.warn('Firebase did not initialize; bootstrapping UI without Firestore.');
      try {
        bootstrap();
      } catch (err) {
        console.warn('bootstrap error', err);
      }
      return;
    }
    setTimeout(() => startAppWhenReady(attempts + 1), 500);
  }
  startAppWhenReady();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMarketplaceApp);
} else {
  initializeMarketplaceApp();
}

// Small modal implementation for product details
function openProductModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.innerHTML = `
    <div class="modal-card">
      <button class="modal-close">×</button>
      <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">
        <img src="${product.image}" alt="${product.name}" style="width:280px;height:200px;object-fit:cover;border-radius:12px;" />
        <div style="flex:1;min-width:320px;">
          <h2>${product.name}</h2>
          <p style="color:var(--muted);">${product.description}</p>
          <div class="productMetaRow" style="margin-top:8px;">
            <span class="badge badgeVerified">${product.verified ? 'Verified business' : 'Trusted business'}</span>
            <span class="badge badgeSoft">${product.responseTime || 'Responds in 2 hours'}</span>
            <span class="badge badgeSoft">${product.location || 'India'}</span>
          </div>
          <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
            <button class="button actionPrimary" id="pmContact">Contact Dealer</button>
            <button class="button actionSecondary" id="pmWhatsapp">WhatsApp Dealer</button>
            <button class="button actionSecondary" id="pmSave">Save Product</button>
            <button class="button actionSecondary" id="pmShare">Share</button>
          </div>
          <div style="margin-top:14px;color:var(--muted);">
            <div><strong>Price:</strong> ${formatPrice(product.price)}</div>
            <div><strong>Seller:</strong> ${product.seller}</div>
            <div><strong>Location:</strong> ${product.location}</div>
            <div><strong>Business age:</strong> ${product.businessAge || '5+ years'}</div>
            <div><strong>Rating:</strong> ${product.rating} ★</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });

  overlay.querySelector('#pmWhatsapp').addEventListener('click', async () => {
    trackGaEvent('whatsapp_click', {
      source: 'product_modal',
      product_id: product.id,
    });
    await trackWhatsappClick(product);
    const text = encodeURIComponent(`Hello, I found your product "${product.name}" on marketplace-store-fef91.web.app and would like more information.`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  });

  overlay.querySelector('#pmContact').addEventListener('click', () => {
    trackGaEvent('contact_seller', {
      source: 'call_button',
      product_id: product.id,
    });
    alert('Call Seller: feature will display seller phone when available.');
  });

  overlay.querySelector('#pmSave').addEventListener('click', () => {
    if (!state.favoriteProductIds.includes(product.id)) {
      state.favoriteProductIds.push(product.id);
      localStorage.setItem('mp_favorite_products', JSON.stringify(state.favoriteProductIds));
      trackGaEvent('favorite_product', { product_id: product.id });
    }
    renderFavoritesView();
    alert('Product saved to favorites.');
  });

  overlay.querySelector('#pmShare').addEventListener('click', async () => {
    const text = `${product.name} on marketplace-store-fef91.web.app`;
    const shareData = { title: product.name, text, url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Ignore cancellation.
      }
      return;
    }
    const copied = await safeClipboardWrite(window.location.href);
    if (copied) {
      alert('Product link copied to clipboard.');
    } else {
      alert('Clipboard permission not available. Please copy from the address bar.');
    }
  });
}
