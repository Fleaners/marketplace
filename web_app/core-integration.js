/**
 * App Core - Initialize marketplace features
 * This file integrates with marketplace-upgrade.js for cart, wishlist, and orders
 */

// Make systems globally accessible for HTML onclick handlers
window.CartSystem = CartSystem;
window.WishlistSystem = WishlistSystem;
window.OrdersSystem = OrdersSystem;
window.ProductActions = ProductActions;

// Store API URLs globally
window.DEFAULT_API_URL = DEFAULT_API_URL;

// Initialize upgrade features when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize core features
  UIControllers.init();
  
  // Wire up product card interactions
  setupProductCardHandlers();
});

// Setup product card click handlers for "Add to Cart", "Add to Wishlist", "View Details"
function setupProductCardHandlers() {
  const dataRoot = document.querySelector('#data');
  if (!dataRoot) return;

  const observer = new MutationObserver(() => {
    // Attach handlers to newly rendered product cards
    document.querySelectorAll('.feedCard:not([data-handlers-attached])').forEach(card => {
      card.setAttribute('data-handlers-attached', 'true');
      
      // Find the product data from card content
      const titleEl = card.querySelector('.feedTitle');
      const priceEl = card.querySelector('.priceRow strong');
      const supplierEl = card.querySelector('.feedHead span:first-child');
      
      if (!titleEl) return;
      
      const productName = titleEl.textContent;
      
      // Add "Add to Wishlist" button if not already present
      const actions = card.querySelector('.cardActions');
      if (actions && !actions.querySelector('[data-action="wishlist"]')) {
        const wishlistBtn = document.createElement('button');
        wishlistBtn.className = 'actionSecondary';
        wishlistBtn.type = 'button';
        wishlistBtn.innerHTML = '❤ Wishlist';
        wishlistBtn.setAttribute('data-action', 'wishlist');
        wishlistBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const product = extractProductFromCard(card);
          ProductActions.addToWishlist(product);
        });
        actions.appendChild(wishlistBtn);
      }
      
      // Override Details button to show modal
      const detailsBtn = card.querySelector('[data-action="details"]');
      if (detailsBtn) {
        detailsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const product = extractProductFromCard(card);
          ProductActions.viewDetails(product);
        });
      }
    });
  });
  
  observer.observe(dataRoot, { childList: true, subtree: true });
}

function extractProductFromCard(card) {
  const titleEl = card.querySelector('.feedTitle');
  const priceEl = card.querySelector('.priceRow strong');
  const descEl = card.querySelector('.feedMeta');
  const supplierEl = card.querySelector('.feedHead span:first-child');
  const imageEl = card.querySelector('.feedImage');
  
  // Extract from actual product data in cache if available
  const productIndex = Array.from(document.querySelectorAll('.feedCard')).indexOf(card);
  const cache = Array.isArray(window.productCache) ? window.productCache : [];
  if (productIndex >= 0 && cache[productIndex]) {
    return cache[productIndex];
  }

  const fallbackId = card.getAttribute('data-product-id') || `local-${productIndex}-${Date.now()}`;
  
  return {
    id: fallbackId,
    name: titleEl?.textContent || 'Product',
    price: parseInt(priceEl?.textContent?.replace(/[^0-9]/g, '')) || 0,
    description: descEl?.textContent || '',
    shop_name: supplierEl?.textContent || 'Seller',
    phone: '9999999999',
    email: 'seller@marketplace-store-fef91.web.app',
    city: 'marketplace-store-fef91.web.app',
    image_url: imageEl?.querySelector('img')?.src || '',
    stock: 10
  };
}

// Export for use in HTML
window.setupProductCardHandlers = setupProductCardHandlers;
window.extractProductFromCard = extractProductFromCard;
