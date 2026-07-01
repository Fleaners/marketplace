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

const firebaseConfig = {
  apiKey: 'AIzaSyChPAYRigFB8AIZMzFysYi_ZOgp3alRkiM',
  authDomain: 'marketplace-store-fef91.firebaseapp.com',
  projectId: 'marketplace-store-fef91',
  storageBucket: 'marketplace-store-fef91.appspot.com',
  messagingSenderId: '360203367218',
  appId: '1:360203367218:web:e5e846e0c7954843ef5d2b',
};

let auth = null;
let googleProvider = null;
let db = null;
let analyticsInstance = null;
let currentUser = null;
let currentUserProfile = null;
let confirmationResult = null;
let authMode = 'login';

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

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  auth = firebase.auth();
  db = firebase.firestore();
  googleProvider = new firebase.auth.GoogleAuthProvider();

  auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      const profile = await ensureUserProfile(user);
      currentUserProfile = profile;
      localStorage.setItem('mp_user', JSON.stringify(profile));
      fillProfile();
      routeSignedInUser(profile);
    } else {
      currentUserProfile = null;
      localStorage.removeItem('mp_user');
      fillProfile();
      showView('homeView');
    }
  });

  analyticsInstance = firebase.analytics ? firebase.analytics() : null;
}

async function ensureUserProfile(user, roleOverride = null, gstNumber = '') {
  if (!db) {
    return {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Marketplace User',
      email: user.email,
      role: roleOverride || 'buyer',
      createdAt: new Date().toISOString(),
      profileComplete: true,
      verified: !!roleOverride && roleOverride === 'seller',
      gstNumber: gstNumber || '',
    };
  }

  const userRef = db.collection(FIRESTORE_COLLECTIONS.users).doc(user.uid);
  const snapshot = await userRef.get();
  const existing = snapshot.exists ? snapshot.data() : {};
  const role = existing?.role || roleOverride || 'buyer';
  const profileData = {
    uid: user.uid,
    name: user.displayName || existing?.name || user.email?.split('@')[0] || 'Marketplace User',
    email: user.email,
    role,
    createdAt: existing?.createdAt || new Date().toISOString(),
    profileComplete: true,
    verified: existing?.verified || role === 'seller',
    gstNumber: gstNumber || existing?.gstNumber || '',
    lastLogin: new Date(),
  };

  await userRef.set(profileData, { merge: true });
  return profileData;
}

function routeSignedInUser(profile) {
  if (!profile) return;
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

  showView('buyerDashboard');
  loadBuyerDashboard(profile);
}

function showView(view) {
  const views = ['homeView', 'buyerDashboard', 'sellerDashboard', 'adminDashboard'];
  views.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('hidden', id !== view);
  });

  const isHome = view === 'homeView';
  const loginBtn = document.getElementById('navLoginBtn');
  if (loginBtn) loginBtn.style.display = isHome ? 'inline-flex' : 'none';
}

function signInWithGoogle() {
  if (!auth || !googleProvider) {
    alert('Firebase auth is not configured. Please add your Firebase configuration.');
    return;
  }

  auth.signInWithPopup(googleProvider)
    .then(async (result) => {
      const user = result.user;
      if (!user) return;
      const profile = await ensureUserProfile(user);
      currentUserProfile = profile;
      localStorage.setItem('mp_user', JSON.stringify(profile));
      fillProfile();
      closeAuthDrawer();
      alert('Signed in with Google');
      routeSignedInUser(profile);
    })
    .catch((error) => {
      console.error('Google sign-in error', error);
      alert(error.message || 'Google sign-in failed.');
    });
}

function signOutCurrentUser() {
  localStorage.removeItem('mp_user');
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
  location: '',
  products: [],
  dealers: [],
  nearby: [],
  recommended: [],
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
  heroSearchBtn: document.getElementById('heroSearchBtn'),
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

// Placeholder demo arrays removed — UI uses live Firestore data in `state`.

function formatPrice(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
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
          <span class="badge badgeSoft">${product.status}</span>
        </div>
        <div class="cardActions">
          <button class="actionPrimary" type="button" data-action="contact" data-id="${product.id}">Contact Seller</button>
          <button class="actionSecondary" type="button" data-action="details" data-id="${product.id}">View Details</button>
        </div>
      </div>
    </article>
  `;
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
          <a class="button buttonPrimary" href="https://wa.me/${dealer.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hello, I want to inquire about your products on marketplace.store')}" target="_blank">WhatsApp</a>
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
        <a class="button buttonPrimary" href="https://wa.me/${d.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hello, I saw your profile on marketplace.store')}">WhatsApp</a>
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
      <article class="seller-card">
        <div>
          <h3>${seller.name}</h3>
          <p>${seller.rating.toFixed(1)} ★</p>
        </div>
        <div>
          <span>Response</span>
          <strong>${seller.response || 'Fast'}</strong>
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
    { label: 'Daily Visitors', value: Math.round(totalViews / 7) || 0 },
    { label: 'Weekly Visitors', value: totalViews || 0 },
    { label: 'Monthly Visitors', value: totalViews * 4 || 0 },
  ];

  const salesAnalytics = [
    { label: 'Sales today', value: orders.filter((order) => isSameDay(new Date(order.createdAt?.toDate?.() || order.createdAt), new Date())).length },
    { label: 'Sales this week', value: orders.filter((order) => isSameWeek(new Date(order.createdAt?.toDate?.() || order.createdAt), new Date())).length },
    { label: 'Sales this month', value: orders.filter((order) => isSameMonth(new Date(order.createdAt?.toDate?.() || order.createdAt), new Date())).length },
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
  if (!elements.profileName || !elements.profileMeta) return;
  const user = JSON.parse(localStorage.getItem('mp_user') || 'null');
  if (user && user.name) {
    elements.profileName.textContent = user.name;
    elements.profileMeta.textContent = `${user.role === 'seller' ? 'Seller' : user.role === 'admin' ? 'Admin' : 'Buyer'} • ${user.email || ''}`;
    if (elements.navLoginBtn) elements.navLoginBtn.textContent = 'Logout';
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    if (mobileLoginBtn) mobileLoginBtn.querySelector('span:last-child').textContent = 'Logout';
  } else {
    elements.profileName.textContent = 'marketplace.store Guest';
    elements.profileMeta.textContent = 'Sign in to see personalized supplier recommendations.';
    if (elements.navLoginBtn) elements.navLoginBtn.textContent = 'Login';
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    if (mobileLoginBtn) mobileLoginBtn.querySelector('span:last-child').textContent = 'Login';
  }
}

function handleSearchSubmit(event) {
  event.preventDefault();
  const query = elements.globalSearch.value.trim();
  const category = elements.categorySelect.value;
  const location = elements.locationSelect.value;
  state.query = query;
  state.category = category;
  state.location = location;
  applyFilters();
}

function applyFilters() {
  const filtered = state.products.filter((product) => {
    const queryMatch = !state.query || product.name.toLowerCase().includes(state.query.toLowerCase()) || product.description.toLowerCase().includes(state.query.toLowerCase()) || product.seller.toLowerCase().includes(state.query.toLowerCase());
    const categoryMatch = !state.category || product.category === state.category;
    const locationMatch = !state.location || product.location === state.location;
    return queryMatch && categoryMatch && locationMatch;
  });
  state.recommended = filtered.slice(0, 4);
  renderTrendingProducts();
  renderNewArrivals();
  renderRecommendedProducts();
}

function handleTopButton(action) {
  const user = JSON.parse(localStorage.getItem('mp_user') || 'null');
  if (action === 'sell') {
    if (!user) {
      openAuthDrawer('register');
      const roleSelect = document.getElementById('authRole');
      if (roleSelect) roleSelect.value = 'seller';
      return;
    }
    if (user.role === 'seller') {
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
      openAuthDrawer('login');
      return;
    }
    routeSignedInUser(user);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (action === 'messages') {
    if (!user) {
      openAuthDrawer('login');
      return;
    }
    routeSignedInUser(user);
    if (user.role === 'seller') {
      scrollToSection('#sellerLeadInbox');
      return;
    }
    scrollToSection('#buyerMessagesList');
    return;
  }
  alert('Feature coming soon.');
}

function handleWhatsApp() {
  const message = encodeURIComponent('Hello, I need help with marketplace.store login and products.');
  window.open(`https://wa.me/?text=${message}`, '_blank');
}

function attachEvents() {
  if (elements.searchHeroForm) elements.searchHeroForm.addEventListener('submit', handleSearchSubmit);
  if (elements.heroSearchBtn) elements.heroSearchBtn.addEventListener('click', () => elements.searchHeroForm.requestSubmit());
  if (elements.becomeSellerBtn) elements.becomeSellerBtn.addEventListener('click', () => handleTopButton('sell'));
  if (elements.buyerBrowseBtn) elements.buyerBrowseBtn.addEventListener('click', () => scrollToSection('#trendingProductsList'));
  if (elements.sellerAddProductBtn) elements.sellerAddProductBtn.addEventListener('click', () => handleTopButton('sell'));
  if (elements.navSellerBtn) elements.navSellerBtn.addEventListener('click', () => handleTopButton('sell'));
  if (elements.navSellerBtnSecondary) elements.navSellerBtnSecondary.addEventListener('click', () => handleTopButton('sell'));
  if (elements.navDashboardBtn) elements.navDashboardBtn.addEventListener('click', () => handleTopButton('profile'));
  if (elements.navLoginBtn) elements.navLoginBtn.addEventListener('click', handleLoginButton);
  if (elements.exploreSuppliersBtn) elements.exploreSuppliersBtn.addEventListener('click', () => scrollToSection('#topSuppliersList'));
  if (elements.viewAllProductsBtn) elements.viewAllProductsBtn.addEventListener('click', () => {
    state.query = '';
    state.category = '';
    state.location = '';
    if (elements.globalSearch) elements.globalSearch.value = '';
    if (elements.categorySelect) elements.categorySelect.value = '';
    if (elements.locationSelect) elements.locationSelect.value = '';
    applyFilters();
    scrollToSection('#trendingProductsList');
  });
  if (elements.exploreDealersBtn) elements.exploreDealersBtn.addEventListener('click', () => scrollToSection('#featuredDealersList'));
  if (elements.seeNewListingsBtn) elements.seeNewListingsBtn.addEventListener('click', () => scrollToSection('#newArrivalsList'));
  if (elements.whatsAppFab) elements.whatsAppFab.addEventListener('click', handleWhatsApp);
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
      trackProductView(product, 'details');
      openProductModal(product);
      return;
    }

    if (action === 'details' && id) {
      const product = state.products.find((p) => p.id === id);
      if (!product) return;
      openProductModal(product);
      return;
    }

    if (btn.classList.contains('dealer-btn') && seller) {
      state.query = '';
      state.category = '';
      state.location = '';
      state.recommended = state.products.filter((p) => p.seller === seller).slice(0, 8);
      renderRecommendedProducts();
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'search':
      scrollToSection('#searchHeroForm');
      break;
    case 'sell':
      openAuthDrawer('register');
      break;
    case 'messages':
      handleTopButton('messages');
      break;
    case 'profile':
      const user = JSON.parse(localStorage.getItem('mp_user') || 'null');
      if (!user) {
        openAuthDrawer('login');
        return;
      }
      scrollToSection('#profileSection');
      break;
    case 'login':
      handleLoginButton();
      break;
    default:
      break;
  }
}

function bootstrap() {
  fillProfile();
  renderCategories();
  renderTrendingProducts();
  renderFeaturedDealers();
  renderNewArrivals();
  renderRecommendedProducts();
  renderNearbyBusinesses();
  renderVerifiedSellers();
  renderSuccessStories();
  attachEvents();
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

  if (!auth || !auth.currentUser) {
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

    state.recommended = state.products.slice(0, 8);
    state.heroStats.products = state.products.length;
    state.heroStats.suppliers = state.dealers.length;
    state.heroStats.verified = state.dealers.filter((dealer) => dealer.verified).length;
    state.successStories = state.dealers.slice(0, 4).map((dealer) => ({
      excerpt: `${dealer.name} in ${dealer.location} is delivering verified business leads and fast supplier response.`,
      seller: dealer.name,
    }));
    state.nearby = state.dealers.slice(0, 4);
    state.verifiedSellers = state.dealers.slice(0, 4);

    renderCategories();
    renderTrendingProducts();
    renderNewArrivals();
    renderRecommendedProducts();
    renderFeaturedDealers();
    renderTopSuppliers();
    renderSuccessStories();
    renderStats();
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
  const switchBtn = document.getElementById('authSwitch');
  const nameRow = document.getElementById('authNameRow');
  const emailRow = document.getElementById('authEmailRow');
  const passwordRow = document.getElementById('authPasswordRow');
  const otpRow = document.getElementById('authOtpRow');
  title.textContent = mode === 'login' ? 'Login with OTP' : 'Register with Email';
  switchBtn.textContent = mode === 'login' ? 'Switch to Register' : 'Switch to Login';
  submit.textContent = mode === 'login' ? 'Send OTP' : 'Register';
  submit.onclick = () => handleAuthSubmit(mode);
  switchBtn.onclick = () => openAuthDrawer(mode === 'login' ? 'register' : 'login');
  document.getElementById('authClose').onclick = closeAuthDrawer;

  const emailInput = document.getElementById('authEmail');
  const emailLabel = document.getElementById('authEmailLabel');
  const passwordInput = document.getElementById('authPassword');
  const passwordLabel = document.getElementById('authPasswordLabel');

  if (nameRow) nameRow.style.display = mode === 'login' ? 'none' : 'block';
  if (emailInput) emailInput.style.display = mode === 'login' ? 'none' : 'block';
  if (emailLabel) emailLabel.style.display = mode === 'login' ? 'none' : 'block';
  if (passwordInput) passwordInput.style.display = mode === 'login' ? 'none' : 'block';
  if (passwordLabel) passwordLabel.style.display = mode === 'login' ? 'none' : 'block';
  if (otpRow) otpRow.style.display = 'none';
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
  const submit = document.getElementById('authSubmit');
  if (submit) submit.textContent = authMode === 'login' ? 'Send OTP' : 'Register';
}

async function sendPhoneOtp(phone) {
  if (window.location.protocol === 'file:') {
    alert('Phone OTP is unavailable in local file preview. Open the app via localhost or Firebase Hosting to continue.');
    return;
  }

  const appVerifier = window.recaptchaVerifier || new firebase.auth.RecaptchaVerifier('recaptchaContainer', {
    size: 'invisible',
    callback: (response) => response,
  });

  try {
    confirmationResult = await auth.signInWithPhoneNumber(`+91${phone.replace(/\D/g, '')}`, appVerifier);
    document.getElementById('authOtpRow').style.display = 'flex';
    const submit = document.getElementById('authSubmit');
    if (submit) submit.textContent = 'Login';
    alert('OTP sent to your phone. Enter the code to complete login.');
  } catch (error) {
    const message = String(error?.message || '');
    if (message.includes('auth/internal-error') || message.includes('auth/operation-not-supported-in-this-environment')) {
      alert('Phone OTP is not available in this environment. Please use localhost or Firebase Hosting.');
      return;
    }
    console.warn('Phone OTP send error', error);
    alert(error.message || 'Unable to send OTP.');
  }
}

async function verifyPhoneOtp(otp) {
  if (!confirmationResult) return alert('Please request an OTP first.');
  try {
    const result = await confirmationResult.confirm(otp);
    const user = result.user;
    if (!user) throw new Error('OTP verification failed.');
    const profile = await ensureUserProfile(user);
    currentUserProfile = profile;
    localStorage.setItem('mp_user', JSON.stringify(profile));
    fillProfile();
    closeAuthDrawer();
    alert('Logged in successfully.');
    routeSignedInUser(profile);
  } catch (error) {
    console.error('OTP verification error', error);
    alert(error.message || 'OTP verification failed.');
  }
}

function validateGSTIN(gstin) {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase());
}

async function handleAuthSubmit(mode) {
  const name = document.getElementById('authName').value.trim();
  const phone = document.getElementById('authPhone').value.trim();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const role = document.getElementById('authRole').value;
  const gstNumber = document.getElementById('authGst').value.trim();
  const otp = document.getElementById('authOtp')?.value.trim();

  if (!phone) return alert('Phone number is required.');
  if (!/^[0-9]{10,15}$/.test(phone)) return alert('Please enter a valid phone number.');
  if (role === 'seller' && !gstNumber) return alert('GSTIN is required for seller registration.');
  if (role === 'seller' && !validateGSTIN(gstNumber)) return alert('Please enter a valid GSTIN.');

  try {
    if (mode === 'login') {
      if (!otp) {
        await sendPhoneOtp(phone);
        return;
      }
      await verifyPhoneOtp(otp);
      return;
    }

    if (mode === 'register') {
      if (!email || !password) return alert('Please provide email and password for registration.');
      const result = await auth.createUserWithEmailAndPassword(email, password);
      if (!result.user) throw new Error('Registration failed.');
      const profile = await ensureUserProfile(result.user, role, gstNumber);
      currentUserProfile = profile;
      localStorage.setItem('mp_user', JSON.stringify(profile));
      fillProfile();
      closeAuthDrawer();
      alert('Registered and signed in.');
      routeSignedInUser(profile);
      return;
    }
  } catch (error) {
    console.error('Auth submit error', error);
    alert(error.message || 'Authentication failed.');
  }
}

function updateAuthDrawerBehavior() {
  const roleSelect = document.getElementById('authRole');
  const gstLabel = document.getElementById('authGstLabel');
  const gstInput = document.getElementById('authGst');
  const phoneLabel = document.getElementById('authPhoneLabel');
  const phoneInput = document.getElementById('authPhone');
  const otpRow = document.getElementById('authOtpRow');
  const otpInput = document.getElementById('authOtp');
  if (!roleSelect || !gstLabel || !gstInput || !phoneLabel || !phoneInput) return;
  const update = () => {
    if (roleSelect.value === 'seller') {
      gstLabel.style.opacity = '1';
      gstInput.style.display = 'block';
    } else {
      gstLabel.style.opacity = '0.6';
      gstInput.style.display = 'block';
    }
  };
  roleSelect.addEventListener('change', update);
  update();

  if (otpRow && otpInput) {
    otpRow.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initFirebaseAuth();
  const googleBtn = document.getElementById('authGoogle');
  if (googleBtn) googleBtn.addEventListener('click', signInWithGoogle);
  updateAuthDrawerBehavior();
  if (!window.recaptchaVerifier) {
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
});

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
          <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
            <button class="button actionPrimary" id="pmWhatsapp">WhatsApp Seller</button>
            <button class="button actionSecondary" id="pmCall">Call Seller</button>
            <button class="button actionSecondary" id="pmInquiry">Request Quote</button>
          </div>
          <div style="margin-top:14px;color:var(--muted);">
            <div><strong>Price:</strong> ${formatPrice(product.price)}</div>
            <div><strong>Seller:</strong> ${product.seller}</div>
            <div><strong>Location:</strong> ${product.location}</div>
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
    await trackWhatsappClick(product);
    const text = encodeURIComponent(`Hello, I found your product "${product.name}" on marketplace.store and would like more information.`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  });

  overlay.querySelector('#pmCall').addEventListener('click', () => {
    alert('Call Seller: feature will display seller phone when available.');
  });

  overlay.querySelector('#pmInquiry').addEventListener('click', () => {
    alert('Inquiry sent. Seller will respond via WhatsApp or phone.');
  });
}
