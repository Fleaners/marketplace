const statusEl = document.getElementById('status');
const dataEl = document.getElementById('data');
const authStatusEl = document.getElementById('authStatus');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Detect API endpoint: use query param, localStorage, or defaults
const params = new URLSearchParams(window.location.search);
const storedApi = localStorage.getItem('API_URL');
const queryApi = params.get('api');
const PERMANENT_API_URL = 'https://marketplacestore-production.up.railway.app';
const API_URL = queryApi || storedApi || PERMANENT_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '') || '';
let authToken = localStorage.getItem('AUTH_TOKEN') || '';
let currentBusiness = null;

if (queryApi) localStorage.setItem('API_URL', queryApi);
if (!queryApi && !storedApi && PERMANENT_API_URL) localStorage.setItem('API_URL', PERMANENT_API_URL);

const fallbackData = {
  status: { message: 'Marketplace online demo (backend offline)' },
  products: [
    { name: 'Demo Product 1', description: 'This is a sample item when the backend is unavailable.' },
    { name: 'Demo Product 2', description: 'Host the static site to keep the UI available online.' },
    { name: 'Demo Product 3', description: 'Connect to a backend service later for live data.' }
  ]
};

function showFallback() {
  statusEl.textContent = JSON.stringify(fallbackData.status);
  dataEl.innerHTML = '<h2>Products</h2>' + fallbackData.products.map(p=>`<div class="product"><strong>${p.name}</strong><div>${p.description}</div></div>`).join('');
}

function setAuthStatus(message) {
  authStatusEl.textContent = message;
}

async function requestAuth(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || 'Authentication request failed');
  }
  return json;
}

async function handleLogin(event) {
  event.preventDefault();
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const result = await requestAuth('/api/auth/login', { phone, password });
    authToken = result.token;
    currentBusiness = result.business;
    localStorage.setItem('AUTH_TOKEN', authToken);
    setAuthStatus(`Logged in as ${currentBusiness.shop_name} (${currentBusiness.phone})`);
  } catch (error) {
    setAuthStatus(`Login failed: ${error.message}`);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const payload = {
    shop_name: document.getElementById('registerShopName').value.trim(),
    phone: document.getElementById('registerPhone').value.trim(),
    gst_number: document.getElementById('registerGst').value.trim(),
    city: document.getElementById('registerCity').value.trim(),
    password: document.getElementById('registerPassword').value,
  };

  try {
    const result = await requestAuth('/api/auth/register', payload);
    authToken = result.token;
    currentBusiness = result.business;
    localStorage.setItem('AUTH_TOKEN', authToken);
    setAuthStatus(`Account created and logged in: ${currentBusiness.shop_name}`);
  } catch (error) {
    setAuthStatus(`Registration failed: ${error.message}`);
  }
}

async function checkBackend() {
  try {
    const endpoint = API_URL ? `${API_URL}/api/status` : '/api/status';
    const res = await fetch(endpoint, { cache: 'no-store', mode: API_URL ? 'cors' : 'same-origin' });
    const json = await res.json();
    statusEl.textContent = JSON.stringify(json);
  } catch (e) {
    statusEl.textContent = 'Backend unreachable — showing demo content';
    showFallback();
  }
}

async function fetchProducts() {
  try {
    const endpoint = API_URL ? `${API_URL}/api/products` : '/api/products';
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    const res = await fetch(endpoint, { cache: 'no-store', mode: API_URL ? 'cors' : 'same-origin', headers });
    if (!res.ok) { showFallback(); return; }
    const items = await res.json();
    if (!items || !items.length) { showFallback(); return; }
    dataEl.innerHTML = '<h2>Products</h2>' + items.map(p=>`<div class="product"><strong>${p.name||p.title||'Item'}</strong><div>${p.description||''}</div></div>`).join('');
  } catch(e) {
    showFallback();
  }
}

loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);

if (authToken) {
  setAuthStatus('Session token found. You can continue exploring.');
}

checkBackend();
fetchProducts();
