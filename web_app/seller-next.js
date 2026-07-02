const API_URL = (() => {
  const params = new URLSearchParams(window.location.search);
  const queryApi = params.get('api');
  const storedApi = localStorage.getItem('API_URL');
  const hostname = window.location.hostname;
  if (queryApi) return queryApi;
  if (storedApi) return storedApi;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:5000';
  if (hostname.endsWith('web.app') || hostname.endsWith('firebaseapp.com')) return window.location.origin;
  return window.location.origin;
})();

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_KEYS = {
  products: 'seller_next_products_cache',
  insightsSummary: 'seller_next_insights_summary_cache',
  insightsCharts: 'seller_next_insights_charts_cache',
  messages: 'seller_next_messages_cache',
};

const fallbackData = {
  products: [
    {
      id: 'local-copper',
      name: 'Copper Wire Bundle',
      price: 3200,
      stock: 27,
      view_count: 128,
      inquiry_count: 22,
      image_url: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'local-pvc',
      name: 'PVC Pipes 2 inch',
      price: 1150,
      stock: 8,
      view_count: 98,
      inquiry_count: 17,
      image_url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'local-steel',
      name: 'Steel Rod Set',
      price: 4700,
      stock: 0,
      view_count: 66,
      inquiry_count: 13,
      image_url: 'https://images.unsplash.com/photo-1617159757172-b1d1f6385e2b?auto=format&fit=crop&w=1200&q=80',
    },
  ],
  insightsSummary: {
    cards: {
      visitors_today: 235,
      visitors_growth_week: 18,
      popular_product: { name: 'Copper Wire Bundle', views: 128 },
      new_messages: 14,
      low_stock_count: 3,
      business_growth_month: 12,
      recommended_action: 'Add more photos to your top products.',
    },
    stories: {
      interested_in: ['Industrial Pipes', 'Electrical Cables', 'Steel Products'],
      top_cities: ['Lucknow', 'Kanpur', 'Delhi'],
      best_time_to_respond: '19:00 - 21:00',
      fastest_growing_product: { product: 'PVC Pipes', growth: 38 },
    },
  },
  insightsCharts: {
    visitors_series: [20, 45, 40, 65, 85, 78, 92, 120].map((value, idx) => ({ date: `D${idx + 1}`, value })),
    top_products: [
      { name: 'Copper Wire Bundle', views: 120 },
      { name: 'PVC Pipes', views: 95 },
      { name: 'Steel Rod Set', views: 80 },
      { name: 'Industrial Clamp', views: 60 },
    ],
    category_interest: [
      { name: 'Electrical', value: 42 },
      { name: 'Industrial', value: 34 },
      { name: 'Steel', value: 24 },
    ],
  },
  messages: {
    threads: [
      { buyer_name: 'Sharma Traders', latest_message: 'Need 200 units. Can you share wholesale pricing?', latest_message_at: new Date().toISOString() },
      { buyer_name: 'Laxmi Electricals', latest_message: 'Is same-day dispatch available for Lucknow?', latest_message_at: new Date(Date.now() - 12 * 60000).toISOString() },
      { buyer_name: 'City Infra Projects', latest_message: 'Please send product dimensions for PVC Pipes.', latest_message_at: new Date(Date.now() - 35 * 60000).toISOString() },
    ],
  },
};

const appState = {
  products: [],
  insightsSummary: null,
  insightsCharts: null,
  messages: [],
  businessId: '',
  selectedThreadId: '',
};

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
  if (!GA_MEASUREMENT_ID) return;
  if (window.gtag) return;

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
    page_title: 'Seller Next Dashboard',
  });
}

function trackGaEvent(eventName, params = {}) {
  if (window.gtag) window.gtag('event', eventName, params);
  postAnalyticsEvent(eventName, params);
}

function getAuthToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('mp_auth_token') || '';
}

function getRequestHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getCache(cacheKey) {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.updatedAt) return null;
    if (Date.now() - parsed.updatedAt > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch (error) {
    return null;
  }
}

function setCache(cacheKey, data) {
  localStorage.setItem(cacheKey, JSON.stringify({ data, updatedAt: Date.now() }));
}

async function fetchJsonWithCache(url, cacheKey, fallback) {
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(url, { headers: getRequestHeaders() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    if (cached) return cached;
    return fallback;
  }
}

async function postAnalyticsEvent(event, metadata = {}) {
  const payload = {
    event,
    business_id: appState.businessId || metadata.business_id || null,
    product_id: metadata.product_id || null,
    city_location: metadata.city_location || null,
    device_type: metadata.device_type || getDeviceType(),
    traffic_source: metadata.traffic_source || document.referrer || 'direct',
    metadata,
  };
  try {
    await fetch(`${API_URL}/api/analytics/events`, {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Silent analytics failure.
  }
}

function getDeviceType() {
  const width = window.innerWidth;
  if (width <= 760) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

function resolveBusinessId(products = []) {
  const params = new URLSearchParams(window.location.search);
  const byQuery = params.get('business_id');
  if (byQuery) return byQuery;

  const profileRaw = localStorage.getItem('mp_user');
  if (profileRaw) {
    try {
      const profile = JSON.parse(profileRaw);
      if (profile.businessId) return String(profile.businessId);
    } catch (error) {
      // ignore parse errors
    }
  }

  if (products[0]?.business_id) return String(products[0].business_id);
  return '';
}

function getStockStatus(stock) {
  const amount = Number(stock || 0);
  if (amount <= 0) return { cls: 'out', label: 'Out Of Stock' };
  if (amount <= 10) return { cls: 'low', label: 'Running Low' };
  return { cls: 'in', label: 'In Stock' };
}

function drawLineChart(canvas, series = []) {
  const ctx = canvas.getContext('2d');
  const values = series.map((p) => Number(p.value || 0));
  const max = Math.max(1, ...values);
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ff9900';
  ctx.beginPath();
  values.forEach((value, idx) => {
    const x = (idx / Math.max(1, values.length - 1)) * canvas.clientWidth;
    const y = canvas.clientHeight - (value / max) * (canvas.clientHeight - 16) - 8;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawBarChart(canvas, products = []) {
  const ctx = canvas.getContext('2d');
  const bars = products.map((item) => Number(item.views || 0)).slice(0, 6);
  const max = Math.max(1, ...bars);
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, w, h);
  const width = 28;
  bars.forEach((value, idx) => {
    const x = 18 + idx * 42;
    const height = (value / max) * (canvas.clientHeight - 22);
    const y = canvas.clientHeight - height - 6;
    ctx.fillStyle = idx === 0 ? '#ff9900' : '#131921';
    ctx.fillRect(x, y, width, height);
  });
}

function drawPieChart(canvas, slices = []) {
  const ctx = canvas.getContext('2d');
  const data = slices.map((item) => Number(item.value || 0));
  const total = data.reduce((a, b) => a + b, 0) || 1;
  const colors = ['#ff9900', '#131921', '#16a34a', '#f59e0b', '#0ea5e9'];
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, w, h);
  let start = -Math.PI / 2;
  data.forEach((item, idx) => {
    const angle = (item / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(canvas.clientWidth / 2, canvas.clientHeight / 2);
    ctx.arc(canvas.clientWidth / 2, canvas.clientHeight / 2, 74, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[idx];
    ctx.fill();
    start += angle;
  });
}

function renderProducts() {
  const container = document.getElementById('productGrid');
  container.innerHTML = appState.products.map((item) => {
    const status = getStockStatus(item.stock);
    return `
    <article class="product-card">
      <img src="${item.image_url || 'https://via.placeholder.com/1200x800?text=Product'}" alt="${item.name}" loading="lazy" />
      <p class="product-title">${item.name}</p>
      <div class="product-meta">
        <span>Rs ${Number(item.price || 0).toLocaleString('en-IN')}</span>
        <span class="status ${status.cls}">${status.label}</span>
      </div>
      <div class="product-meta">
        <span>${Number(item.view_count || 0)} views</span>
        <span>${Number(item.inquiry_count || 0)} inquiries</span>
      </div>
      <div class="quick-actions">
        <button class="button secondary">Edit</button>
        <button class="button secondary">Pause</button>
        <button class="button secondary" data-share-product="${item.id}">Share</button>
        <button class="button secondary">Duplicate</button>
        <button class="button primary" data-contact-product="${item.id}">Contact Buyers</button>
      </div>
    </article>
  `;
  }).join('');
}

function renderSummaryCards() {
  const cards = appState.insightsSummary?.cards || fallbackData.insightsSummary.cards;
  const stories = appState.insightsSummary?.stories || fallbackData.insightsSummary.stories;

  const cardsContainer = document.querySelector('.card-grid.six');
  if (cardsContainer) {
    cardsContainer.innerHTML = `
      <article class="metric-card">
        <p class="metric-label">Today's Visitors</p>
        <p class="metric-number">${Number(cards.visitors_today || 0)}</p>
        <p class="metric-meta positive">+${Number(cards.visitors_growth_week || 0)}% this week</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Most Popular Product</p>
        <p class="metric-title">${cards.popular_product?.name || 'No product data'}</p>
        <p class="metric-meta">${Number(cards.popular_product?.views || 0)} views</p>
      </article>
      <article class="metric-card actionable">
        <p class="metric-label">New Customer Messages</p>
        <p class="metric-number">${Number(cards.new_messages || 0)}</p>
        <button class="button primary" data-jump="messages">Respond now</button>
      </article>
      <article class="metric-card actionable">
        <p class="metric-label">Products Running Low</p>
        <p class="metric-number">${Number(cards.low_stock_count || 0)}</p>
        <button class="button secondary" data-jump="products">View inventory</button>
      </article>
      <article class="metric-card">
        <p class="metric-label">Business Growth</p>
        <p class="metric-number">+${Number(cards.business_growth_month || 0)}%</p>
        <p class="metric-meta">This month</p>
      </article>
      <article class="metric-card recommendation">
        <p class="metric-label">Recommended Action</p>
        <p class="metric-title">${cards.recommended_action || 'Add more photos to your top products.'}</p>
      </article>
    `;
  }

  const storyCards = document.querySelector('.story-cards');
  if (storyCards) {
    storyCards.innerHTML = `
      <article class="story-card">
        <h3>People are interested in:</h3>
        <p>${(stories.interested_in || []).join(', ')}</p>
      </article>
      <article class="story-card">
        <h3>Most visitors come from:</h3>
        <p>${(stories.top_cities || []).join(', ')}</p>
      </article>
      <article class="story-card">
        <h3>Best time to respond:</h3>
        <p>${stories.best_time_to_respond || '19:00 - 21:00'}</p>
      </article>
      <article class="story-card positive">
        <h3>Products growing fastest:</h3>
        <p>${stories.fastest_growing_product?.product || 'No data'} +${Number(stories.fastest_growing_product?.growth || 0)}%</p>
      </article>
    `;
  }
}

function renderMessages() {
  const messages = appState.messages.length ? appState.messages : fallbackData.messages.threads;
  const list = document.getElementById('messageList');
  if (!list) return;
  if (!messages.length) {
    list.innerHTML = '<article class="message-card"><p class="message-name">No customer messages yet</p><p class="message-text">New buyer messages will appear here.</p></article>';
    appState.selectedThreadId = '';
    syncComposerState();
    return;
  }

  if (!appState.selectedThreadId) {
    appState.selectedThreadId = String(messages[0].thread_id || '');
  }

  list.innerHTML = messages.slice(0, 12).map((item) => {
    const threadId = String(item.thread_id || '');
    const timestamp = item.latest_message_at ? new Date(item.latest_message_at) : new Date();
    const mins = Math.max(1, Math.round((Date.now() - timestamp.getTime()) / 60000));
    const unread = Number(item.unread_count || 0);
    const isActive = threadId && threadId === appState.selectedThreadId;
    return `
      <article class="message-card ${isActive ? 'active' : ''}">
        <p class="message-name">${item.buyer_name || 'Buyer'}</p>
        <p class="message-text">${item.latest_message || 'New buyer message'}</p>
        <p class="message-time">${mins} minutes ago ${unread > 0 ? `• ${unread} unread` : ''}</p>
        <button class="button secondary" data-thread-select="${threadId}">Open Thread</button>
      </article>
    `;
  }).join('');

  syncComposerState();
}

function syncComposerState() {
  const activeThreadBuyer = document.getElementById('activeThreadBuyer');
  const activeThreadMeta = document.getElementById('activeThreadMeta');
  const replyInput = document.getElementById('replyInput');
  const replySendBtn = document.getElementById('replySendBtn');

  if (!activeThreadBuyer || !activeThreadMeta || !replyInput || !replySendBtn) return;

  const thread = (appState.messages || []).find((item) => String(item.thread_id || '') === appState.selectedThreadId);
  if (!thread) {
    activeThreadBuyer.textContent = 'Select a customer thread';
    activeThreadMeta.textContent = 'Choose a message on the left to reply.';
    replySendBtn.disabled = true;
    return;
  }

  const timestamp = thread.latest_message_at ? new Date(thread.latest_message_at).toLocaleString() : 'Just now';
  activeThreadBuyer.textContent = thread.buyer_name || 'Buyer';
  activeThreadMeta.textContent = `Last message: ${timestamp}`;
  replySendBtn.disabled = false;
}

async function sendReply() {
  const threadId = appState.selectedThreadId;
  const replyInput = document.getElementById('replyInput');
  const replyStatus = document.getElementById('replyStatus');
  if (!replyInput || !replyStatus) return;

  const text = String(replyInput.value || '').trim();
  if (!threadId) {
    replyStatus.textContent = 'Select a message thread first.';
    return;
  }
  if (!text) {
    replyStatus.textContent = 'Write a reply before sending.';
    return;
  }

  replyStatus.textContent = 'Sending...';
  try {
    const response = await fetch(`${API_URL}/api/messages/${encodeURIComponent(threadId)}/reply`, {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({
        text,
        business_id: appState.businessId || null,
      }),
    });

    if (!response.ok) {
      throw new Error(`Reply failed (${response.status})`);
    }

    const thread = (appState.messages || []).find((item) => String(item.thread_id || '') === threadId);
    if (thread) {
      thread.latest_message = text;
      thread.latest_message_at = new Date().toISOString();
      thread.unread_count = 0;
      setCache(CACHE_KEYS.messages, { threads: appState.messages });
      renderMessages();
    }

    trackGaEvent('contact_seller', { thread_id: threadId, action: 'reply_sent' });
    replyInput.value = '';
    replyStatus.textContent = 'Reply sent successfully.';
  } catch (error) {
    replyStatus.textContent = 'Could not send reply. Try again.';
  }
}

async function loadLiveData() {
  appState.products = await fetchJsonWithCache(
    `${API_URL}/api/products`,
    CACHE_KEYS.products,
    fallbackData.products
  );

  appState.businessId = resolveBusinessId(appState.products);
  const businessQuery = appState.businessId ? `?business_id=${encodeURIComponent(appState.businessId)}` : '';

  appState.insightsSummary = await fetchJsonWithCache(
    `${API_URL}/api/insights/summary${businessQuery}`,
    CACHE_KEYS.insightsSummary,
    fallbackData.insightsSummary
  );

  appState.insightsCharts = await fetchJsonWithCache(
    `${API_URL}/api/insights/charts${businessQuery}`,
    CACHE_KEYS.insightsCharts,
    fallbackData.insightsCharts
  );

  const messagesPayload = await fetchJsonWithCache(
    `${API_URL}/api/messages${businessQuery}`,
    CACHE_KEYS.messages,
    fallbackData.messages
  );
  appState.messages = messagesPayload.threads || [];

  renderSummaryCards();
  renderProducts();
  renderMessages();
  drawCharts();

  trackGaEvent('page_view', {
    business_id: appState.businessId || null,
    page_name: 'seller_next_dashboard',
    device_type: getDeviceType(),
  });
}

function setupNavigation() {
  const navButtons = Array.from(document.querySelectorAll('.nav-item'));
  const views = Array.from(document.querySelectorAll('.view'));

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      navButtons.forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.target;
      views.forEach((view) => {
        view.classList.toggle('active', view.dataset.view === target);
      });
      trackGaEvent('page_view', { page_name: `seller_next_${target}` });
    });
  });
}

function setupTheme() {
  const toggle = document.getElementById('themeToggle');
  toggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    toggle.textContent = document.body.classList.contains('dark') ? 'Light' : 'Dark';
  });
}

function drawCharts() {
  const charts = appState.insightsCharts || fallbackData.insightsCharts;
  drawLineChart(document.getElementById('lineChart'), charts.visitors_series || []);
  drawBarChart(document.getElementById('barChart'), charts.top_products || []);
  drawPieChart(document.getElementById('pieChart'), charts.category_interest || []);
}

window.addEventListener('resize', () => {
  if (document.querySelector('[data-view="insights"].active')) {
    drawCharts();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  setupGa4();
  setupNavigation();
  setupTheme();
  loadLiveData();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore service worker registration issues.
    });
  }

  const replyTemplateBtn = document.getElementById('replyTemplateBtn');
  const replySendBtn = document.getElementById('replySendBtn');
  const replyInput = document.getElementById('replyInput');
  if (replyTemplateBtn && replyInput) {
    replyTemplateBtn.addEventListener('click', () => {
      replyInput.value = 'Thank you for your message. We can share pricing and dispatch details right away. Please confirm required quantity.';
      replyInput.focus();
    });
  }
  if (replySendBtn) {
    replySendBtn.addEventListener('click', sendReply);
  }

  document.body.addEventListener('click', (event) => {
    const selectThreadBtn = event.target.closest('[data-thread-select]');
    if (selectThreadBtn) {
      const threadId = String(selectThreadBtn.getAttribute('data-thread-select') || '');
      if (threadId) {
        appState.selectedThreadId = threadId;
        renderMessages();
      }
      return;
    }

    const shareBtn = event.target.closest('[data-share-product]');
    if (shareBtn) {
      const id = shareBtn.getAttribute('data-share-product');
      trackGaEvent('product_view', { product_id: id, action: 'share' });
      return;
    }

    const contactBtn = event.target.closest('[data-contact-product]');
    if (contactBtn) {
      const id = contactBtn.getAttribute('data-contact-product');
      trackGaEvent('contact_seller', { product_id: id });
      return;
    }

    const jumpBtn = event.target.closest('[data-jump]');
    if (jumpBtn) {
      const target = jumpBtn.getAttribute('data-jump');
      const nav = document.querySelector(`.nav-item[data-target="${target}"]`);
      if (nav) nav.click();
    }
  });

  trackGaEvent('device_type', { device_type: getDeviceType() });
  trackGaEvent('traffic_source', { traffic_source: document.referrer || 'direct' });
});
