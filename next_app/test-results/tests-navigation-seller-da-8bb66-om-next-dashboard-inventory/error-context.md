# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\navigation.spec.ts >> seller dashboard home navigation >> Home link navigates to the marketplace homepage from /next/dashboard/inventory
- Location: tests\navigation.spec.ts:19:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('button:has-text("Home")').first()
Expected: visible
Received: hidden

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('button:has-text("Home")').first()
    2 × locator resolved to <button id="bottomHomeBtn" class="bottom-nav-btn">…</button>
      - unexpected value "hidden"

```

```yaml
- banner:
  - link "marketplace-store-fef91.web.app home":
    - /url: "#"
    - img "marketplace-store-fef91.web.app"
  - paragraph: Premium B2B sourcing for verified trade buyers
  - text: Verified local businesses, transparent response times
  - button "Toggle larger text": Text size
  - button "Join as Seller"
  - button "Open account": Account
  - button "Login"
- text: Discover
- heading "Good Day, Guest 👋" [level=1]
- paragraph: Find trusted businesses and products near you.
- button "Search Products"
- button "Explore Businesses"
- text: Search products, businesses, categories...
- searchbox "Search products, businesses, categories..."
- button "Start voice search": Voice Search
- text: Image search coming soon
- combobox:
  - option "All Categories" [selected]
  - option "Electronics"
  - option "Mobiles"
  - option "Fashion"
  - option "Home & Kitchen"
  - option "Automotive"
  - option "Industrial"
  - option "Wholesale"
  - option "Services"
- combobox "Select state":
  - option "Any State" [selected]
- combobox:
  - option "Any Location" [selected]
  - option "Mumbai"
  - option "Delhi"
  - option "Bengaluru"
  - option "Chennai"
  - option "Hyderabad"
  - option "Pune"
  - option "Kolkata"
- button "Search Marketplace"
- strong: No checkout
- text: Explore, compare, connect
- region "Popular quick categories":
  - button "⚡ Electrical"
  - button "🏗 Construction"
  - button "🔩 Industrial"
  - button "🚜 Machinery"
  - button "🧰 Hardware"
  - button "📦 Wholesale"
- paragraph: Recommended For You
- heading "Discover trusted products to explore next" [level=2]
- button "Explore all"
- paragraph: Verified Businesses Near You
- heading "Trust-first suppliers with fast responses" [level=2]
- button "Visit stores"
- paragraph: Recently Viewed
- heading "Continue where you left off" [level=2]
- heading "Trending This Week" [level=3]
- heading "Marketplace AI Assistant" [level=3]
- article
- paragraph: Getting Started
- heading "Discover trusted businesses in three simple steps" [level=3]
- paragraph: Search by product or city, compare verified dealers, and contact directly via WhatsApp or inquiry.
- button "Start exploring"
- contentinfo:
  - paragraph: marketplace-store-fef91.web.app — Trusted B2B discovery for verified buyers and sellers.
  - link "About":
    - /url: /
  - link "Privacy Policy":
    - /url: /privacy.html
  - link "Terms of Service":
    - /url: /terms.html
  - link "Trust & Safety":
    - /url: /privacy.html
- button "💬"
```

```
Error: browserContext.close: Target page, context or browser has been closed
```