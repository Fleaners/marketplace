const statusEl = document.getElementById('status');
const dataEl = document.getElementById('data');
const authStatusEl = document.getElementById('authStatus');
const uploadStatusEl = document.getElementById('uploadStatus');
const loginForm = document.getElementById('loginForm');
const otpForm = document.getElementById('otpForm');
const registerForm = document.getElementById('registerForm');
const uploadForm = document.getElementById('uploadForm');
const globalSearch = document.getElementById('globalSearch');
const profileAvatarEl = document.getElementById('profileAvatar');
const profileNameEl = document.getElementById('profileName');
const profileMetaEl = document.getElementById('profileMeta');
const myUploadsEl = document.getElementById('myUploads');
const exploreTab = document.getElementById('exploreTab');
const myUploadsTab = document.getElementById('myUploadsTab');

const params = new URLSearchParams(window.location.search);
const storedApi = localStorage.getItem('API_URL');
const queryApi = params.get('api');
const PERMANENT_API_URL = 'https://marketplacestore-production.up.railway.app';
const API_URL = queryApi || storedApi || PERMANENT_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '') || '';

if (queryApi) localStorage.setItem('API_URL', queryApi);
if (!queryApi && !storedApi && PERMANENT_API_URL) localStorage.setItem('API_URL', PERMANENT_API_URL);

let authToken = localStorage.getItem('AUTH_TOKEN') || '';
let productsCache = [];
let myUploadsCache = [];
let currentBusiness = null;
let pendingOtpPhone = '';

const fallbackData = [
  { name: 'Brake Pad Premium Set', description: 'High-demand listing, backend fallback mode.' },
  { name: 'Engine Oil 5W-30', description: 'Fast-moving SKU for workshops and dealers.' },
  { name: 'Alloy Wheel Hub', description: 'Explore supplier connections through this feed.' },
];

function setAuthStatus(message) {
  authStatusEl.textContent = message;
}

function getInitials(name) {
  const parts = (name || 'DealerConnect').trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'DC';
}

function updateIdentityCard() {
  if (!currentBusiness) {
    profileAvatarEl.textContent = 'DC';
    profileNameEl.textContent = 'DealerConnect Guest';
    profileMetaEl.textContent = 'Sign in to show company profile';
    return;
  }

  profileAvatarEl.textContent = getInitials(currentBusiness.shop_name);
  profileNameEl.textContent = currentBusiness.shop_name || 'Dealer Profile';
  const details = [currentBusiness.city || 'Unknown city', currentBusiness.gst_number || 'GST not provided'];
  profileMetaEl.textContent = details.join(' • ');
}

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

function hydrateBusinessFromToken() {
  if (!authToken) return;
  const payload = decodeJwtPayload(authToken);
  if (!payload) return;
  currentBusiness = {
    id: payload.id,
    shop_name: payload.shop_name,
    phone: payload.phone,
    gst_number: payload.gst_number,
    city: payload.city,
  };
}

function renderProducts(items) {
  const list = (items || []).map((product, index) => {
    const name = product.name || product.title || 'Untitled Listing';
    const description = product.description || 'Professional listing from your dealer network.';
    const image = product.image_url ? `<img class="feedImage" src="${product.image_url}" alt="${name}" />` : '';
    const price = product.price ? `₹${product.price}` : 'Price on request';
    return `
      <article class="feedCard">
        <div class="feedHead">
          <span>Supplier Spotlight</span>
          <span>#${index + 1}</span>
        </div>
        <div class="feedTitle">${name}</div>
        ${image}
        <p class="feedMeta">${description}</p>
        <p class="feedMeta">${price}</p>
      </article>
    `;
  });

  dataEl.innerHTML = list.join('');
}

function renderMyUploads(items) {
  if (!items || !items.length) {
    myUploadsEl.innerHTML = '<article class="feedCard"><p class="feedMeta">No uploads yet. Add your first product from the Upload Product Data panel.</p></article>';
    return;
  }

  const list = items.map((product) => {
    const name = product.name || 'Untitled Listing';
    const description = product.description || 'No description provided.';
    const image = product.image_url ? `<img class="feedImage" src="${product.image_url}" alt="${name}" />` : '';
    return `
      <article class="feedCard" data-product-id="${product.id}">
        <div class="feedHead">
          <span>My Listing</span>
          <span>ID ${product.id}</span>
        </div>
        <div class="feedTitle">${name}</div>
        ${image}
        <p class="feedMeta">${description}</p>
        <p class="feedMeta">Price: ₹${product.price || 0} • Cost: ₹${product.cost_price || 0} • Stock: ${product.stock || 0}</p>
        <div class="cardActions">
          <button class="actionSecondary" data-action="edit" type="button">Edit</button>
          <button class="actionDanger" data-action="delete" type="button">Delete</button>
        </div>
      </article>
    `;
  });

  myUploadsEl.innerHTML = list.join('');
}

function setActiveTab(tab) {
  const showUploads = tab === 'uploads';
  exploreTab.classList.toggle('tabActive', !showUploads);
  myUploadsTab.classList.toggle('tabActive', showUploads);
  dataEl.classList.toggle('hidden', showUploads);
  myUploadsEl.classList.toggle('hidden', !showUploads);
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

async function fetchMyUploads() {
  if (!currentBusiness || !currentBusiness.id) {
    myUploadsCache = [];
    renderMyUploads(myUploadsCache);
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/products?business_id=${currentBusiness.id}`, {
      cache: 'no-store',
      mode: 'cors',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!response.ok) throw new Error('Failed to fetch my uploads');
    myUploadsCache = await response.json();
  } catch (error) {
    myUploadsCache = [];
  }

  renderMyUploads(myUploadsCache);
}

async function handleLogin(event) {
  event.preventDefault();
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPassword').value;
  const channel = document.getElementById('loginChannel').value;
  const email = document.getElementById('loginEmail').value.trim();

  if (channel === 'email' && !email) {
    setAuthStatus('Email is required when OTP channel is email.');
    return;
  }

  try {
    const payload = { phone, password, channel };
    if (email) payload.email = email;
    const result = await requestAuth('/api/auth/login/request-otp', payload);
    pendingOtpPhone = phone;
    otpForm.classList.remove('hidden');
    setAuthStatus(result.otp ? `OTP sent. Debug OTP: ${result.otp}` : 'OTP sent. Enter it to continue login.');
  } catch (error) {
    setAuthStatus(`Login failed: ${error.message}`);
  }
}

async function handleOtpVerify(event) {
  event.preventDefault();
  const otp = document.getElementById('loginOtp').value.trim();

  if (!pendingOtpPhone) {
    setAuthStatus('Request OTP first.');
    return;
  }

  try {
    const result = await requestAuth('/api/auth/login/verify-otp', { phone: pendingOtpPhone, otp });
    authToken = result.token;
    currentBusiness = result.business;
    localStorage.setItem('AUTH_TOKEN', authToken);
    setAuthStatus(`Logged in as ${result.business.shop_name}`);
    otpForm.classList.add('hidden');
    otpForm.reset();
    pendingOtpPhone = '';
    updateIdentityCard();
    await fetchMyUploads();
  } catch (error) {
    setAuthStatus(`OTP verification failed: ${error.message}`);
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
    setAuthStatus(`Registered and logged in as ${result.business.shop_name}`);
    updateIdentityCard();
    await fetchMyUploads();
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
    await fetchMyUploads();
  } catch (error) {
    uploadStatusEl.textContent = `Upload failed: ${error.message}`;
  }
}

async function handleMyUploadAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  if (!authToken) {
    uploadStatusEl.textContent = 'Please login before managing uploads.';
    return;
  }

  const card = button.closest('[data-product-id]');
  const productId = card ? card.getAttribute('data-product-id') : null;
  if (!productId) return;

  const product = myUploadsCache.find((item) => String(item.id) === String(productId));
  if (!product) return;

  const action = button.getAttribute('data-action');

  if (action === 'delete') {
    try {
      const response = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'DELETE',
        mode: 'cors',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Delete failed');
      uploadStatusEl.textContent = `Deleted product #${productId}`;
      await fetchProducts();
      await fetchMyUploads();
    } catch (error) {
      uploadStatusEl.textContent = `Delete failed: ${error.message}`;
    }
    return;
  }

  if (action === 'edit') {
    const nextName = prompt('Product name', product.name || '');
    if (nextName === null) return;
    const nextPrice = prompt('Selling price', product.price || '');
    if (nextPrice === null) return;
    const nextCostPrice = prompt('Cost price', product.cost_price || '');
    if (nextCostPrice === null) return;
    const nextStock = prompt('Stock', product.stock || '0');
    if (nextStock === null) return;

    const body = new FormData();
    body.append('name', nextName.trim());
    body.append('price', nextPrice.trim());
    body.append('cost_price', nextCostPrice.trim());
    body.append('stock', nextStock.trim());

    try {
      const response = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'PUT',
        mode: 'cors',
        headers: { Authorization: `Bearer ${authToken}` },
        body,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Update failed');
      uploadStatusEl.textContent = `Updated product #${productId}`;
      await fetchProducts();
      await fetchMyUploads();
    } catch (error) {
      uploadStatusEl.textContent = `Update failed: ${error.message}`;
    }
  }
}

loginForm.addEventListener('submit', handleLogin);
otpForm.addEventListener('submit', handleOtpVerify);
registerForm.addEventListener('submit', handleRegister);
uploadForm.addEventListener('submit', handleUpload);
myUploadsEl.addEventListener('click', handleMyUploadAction);
globalSearch.addEventListener('input', (event) => filterProducts(event.target.value));
exploreTab.addEventListener('click', () => setActiveTab('explore'));
myUploadsTab.addEventListener('click', () => setActiveTab('uploads'));

hydrateBusinessFromToken();
updateIdentityCard();

if (authToken) setAuthStatus('Session restored. Ready to upload and explore.');

checkBackend();
fetchProducts();
fetchMyUploads();
