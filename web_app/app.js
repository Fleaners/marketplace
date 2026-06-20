const statusEl = document.getElementById('status');
const dataEl = document.getElementById('data');
const authStatusEl = document.getElementById('authStatus');
const uploadStatusEl = document.getElementById('uploadStatus');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const uploadForm = document.getElementById('uploadForm');
const globalSearch = document.getElementById('globalSearch');

const params = new URLSearchParams(window.location.search);
const storedApi = localStorage.getItem('API_URL');
const queryApi = params.get('api');
const PERMANENT_API_URL = 'https://marketplacestore-production.up.railway.app';
const API_URL = queryApi || storedApi || PERMANENT_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '') || '';

if (queryApi) localStorage.setItem('API_URL', queryApi);
if (!queryApi && !storedApi && PERMANENT_API_URL) localStorage.setItem('API_URL', PERMANENT_API_URL);

let authToken = localStorage.getItem('AUTH_TOKEN') || '';
let productsCache = [];

const fallbackData = [
  { name: 'Brake Pad Premium Set', description: 'High-demand listing, backend fallback mode.' },
  { name: 'Engine Oil 5W-30', description: 'Fast-moving SKU for workshops and dealers.' },
  { name: 'Alloy Wheel Hub', description: 'Explore supplier connections through this feed.' },
];

function setAuthStatus(message) {
  authStatusEl.textContent = message;
}

function renderProducts(items) {
  const list = (items || []).map((product, index) => {
    const name = product.name || product.title || 'Untitled Listing';
    const description = product.description || 'Professional listing from your dealer network.';
    return `
      <article class="feedCard">
        <div class="feedHead">
          <span>Supplier Spotlight</span>
          <span>#${index + 1}</span>
        </div>
        <div class="feedTitle">${name}</div>
        <p class="feedMeta">${description}</p>
      </article>
    `;
  });

  dataEl.innerHTML = list.join('');
}

function filterProducts(query) {
  if (!query.trim()) {
    renderProducts(productsCache);
    return;
  }
  const q = query.toLowerCase();
  const filtered = productsCache.filter((item) => (item.name || '').toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q));
  renderProducts(filtered);
}

async function requestAuth(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Authentication failed');
  return json;
}

async function checkBackend() {
  try {
    const response = await fetch(`${API_URL}/api/status`, { cache: 'no-store', mode: 'cors' });
    const json = await response.json();
    statusEl.textContent = json.message || 'Backend online';
  } catch (error) {
    statusEl.textContent = 'Backend currently unreachable';
  }
}

async function fetchProducts() {
  try {
    const response = await fetch(`${API_URL}/api/products`, { cache: 'no-store', mode: 'cors' });
    if (!response.ok) throw new Error('Failed to fetch products');
    const products = await response.json();
    productsCache = products && products.length ? products : fallbackData;
  } catch (error) {
    productsCache = fallbackData;
  }

  renderProducts(productsCache);
}

async function handleLogin(event) {
  event.preventDefault();
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const result = await requestAuth('/api/auth/login', { phone, password });
    authToken = result.token;
    localStorage.setItem('AUTH_TOKEN', authToken);
    setAuthStatus(`Logged in as ${result.business.shop_name}`);
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
    localStorage.setItem('AUTH_TOKEN', authToken);
    setAuthStatus(`Registered and logged in as ${result.business.shop_name}`);
  } catch (error) {
    setAuthStatus(`Registration failed: ${error.message}`);
  }
}

async function handleUpload(event) {
  event.preventDefault();
  if (!authToken) {
    uploadStatusEl.textContent = 'Please login before uploading product data.';
    return;
  }

  const formData = new FormData();
  formData.append('name', document.getElementById('uploadName').value.trim());
  formData.append('price', document.getElementById('uploadPrice').value.trim());
  formData.append('cost_price', document.getElementById('uploadCostPrice').value.trim());
  formData.append('stock', document.getElementById('uploadStock').value.trim());

  const imageFile = document.getElementById('uploadImage').files[0];
  if (imageFile) formData.append('image', imageFile);

  try {
    const response = await fetch(`${API_URL}/api/products`, {
      method: 'POST',
      mode: 'cors',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Upload failed');

    uploadStatusEl.textContent = `Uploaded: ${json.name}`;
    uploadForm.reset();
    await fetchProducts();
  } catch (error) {
    uploadStatusEl.textContent = `Upload failed: ${error.message}`;
  }
}

loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
uploadForm.addEventListener('submit', handleUpload);
globalSearch.addEventListener('input', (event) => filterProducts(event.target.value));

if (authToken) setAuthStatus('Session restored. Ready to upload and explore.');

checkBackend();
fetchProducts();
