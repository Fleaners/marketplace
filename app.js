const statusEl = document.getElementById('status');
const dataEl = document.getElementById('data');

// Detect API endpoint: use query param, localStorage, or defaults
const params = new URLSearchParams(window.location.search);
const storedApi = localStorage.getItem('API_URL');
const queryApi = params.get('api');
const API_URL = queryApi || storedApi || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '') || '';

if (queryApi) localStorage.setItem('API_URL', queryApi);

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
    const res = await fetch(endpoint, { cache: 'no-store', mode: API_URL ? 'cors' : 'same-origin' });
    if (!res.ok) { showFallback(); return; }
    const items = await res.json();
    if (!items || !items.length) { showFallback(); return; }
    dataEl.innerHTML = '<h2>Products</h2>' + items.map(p=>`<div class="product"><strong>${p.name||p.title||'Item'}</strong><div>${p.description||''}</div></div>`).join('');
  } catch(e) {
    showFallback();
  }
}

checkBackend();
fetchProducts();
