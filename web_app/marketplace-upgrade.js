/**
 * marketplace-store-fef91.web.app - Premium Platform Upgrade
 * Cart, Wishlist, Orders, Checkout, and Analytics
 */

// ============================================================================
// CART SYSTEM - Client-side cart management with localStorage persistence
// ============================================================================

const CartSystem = (() => {
  const STORAGE_KEY = 'MARKETPLACE_CART';
  
  const getCart = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  };
  
  const saveCart = (cart) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartBadge();
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart } }));
  };
  
  const addItem = (product, quantity = 1) => {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        shop_name: product.shop_name,
        phone: product.phone,
        email: product.email,
        image_url: product.image_url,
        quantity: quantity,
        addedAt: new Date().toISOString()
      });
    }
    
    saveCart(cart);
    return cart;
  };
  
  const removeItem = (productId) => {
    const cart = getCart().filter(item => item.id !== productId);
    saveCart(cart);
    return cart;
  };
  
  const updateQuantity = (productId, quantity) => {
    const cart = getCart();
    const item = cart.find(item => item.id === productId);
    
    if (item) {
      item.quantity = Math.max(1, quantity);
      saveCart(cart);
    }
    
    return cart;
  };
  
  const clearCart = () => {
    saveCart([]);
  };
  
  const getTotal = () => {
    return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };
  
  const getItemCount = () => {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
  };
  
  const updateCartBadge = () => {
    const badge = document.getElementById('cartBadge');
    if (badge) {
      const count = getItemCount();
      badge.textContent = count > 0 ? String(count) : '0';
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  };
  
  return {
    getCart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
    updateCartBadge
  };
})();

// ============================================================================
// WISHLIST SYSTEM - Manage wishlist with localStorage
// ============================================================================

const WishlistSystem = (() => {
  const STORAGE_KEY = 'MARKETPLACE_WISHLIST';
  
  const getWishlist = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  };
  
  const saveWishlist = (wishlist) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
    updateWishlistBadge();
    window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { wishlist } }));
  };
  
  const addItem = (product) => {
    const wishlist = getWishlist();
    const exists = wishlist.some(item => item.id === product.id);
    
    if (!exists) {
      wishlist.push({
        id: product.id,
        name: product.name,
        price: product.price,
        shop_name: product.shop_name,
        image_url: product.image_url,
        addedAt: new Date().toISOString()
      });
      saveWishlist(wishlist);
    }
    
    return wishlist;
  };
  
  const removeItem = (productId) => {
    const wishlist = getWishlist().filter(item => item.id !== productId);
    saveWishlist(wishlist);
    return wishlist;
  };
  
  const isInWishlist = (productId) => {
    return getWishlist().some(item => item.id === productId);
  };
  
  const updateWishlistBadge = () => {
    const badge = document.getElementById('wishlistBadge');
    if (badge) {
      const count = getWishlist().length;
      badge.textContent = count > 0 ? String(count) : '0';
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  };
  
  return {
    getWishlist,
    addItem,
    removeItem,
    isInWishlist,
    updateWishlistBadge
  };
})();

// ============================================================================
// ORDERS SYSTEM - Order creation and management
// ============================================================================

const OrdersSystem = (() => {
  const STORAGE_KEY = 'MARKETPLACE_ORDERS';
  
  const getOrders = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  };
  
  const saveOrders = (orders) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('ordersUpdated', { detail: { orders } }));
  };
  
  const createOrder = (checkoutData, cartItems) => {
    const orders = getOrders();
    
    const order = {
      id: 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      buyer: {
        name: checkoutData.name,
        phone: checkoutData.phone,
        email: checkoutData.email,
        address: checkoutData.address,
        city: checkoutData.city,
        state: checkoutData.state,
        pin: checkoutData.pin
      },
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        seller: {
          name: item.shop_name,
          phone: item.phone,
          email: item.email
        }
      })),
      total: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      notes: checkoutData.notes || '',
      status: 'pending', // pending, confirmed, completed, cancelled
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    orders.push(order);
    saveOrders(orders);
    
    // Also create server-side order if API available
    if (window.authToken) {
      createServerOrder(order);
    }
    
    return order;
  };
  
  const createServerOrder = async (order) => {
    try {
      const response = await fetch(`${window.DEFAULT_API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authToken}`
        },
        body: JSON.stringify(order)
      });
      
      if (!response.ok) {
        console.error('Failed to create server order');
      }
    } catch (error) {
      console.error('Error creating server order:', error);
    }
  };
  
  const getOrderById = (orderId) => {
    return getOrders().find(order => order.id === orderId);
  };
  
  const updateOrderStatus = (orderId, status) => {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      saveOrders(orders);
    }
    
    return order;
  };
  
  const getBuyerOrders = (email) => {
    return getOrders().filter(order => order.buyer.email === email);
  };
  
  const getSellerOrders = (phone) => {
    return getOrders().filter(order =>
      order.items.some(item => item.seller.phone === phone)
    );
  };
  
  return {
    getOrders,
    createOrder,
    getOrderById,
    updateOrderStatus,
    getBuyerOrders,
    getSellerOrders
  };
})();

// ============================================================================
// UI CONTROLLERS - Cart, Wishlist, Orders UI handlers
// ============================================================================

const UIControllers = (() => {
  const initCartDrawer = () => {
    const cartToggle = document.getElementById('cartToggle') || document.getElementById('cartBtn');
    const cartClose = document.getElementById('cartClose');
    const cartDrawer = document.getElementById('cartDrawer');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!cartToggle) return;
    
    cartToggle.addEventListener('click', () => {
      renderCartDrawer();
      cartDrawer.classList.remove('hidden');
    });
    
    cartClose?.addEventListener('click', () => {
      cartDrawer.classList.add('hidden');
    });
    
    checkoutBtn?.addEventListener('click', () => {
      cartDrawer.classList.add('hidden');
      showCheckoutPage();
    });
  };
  
  const renderCartDrawer = () => {
    const cartItems = CartSystem.getCart();
    const cartItemsEl = document.getElementById('cartItems');
    
    if (!cartItemsEl) return;
    
    if (cartItems.length === 0) {
      cartItemsEl.innerHTML = '<p class="muted" style="text-align: center; padding: 20px;">Your cart is empty</p>';
      return;
    }
    
    const html = cartItems.map(item => `
      <div class="cartItem">
        <div class="cartItemImage">
          ${item.image_url 
            ? `<img src="${item.image_url}" alt="${item.name}" />` 
            : '<div class="cartItemImagePlaceholder">No image</div>'}
        </div>
        <div class="cartItemDetails">
          <div class="cartItemName">${item.name}</div>
          <div class="cartItemSeller">${item.shop_name}</div>
          <div class="cartItemPrice">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
        </div>
        <div class="cartItemControls">
          <button type="button" data-action="decrease-qty" data-product-id="${item.id}">−</button>
          <input type="number" value="${item.quantity}" min="1" data-action="set-qty" data-product-id="${item.id}" class="qtyInput" />
          <button type="button" data-action="increase-qty" data-product-id="${item.id}">+</button>
          <button type="button" data-action="remove-item" data-product-id="${item.id}" class="removeBtn">Remove</button>
        </div>
      </div>
    `).join('');
    
    cartItemsEl.innerHTML = html;
    
    document.getElementById('cartSubtotal').textContent = '₹' + CartSystem.getTotal().toLocaleString('en-IN');
    document.getElementById('cartItemCount').textContent = String(cartItems.length);
    
    // Attach event listeners
    cartItemsEl.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', handleCartAction);
    });
  };
  
  const handleCartAction = (e) => {
    const action = e.target.dataset.action;
    const productId = e.target.dataset.productId;
    
    switch (action) {
      case 'increase-qty':
        CartSystem.updateQuantity(productId, CartSystem.getCart().find(i => i.id === productId).quantity + 1);
        renderCartDrawer();
        break;
      case 'decrease-qty':
        CartSystem.updateQuantity(productId, CartSystem.getCart().find(i => i.id === productId).quantity - 1);
        renderCartDrawer();
        break;
      case 'set-qty':
        CartSystem.updateQuantity(productId, parseInt(e.target.value));
        renderCartDrawer();
        break;
      case 'remove-item':
        CartSystem.removeItem(productId);
        renderCartDrawer();
        break;
    }
  };
  
  const initWishlistDrawer = () => {
    const wishlistToggle = document.getElementById('wishlistToggle') || document.getElementById('wishlistBtn');
    const wishlistClose = document.getElementById('wishlistClose');
    const wishlistDrawer = document.getElementById('wishlistDrawer');
    
    if (!wishlistToggle) return;
    
    wishlistToggle.addEventListener('click', () => {
      renderWishlistDrawer();
      wishlistDrawer.classList.remove('hidden');
    });
    
    wishlistClose?.addEventListener('click', () => {
      wishlistDrawer.classList.add('hidden');
    });
  };
  
  const renderWishlistDrawer = () => {
    const wishlist = WishlistSystem.getWishlist();
    const wishlistItems = document.getElementById('wishlistItems');
    
    if (!wishlistItems) return;
    
    if (wishlist.length === 0) {
      wishlistItems.innerHTML = '<p class="muted" style="text-align: center; padding: 20px;">Your wishlist is empty</p>';
      return;
    }
    
    const html = wishlist.map(item => `
      <div class="wishlistItem">
        <div class="wishlistItemImage">
          ${item.image_url 
            ? `<img src="${item.image_url}" alt="${item.name}" />` 
            : '<div class="wishlistItemImagePlaceholder">No image</div>'}
        </div>
        <div class="wishlistItemDetails">
          <div class="wishlistItemName">${item.name}</div>
          <div class="wishlistItemSeller">${item.shop_name}</div>
          <div class="wishlistItemPrice">₹${item.price.toLocaleString('en-IN')}</div>
          <div class="wishlistItemActions">
            <button type="button" data-action="add-to-cart" data-product-id="${item.id}" class="buttonPrimary">Add to cart</button>
            <button type="button" data-action="remove-wishlist" data-product-id="${item.id}" class="buttonSecondary">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
    
    wishlistItems.innerHTML = html;
    
    wishlistItems.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', handleWishlistAction);
    });
  };
  
  const handleWishlistAction = (e) => {
    const action = e.target.dataset.action;
    const productId = e.target.dataset.productId;
    
    if (action === 'remove-wishlist') {
      WishlistSystem.removeItem(productId);
      renderWishlistDrawer();
    } else if (action === 'add-to-cart') {
      const wishlist = WishlistSystem.getWishlist();
      const product = wishlist.find(p => p.id === productId);
      if (product) {
        CartSystem.addItem(product);
        WishlistSystem.removeItem(productId);
        renderWishlistDrawer();
      }
    }
  };
  
  const initOrdersPage = () => {
    const ordersToggle = document.getElementById('ordersToggle') || document.getElementById('ordersBtn');
    const ordersClose = document.getElementById('ordersClose');
    const ordersPage = document.getElementById('ordersPage');
    
    if (!ordersToggle) return;
    
    ordersToggle.addEventListener('click', () => {
      renderOrdersPage();
      ordersPage.classList.remove('hidden');
    });
    
    ordersClose?.addEventListener('click', () => {
      ordersPage.classList.add('hidden');
    });
  };
  
  const renderOrdersPage = () => {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;
    
    const orders = OrdersSystem.getOrders();
    
    if (orders.length === 0) {
      ordersList.innerHTML = '<p class="muted" style="text-align: center; padding: 20px;">No orders yet</p>';
      return;
    }
    
    const html = orders.map(order => `
      <div class="orderCard">
        <div class="orderHeader">
          <div class="orderId">${order.id}</div>
          <span class="orderStatus status-${order.status}">${order.status.toUpperCase()}</span>
        </div>
        <div class="orderDate">${new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
        <div class="orderItems">
          ${order.items.map(item => `
            <div class="orderItem">
              <span>${item.name} × ${item.quantity}</span>
              <span>₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
            </div>
          `).join('')}
        </div>
        <div class="orderTotal">Total: <strong>₹${order.total.toLocaleString('en-IN')}</strong></div>
        <div class="orderSeller">Seller: ${order.items[0]?.seller.name}</div>
      </div>
    `).join('');
    
    ordersList.innerHTML = html;
  };
  
  const showCheckoutPage = () => {
    const checkoutPage = document.getElementById('checkoutPage');
    const main = document.querySelector('main');
    
    if (checkoutPage && main) {
      main.classList.add('hidden');
      checkoutPage.classList.remove('hidden');
      renderCheckoutSummary();
    }
  };
  
  const renderCheckoutSummary = () => {
    const cartItems = CartSystem.getCart();
    const summaryEl = document.getElementById('checkoutSummaryItems');
    const totalEl = document.getElementById('checkoutTotal');
    
    if (!summaryEl) return;
    
    const html = cartItems.map(item => `
      <div class="summaryRow">
        <span>${item.name} × ${item.quantity}</span>
        <span>₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
      </div>
    `).join('');
    
    summaryEl.innerHTML = html;
    const total = CartSystem.getTotal();
    totalEl.textContent = '₹' + total.toLocaleString('en-IN');
  };
  
  const initCheckoutForm = () => {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const checkoutData = {
        name: document.getElementById('checkoutName').value,
        phone: document.getElementById('checkoutPhone').value,
        email: document.getElementById('checkoutEmail').value,
        address: document.getElementById('checkoutAddress').value,
        city: document.getElementById('checkoutCity').value,
        state: document.getElementById('checkoutState').value,
        pin: document.getElementById('checkoutPin').value,
        notes: document.getElementById('checkoutNotes').value
      };
      
      const cartItems = CartSystem.getCart();
      const order = OrdersSystem.createOrder(checkoutData, cartItems);
      
      // Clear cart and show confirmation
      CartSystem.clearCart();
      
      alert(`Order created successfully!\nOrder ID: ${order.id}\n\nThe seller will contact you shortly to confirm payment and delivery details.`);
      
      // Reset form and go back
      form.reset();
      document.getElementById('checkoutBack')?.click();
    });
  };
  
  const initBackButtons = () => {
    const checkoutBack = document.getElementById('checkoutBack');
    const checkoutPage = document.getElementById('checkoutPage');
    const main = document.querySelector('main');
    
    checkoutBack?.addEventListener('click', () => {
      checkoutPage?.classList.add('hidden');
      main?.classList.remove('hidden');
    });
  };
  
  return {
    init: () => {
      initCartDrawer();
      initWishlistDrawer();
      initOrdersPage();
      initCheckoutForm();
      initBackButtons();
      CartSystem.updateCartBadge();
      WishlistSystem.updateWishlistBadge();
    }
  };
})();

// ============================================================================
// PRODUCT ACTIONS - Add to cart, add to wishlist, view details
// ============================================================================

const ProductActions = (() => {
  const addToCart = (product) => {
    CartSystem.addItem(product);
    const cartBadge = document.getElementById('cartBadge');
    cartBadge?.parentElement.classList.add('pulse');
    setTimeout(() => cartBadge?.parentElement.classList.remove('pulse'), 600);
    alert(`${product.name} added to cart!`);
  };
  
  const addToWishlist = (product) => {
    WishlistSystem.addItem(product);
    alert(`${product.name} added to wishlist!`);
  };
  
  const viewDetails = (product) => {
    showProductModal(product);
  };
  
  const showProductModal = (product) => {
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('productModalBody');
    const modalOverlay = document.getElementById('modalOverlay');
    
    if (!modal || !modalBody) return;
    
    const isInWishlist = WishlistSystem.isInWishlist(product.id);
    
    const html = `
      <div class="productDetail">
        <div class="productImage">
          ${product.image_url 
            ? `<img src="${product.image_url}" alt="${product.name}" />` 
            : '<div class="productImagePlaceholder">No image available</div>'}
        </div>
        <div class="productInfo">
          <h1>${product.name}</h1>
          <div class="productSeller">
            <strong>${product.shop_name}</strong>
            <span class="badge">Verified Seller</span>
          </div>
          <div class="productPrice">₹${product.price.toLocaleString('en-IN')}</div>
          <div class="productDescription">${product.description || 'Professional listing from trusted dealer'}</div>
          <div class="productMeta">
            <div class="metaItem">
              <strong>City:</strong> ${product.city}
            </div>
            <div class="metaItem">
              <strong>Stock:</strong> ${product.stock || 'Available'}
            </div>
          </div>
          <div class="productActions">
            <button class="buttonPrimary" onclick="ProductActions.addToCart({id: '${product.id}', name: '${product.name}', price: ${product.price}, shop_name: '${product.shop_name}', phone: '${product.phone}', email: '${product.email}', image_url: '${product.image_url}', quantity: 1})">Add to Cart</button>
            <button class="buttonSecondary" onclick="ProductActions.addToWishlist({id: '${product.id}', name: '${product.name}', price: ${product.price}, shop_name: '${product.shop_name}', image_url: '${product.image_url}'})">
              ${isInWishlist ? '❤ In Wishlist' : '🤍 Add to Wishlist'}
            </button>
          </div>
          <div class="sellerContact">
            <h3>Contact Seller</h3>
            <div class="contactActions">
              <a href="tel:${product.phone}" class="contactBtn">📞 Call</a>
              <a href="https://wa.me/${product.phone.replace(/\\D/g, '')}?text=Hi, I'm interested in ${encodeURIComponent(product.name)}" target="_blank" class="contactBtn">💬 WhatsApp</a>
              <a href="mailto:${product.email}" class="contactBtn">✉️ Email</a>
            </div>
          </div>
        </div>
      </div>
    `;
    
    modalBody.innerHTML = html;
    modal.classList.remove('hidden');
  };
  
  return {
    addToCart,
    addToWishlist,
    viewDetails,
    showProductModal
  };
})();

// ============================================================================
// INITIALIZATION
// ============================================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    UIControllers.init();
  });
} else {
  UIControllers.init();
}
