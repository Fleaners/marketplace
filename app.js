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
const feedCountEl = document.getElementById('feedCount');
const activeFilterLabelEl = document.getElementById('activeFilterLabel');
const subbarButtons = Array.from(document.querySelectorAll('.subbarBtn'));
const topSuppliersListEl = document.getElementById('topSuppliersList');
const trendingNowListEl = document.getElementById('trendingNowList');

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
let activeFilter = 'all';
let activeView = 'explore';

const fallbackData = [
  { name: 'Brake Pad Premium Set', description: 'High-demand listing, backend fallback mode.' },
  { name: 'Engine Oil 5W-30', description: 'Fast-moving SKU for workshops and dealers.' },
  { name: 'Alloy Wheel Hub', description: 'Explore supplier connections through this feed.' },
];

function setAuthStatus(message) {
  authStatusEl.textContent = message;
}

function updateIdentityCard() {
  profileAvatarEl.innerHTML = '<img src="assets/marketplace-store-logo.svg" alt="MarketPlace.Store profile logo" />';

  if (!currentBusiness) {
    profileNameEl.textContent = 'MarketPlace.Store Guest';
    profileMetaEl.textContent = 'Sign in to show company profile';
    return;
  }

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
  feedCountEl.textContent = String((items || []).length);
  const filterNames = {
    all: 'All items',
    trending: 'Trending parts',
    suppliers: 'Top suppliers',
    deals: 'Daily deals',
    network: 'Explore network',
  };
  activeFilterLabelEl.textContent = filterNames[activeFilter] || 'All items';

  const list = (items || []).map((product, index) => {
    const name = product.name || product.title || 'Untitled Listing';
    const description = product.description || 'Professional listing from your dealer network.';
    const image = product.image_url
      ? `<img class="feedImage" src="${product.image_url}" alt="${name}" />`
      : `<div class="feedImage feedImagePlaceholder"><span>No image preview</span></div>`;
    const price = product.price ? `₹${Number(product.price).toLocaleString('en-IN')}` : 'Price on request';
    const supplier = product.shop_name || product.business_name || 'Verified supplier';
    const city = product.city || 'Live marketplace';
    return `
      <article class="feedCard">
        ${image}
        <div class="feedCardBody">
          <div class="feedHead">
            <span>${supplier}</span>
            <span>#${index + 1}</span>
          </div>
          <div class="feedTitle">${name}</div>
          <div class="productMetaRow">
            <span class="metaBadge">${city}</span>
            <span class="metaBadge metaBadgeSoft">${supplier}</span>
          </div>
          <p class="feedMeta">${description}</p>
          <div class="priceRow">
            <strong>${price}</strong>
            <span class="muted">Instant response</span>
          </div>
          <div class="cardActions">
            <button class="actionPrimary" type="button" data-action="inquire" data-product-name="${encodeURIComponent(name)}">Contact seller</button>
            <button class="actionSecondary" type="button" data-action="details">View details</button>
          </div>
        </div>
      </article>
    `;
  });

  dataEl.innerHTML = list.length ? list.join('') : '<article class="feedCard"><p class="feedMeta">No listings match your current filter.</p></article>';
}

function renderMyUploads(items) {
  if (!items || !items.length) {
    myUploadsEl.innerHTML = '<article class="feedCard"><p class="feedMeta">No uploads yet. Add your first product from the Upload Product Data panel.</p></article>';
    return;
  }

  const list = items.map((product) => {
    const name = product.name || 'Untitled Listing';
    const description = product.description || 'No description provided.';
    const image = product.image_url
      ? `<img class="feedImage" src="${product.image_url}" alt="${name}" />`
      : `<div class="feedImage feedImagePlaceholder"><span>No image preview</span></div>`;
    return `
      <article class="feedCard" data-product-id="${product.id}">
        ${image}
        <div class="feedCardBody">
          <div class="feedHead">
            <span>My Listing</span>
            <span>ID ${product.id}</span>
          </div>
          <div class="feedTitle">${name}</div>
          <p class="feedMeta">${description}</p>
          <p class="feedMeta">Price: ₹${product.price || 0} • Cost: ₹${product.cost_price || 0} • Stock: ${product.stock || 0}</p>
          <div class="cardActions">
            <button class="actionSecondary" data-action="edit" type="button">Edit</button>
            <button class="actionDanger" data-action="delete" type="button">Delete</button>
          </div>
        </div>
      </article>
    `;
  });

  myUploadsEl.innerHTML = list.join('');
}

function inferTrendingScore(item) {
  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  const keywords = ['premium', 'top', 'fast', 'deal', 'sale', 'featured', 'hot', 'best'];
  return keywords.reduce((score, keyword, index) => score + (text.includes(keyword) ? (keywords.length - index) : 0), item.image_url ? 2 : 0);
}

function renderRail(items) {
  const source = (items || []).filter(Boolean);
  const supplierMap = new Map();

  source.forEach((item) => {
    const name = item.shop_name || item.business_name || 'Verified supplier';
    const entry = supplierMap.get(name) || { name, count: 0, city: item.city || 'Marketplace' };
    entry.count += 1;
    supplierMap.set(name, entry);
  });

  const topSuppliers = Array.from(supplierMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  const trendingItems = source.slice().sort((a, b) => inferTrendingScore(b) - inferTrendingScore(a)).slice(0, 5);

  topSuppliersListEl.innerHTML = topSuppliers.length
    ? topSuppliers.map((supplier) => `
        <button class="railItem" type="button" data-rail-query="${encodeURIComponent(supplier.name)}">
          <span class="railItemTitle">${supplier.name}</span>
          <span class="railItemMeta">${supplier.count} listings • ${supplier.city}</span>
        </button>
      `).join('')
    : '<p class="muted railEmpty">Supplier insights will appear here once listings are live.</p>';

  trendingNowListEl.innerHTML = trendingItems.length
    ? trendingItems.map((item) => `
        <button class="railItem railItemCompact" type="button" data-rail-query="${encodeURIComponent(item.name || item.title || '')}">
          <span class="railItemTitle">${item.name || item.title || 'Untitled Listing'}</span>
          <span class="railItemMeta">${item.shop_name || item.business_name || 'Marketplace seller'} • ${item.price ? `₹${Number(item.price).toLocaleString('en-IN')}` : 'Price on request'}</span>
        </button>
      `).join('')
    : '<p class="muted railEmpty">Trending items will appear here as catalog data grows.</p>';
}

function setActiveTab(tab) {
  activeView = tab;
  const showUploads = tab === 'uploads';
  exploreTab.classList.toggle('tabActive', !showUploads);
  myUploadsTab.classList.toggle('tabActive', showUploads);
  dataEl.classList.toggle('hidden', showUploads);
  myUploadsEl.classList.toggle('hidden', !showUploads);
  document.querySelector('.feedIntro').textContent = showUploads
    ? 'Review and manage your own listings.'
    : 'Fast discovery like Amazon, with supplier context like LinkedIn.';
}

function inferFilterTags(item) {
  const text = `${item.name || ''} ${item.description || ''} ${item.city || ''} ${item.shop_name || ''} ${item.business_name || ''}`.toLowerCase();
  const tags = new Set(['all']);
  if (text.match(/premium|fast|deal|top|hot|best|featured/)) tags.add('trending');
  if (text.match(/supplier|shop|store|vendor|verified|dealer/)) tags.add('suppliers');
  if (text.match(/deal|offer|discount|sale|cheap/)) tags.add('deals');
  if (text.match(/network|connect|community|explore/)) tags.add('network');
  return tags;
}

function matchesActiveFilter(item) {
  if (activeFilter === 'all') return true;
  return inferFilterTags(item).has(activeFilter);
}

function applyFilters() {
  const query = globalSearch.value.trim().toLowerCase();
  const source = activeView === 'uploads' ? myUploadsCache : productsCache;
  const filtered = source.filter((item) => {
    const searchable = `${item.name || ''} ${item.description || ''} ${item.city || ''} ${item.shop_name || ''} ${item.business_name || ''}`.toLowerCase();
    const queryMatch = !query || searchable.includes(query);
    return queryMatch && matchesActiveFilter(item);
  });

  if (activeView === 'uploads') {
    renderMyUploads(filtered);
    feedCountEl.textContent = String(filtered.length);
    activeFilterLabelEl.textContent = `${filtered.length} of your listings`;
    renderRail(filtered.length ? filtered : source);
    return;
  }

  renderProducts(filtered);
  renderRail(filtered.length ? filtered : source);
}

function setActiveFilter(filter) {
  activeFilter = filter;
  subbarButtons.forEach((button) => {
    button.classList.toggle('subbarActive', button.dataset.filter === filter);
  });
  applyFilters();
}

function inferTrendingScore(item) {
  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  const keywords = ['premium', 'top', 'fast', 'deal', 'sale', 'featured', 'hot', 'best'];
  return keywords.reduce((score, keyword, index) => score + (text.includes(keyword) ? (keywords.length - index) : 0), item.image_url ? 2 : 0);
}

function renderRail(items) {
  const source = (items || []).filter(Boolean);
  const supplierMap = new Map();

  source.forEach((item) => {
    const name = item.shop_name || item.business_name || 'Verified supplier';
    const entry = supplierMap.get(name) || { name, count: 0, city: item.city || 'Marketplace', sample: item.name || 'Inventory' };
    entry.count += 1;
    supplierMap.set(name, entry);
  });

  const topSuppliers = Array.from(supplierMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  const trendingItems = source.slice().sort((a, b) => inferTrendingScore(b) - inferTrendingScore(a)).slice(0, 5);

  topSuppliersListEl.innerHTML = topSuppliers.length
    ? topSuppliers.map((supplier) => `
        <button class="railItem" type="button" data-rail-query="${encodeURIComponent(supplier.name)}">
          <span class="railItemTitle">${supplier.name}</span>
          <span class="railItemMeta">${supplier.count} listings • ${supplier.city}</span>
        </button>
      `).join('')
    : '<p class="muted railEmpty">Supplier insights will appear here once listings are live.</p>';

  trendingNowListEl.innerHTML = trendingItems.length
    ? trendingItems.map((item) => `
        <button class="railItem railItemCompact" type="button" data-rail-query="${encodeURIComponent(item.name || item.title || '')}">
          <span class="railItemTitle">${item.name || item.title || 'Untitled Listing'}</span>
          <span class="railItemMeta">${item.shop_name || item.business_name || 'Marketplace seller'} • ${item.price ? `₹${Number(item.price).toLocaleString('en-IN')}` : 'Price on request'}</span>
        </button>
      `).join('')
    : '<p class="muted railEmpty">Trending items will appear here as catalog data grows.</p>';
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
    statusEl.textContent = (json.message || 'Backend online').replace(/DealerConnect/gi, 'MarketPlace.Store');
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

  applyFilters();
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
  if (activeView === 'uploads') applyFilters();
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
  const gstNumber = document.getElementById('registerGst').value.trim();
  const payload = {
    shop_name: document.getElementById('registerShopName').value.trim(),
    phone: document.getElementById('registerPhone').value.trim(),
    gst_number: gstNumber || 'NA',
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

async function handleFeedAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  if (button.dataset.action === 'inquire') {
    const productName = button.dataset.productName || 'this listing';
    const text = `Hi, I’m interested in ${productName} from MarketPlace.Store.`;
    try {
      await navigator.clipboard.writeText(text);
      uploadStatusEl.textContent = 'Inquiry text copied to clipboard.';
    } catch (error) {
      uploadStatusEl.textContent = text;
    }
    return;
  }

  if (button.dataset.action === 'details') {
    uploadStatusEl.textContent = 'Tap a listing to compare, contact, or save it. More detailed pages can come next.';
  }
}

function handleRailAction(event) {
  const button = event.target.closest('button[data-rail-query]');
  if (!button) return;
  const query = decodeURIComponent(button.dataset.railQuery || '');
  globalSearch.value = query;
  applyFilters();
  setActiveTab('explore');
}

loginForm.addEventListener('submit', handleLogin);
otpForm.addEventListener('submit', handleOtpVerify);
registerForm.addEventListener('submit', handleRegister);
uploadForm.addEventListener('submit', handleUpload);
myUploadsEl.addEventListener('click', handleMyUploadAction);
dataEl.addEventListener('click', handleFeedAction);
document.querySelector('.uploadPanel').addEventListener('click', handleRailAction);
globalSearch.addEventListener('input', () => applyFilters());
exploreTab.addEventListener('click', () => setActiveTab('explore'));
myUploadsTab.addEventListener('click', () => setActiveTab('uploads'));
subbarButtons.forEach((button) => button.addEventListener('click', () => setActiveFilter(button.dataset.filter)));

hydrateBusinessFromToken();
updateIdentityCard();

if (authToken) setAuthStatus('Session restored. Ready to upload and explore.');

checkBackend();
fetchProducts();
fetchMyUploads();
