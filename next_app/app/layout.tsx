import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Seller Dashboard — marketplace.store',
    template: '%s | marketplace.store',
  },
  description:
    'Enterprise-grade seller management platform. Manage your listings, track orders, and grow your business on marketplace.store.',
  metadataBase: new URL('https://marketplace-store-fef91.web.app'),
  alternates: {
    canonical: '/next/dashboard',
  },
  openGraph: {
    title: 'Seller Dashboard — marketplace.store',
    description: 'Manage your marketplace listings, analytics, and orders.',
    url: 'https://marketplace-store-fef91.web.app/next/dashboard',
    siteName: 'marketplace.store',
    images: [{ url: '/assets/marketplace-store-app-icon.svg' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Seller Dashboard — marketplace.store',
    description: 'Manage your marketplace listings, analytics, and orders.',
  },
  robots: {
    // Seller dashboard is private — keep out of search index
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#FAB12F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cacheBusterScript = `
    (function() {
      var APP_VERSION = '1.3.0';
      var storedVersion = localStorage.getItem('APP_VERSION');
      if (storedVersion !== APP_VERSION) {
        localStorage.setItem('APP_VERSION', APP_VERSION);
        if ('serviceWorker' in navigator && navigator.serviceWorker && typeof navigator.serviceWorker.getRegistrations === 'function') {
          navigator.serviceWorker.getRegistrations().then(function(regs) {
            if (Array.isArray(regs)) {
              for (var i = 0; i < regs.length; i++) {
                if (regs[i] && typeof regs[i].unregister === 'function') {
                  regs[i].unregister().catch(function() {});
                }
              }
            }
          }).catch(function(err) {});
        }
        if ('caches' in window && window.caches && typeof window.caches.keys === 'function') {
          window.caches.keys().then(function(names) {
            if (Array.isArray(names)) {
              for (var i = 0; i < names.length; i++) {
                window.caches.delete(names[i]).catch(function() {});
              }
            }
          }).catch(function(err) {});
        }
        for (var i = localStorage.length - 1; i >= 0; i--) {
          var key = localStorage.key(i);
          if (key && (
            key.indexOf('cache') > -1 ||
            key.indexOf('static') > -1 ||
            key.indexOf('asset') > -1 ||
            key.indexOf('version') > -1 ||
            key.indexOf('sw-') > -1
          )) {
            localStorage.removeItem(key);
          }
        }
        if (!navigator.webdriver && window.location.search.indexOf('clear_cache_ts') === -1) {
          var url = new URL(window.location.href);
          url.searchParams.set('clear_cache_ts', Date.now().toString());
          window.location.replace(url.toString());
        }
      }
    })();
  `;

  return (
    <html lang="en">
      <head>
        {/* Self-hosted Inter — eliminates render-blocking Google Fonts CDN */}
        <link rel="preload" href="/assets/Inter-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/Inter-SemiBold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/Inter-Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="stylesheet" href="/assets/fonts.css" />
        {/* Inline skip-link CSS so it has zero render-blocking cost */}
        <style>{`
          .skip-link {
            position: absolute;
            top: -100px;
            left: 0;
            z-index: 99999;
            padding: 12px 20px;
            background: #FAB12F;
            color: #111827;
            font-family: Inter, sans-serif;
            font-weight: 700;
            text-decoration: none;
            border-radius: 0 0 12px 0;
            transition: top 0.2s ease;
          }
          .skip-link:focus {
            top: 0;
          }
        `}</style>
        <script dangerouslySetInnerHTML={{ __html: cacheBusterScript }} />
      </head>
      <body>
        {/* Accessibility: visible on keyboard Tab — pure CSS driven */}
        <a href="#dashboard-main" className="skip-link">
          Skip to dashboard
        </a>
        {children}
      </body>
    </html>
  );
}
