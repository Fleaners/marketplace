# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seller-wizard.spec.ts >> Seller profile wizard enforces WhatsApp and allows optional GST
- Location: scripts\seller-wizard.spec.ts:3:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('#authSubmit')
    - locator resolved to <button type="button" id="authSubmit" class="button buttonPrimary">Register with Email</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - element is outside of the viewport
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - element is outside of the viewport
    - retrying click action
      - waiting 100ms
    99 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - element is outside of the viewport
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - banner [ref=e4]:
        - generic [ref=e5]:
          - link "marketplace-store-fef91.web.app home" [ref=e6] [cursor=pointer]:
            - /url: "#"
            - img "marketplace-store-fef91.web.app" [ref=e7]
          - paragraph [ref=e8]: Premium B2B sourcing for verified trade buyers
        - generic [ref=e9]:
          - generic [ref=e10]: Verified local businesses, transparent response times
          - button "Toggle larger text" [ref=e11] [cursor=pointer]: Text size
          - button "Join as Seller" [ref=e12] [cursor=pointer]
          - button "Open account" [ref=e13] [cursor=pointer]:
            - generic [ref=e14]: 👤
            - generic [ref=e15]: Account
          - button "Login" [ref=e16] [cursor=pointer]
      - generic [ref=e17]:
        - generic [ref=e18]:
          - generic [ref=e19]: Discover
          - heading "Good Evening, Gaurav 👋" [level=1] [ref=e20]
          - paragraph [ref=e21]: Find trusted businesses and products near you.
          - generic [ref=e22]:
            - button "Search Products" [ref=e23] [cursor=pointer]
            - button "Explore Businesses" [ref=e24] [cursor=pointer]
        - generic [ref=e25]:
          - generic [ref=e26]:
            - generic [ref=e27]:
              - generic [ref=e28]: Search products, businesses, categories...
              - searchbox "Search products, businesses, categories..." [ref=e29]
            - generic [ref=e30]:
              - button "Start voice search" [ref=e31] [cursor=pointer]: Voice Search
              - generic [ref=e32]: Image search coming soon
            - generic [ref=e33]:
              - combobox [ref=e34]:
                - option "All Categories" [selected]
                - option "Electronics"
                - option "Mobiles"
                - option "Fashion"
                - option "Home & Kitchen"
                - option "Automotive"
                - option "Industrial"
                - option "Wholesale"
                - option "Services"
              - combobox "Select state" [ref=e35]:
                - option "Any State" [selected]
                - option "Andhra Pradesh"
                - option "Arunachal Pradesh"
                - option "Assam"
                - option "Bihar"
                - option "Chhattisgarh"
                - option "Delhi"
                - option "Goa"
                - option "Gujarat"
                - option "Haryana"
                - option "Himachal Pradesh"
                - option "Jammu and Kashmir"
                - option "Jharkhand"
                - option "Karnataka"
                - option "Kerala"
                - option "Madhya Pradesh"
                - option "Maharashtra"
                - option "Manipur"
                - option "Meghalaya"
                - option "Mizoram"
                - option "Nagaland"
                - option "Odisha"
                - option "Punjab"
                - option "Rajasthan"
                - option "Sikkim"
                - option "Tamil Nadu"
                - option "Telangana"
                - option "Tripura"
                - option "Union Territories"
                - option "Uttar Pradesh"
                - option "Uttarakhand"
                - option "West Bengal"
              - combobox [ref=e36]:
                - option "Any Location" [selected]
                - option "Agartala"
                - option "Agra"
                - option "Ahmedabad"
                - option "Aizawl"
                - option "Ajmer"
                - option "Aligarh"
                - option "Allahabad"
                - option "Alwar"
                - option "Amaravati"
                - option "Ambala"
                - option "Amravati"
                - option "Amritsar"
                - option "Anand"
                - option "Asansol"
                - option "Aurangabad"
                - option "Ayodhya"
                - option "Bareilly"
                - option "Belagavi"
                - option "Bengaluru"
                - option "Bharatpur"
                - option "Bhatinda"
                - option "Bhilai"
                - option "Bhilwara"
                - option "Bhiwandi"
                - option "Bhopal"
                - option "Bhubaneswar"
                - option "Bikaner"
                - option "Bilaspur"
                - option "Bokaro"
                - option "Chandigarh"
                - option "Chennai"
                - option "Coimbatore"
                - option "Cuttack"
                - option "Dehradun"
                - option "Delhi"
                - option "Dhanbad"
                - option "Dibrugarh"
                - option "Dimapur"
                - option "Durgapur"
                - option "Erode"
                - option "Faridabad"
                - option "Gandhinagar"
                - option "Gangtok"
                - option "Gaya"
                - option "Ghaziabad"
                - option "Goa"
                - option "Gorakhpur"
                - option "Greater Noida"
                - option "Guntur"
                - option "Gurugram"
                - option "Guwahati"
                - option "Gwalior"
                - option "Haldwani"
                - option "Haridwar"
                - option "Hisar"
                - option "Hubballi"
                - option "Hyderabad"
                - option "Imphal"
                - option "Indore"
                - option "Itanagar"
                - option "Jabalpur"
                - option "Jaipur"
                - option "Jalandhar"
                - option "Jammu"
                - option "Jamnagar"
                - option "Jamshedpur"
                - option "Jhansi"
                - option "Jodhpur"
                - option "Jorhat"
                - option "Kakinada"
                - option "Kanpur"
                - option "Karimnagar"
                - option "Karnal"
                - option "Kochi"
                - option "Kohima"
                - option "Kolhapur"
                - option "Kolkata"
                - option "Kollam"
                - option "Kota"
                - option "Kozhikode"
                - option "Kurnool"
                - option "Lucknow"
                - option "Ludhiana"
                - option "Madurai"
                - option "Mangaluru"
                - option "Meerut"
                - option "Mohali"
                - option "Moradabad"
                - option "Mumbai"
                - option "Mysuru"
                - option "Nagpur"
                - option "Nanded"
                - option "Nashik"
                - option "Navi Mumbai"
                - option "Noida"
                - option "Panaji"
                - option "Patiala"
                - option "Patna"
                - option "Pimpri-Chinchwad"
                - option "Puducherry"
                - option "Pune"
                - option "Raipur"
                - option "Rajkot"
                - option "Ranchi"
                - option "Rourkela"
                - option "Salem"
                - option "Siliguri"
                - option "Srinagar"
                - option "Surat"
                - option "Thane"
                - option "Thiruvananthapuram"
                - option "Thrissur"
                - option "Tiruchirappalli"
                - option "Tirunelveli"
                - option "Tirupati"
                - option "Tiruppur"
                - option "Udaipur"
                - option "Udupi"
                - option "Ujjain"
                - option "Vadodara"
                - option "Varanasi"
                - option "Vellore"
                - option "Vijayawada"
                - option "Visakhapatnam"
                - option "Warangal"
            - button "Search Marketplace" [ref=e37] [cursor=pointer]
          - generic [ref=e39]:
            - strong [ref=e40]: No checkout
            - text: Explore, compare, connect
      - region "Popular quick categories" [ref=e41]:
        - button "⚡ Electrical" [ref=e42] [cursor=pointer]
        - button "🏗 Construction" [ref=e43] [cursor=pointer]
        - button "🔩 Industrial" [ref=e44] [cursor=pointer]
        - button "🚜 Machinery" [ref=e45] [cursor=pointer]
        - button "🧰 Hardware" [ref=e46] [cursor=pointer]
        - button "📦 Wholesale" [ref=e47] [cursor=pointer]
      - generic [ref=e49]:
        - generic [ref=e50]:
          - paragraph [ref=e51]: Recommended For You
          - heading "Discover trusted products to explore next" [level=2] [ref=e52]
        - button "Explore all" [ref=e53] [cursor=pointer]
      - generic [ref=e60]:
        - generic [ref=e61]:
          - paragraph [ref=e62]: Verified Businesses Near You
          - heading "Trust-first suppliers with fast responses" [level=2] [ref=e63]
        - button "Visit stores" [ref=e64] [cursor=pointer]
      - generic [ref=e65]:
        - generic [ref=e67]:
          - paragraph [ref=e68]: Recently Viewed
          - heading "Continue where you left off" [level=2] [ref=e69]
        - generic [ref=e72]:
          - heading "Your recently viewed items will appear here" [level=3] [ref=e73]
          - paragraph [ref=e74]: Start discovering products near your city.
        - generic [ref=e75]:
          - heading "Trending This Week" [level=3] [ref=e77]
          - generic [ref=e78]:
            - button "🔥 Copper Wires" [ref=e79] [cursor=pointer]
            - button "🔥 PVC Pipes" [ref=e80] [cursor=pointer]
            - button "🔥 Industrial Motors" [ref=e81] [cursor=pointer]
            - button "🔥 Construction Tools" [ref=e82] [cursor=pointer]
        - generic [ref=e83]:
          - heading "Marketplace AI Assistant" [level=3] [ref=e85]
          - article [ref=e86]:
            - heading "Looking for suppliers?" [level=3] [ref=e87]
            - paragraph [ref=e88]: I found 5 verified businesses near you.
            - generic [ref=e89]:
              - button "Most popular categories around you" [ref=e90] [cursor=pointer]
              - button "Recommended sellers with strong trust signals" [ref=e91] [cursor=pointer]
              - button "Trending products this week" [ref=e92] [cursor=pointer]
              - button "Fast responders for urgent inquiries" [ref=e93] [cursor=pointer]
      - generic [ref=e94]:
        - generic [ref=e95]:
          - paragraph [ref=e96]: Getting Started
          - heading "Discover trusted businesses in three simple steps" [level=3] [ref=e97]
          - paragraph [ref=e98]: Search by product or city, compare verified dealers, and contact directly via WhatsApp or inquiry.
        - button "Start exploring" [ref=e99] [cursor=pointer]
    - contentinfo [ref=e100]:
      - paragraph [ref=e101]: marketplace-store-fef91.web.app — Trusted B2B discovery for verified buyers and sellers.
      - generic [ref=e102]:
        - link "About" [ref=e103] [cursor=pointer]:
          - /url: /
        - link "Privacy Policy" [ref=e104] [cursor=pointer]:
          - /url: /privacy.html
        - link "Terms of Service" [ref=e105] [cursor=pointer]:
          - /url: /terms.html
        - link "Trust & Safety" [ref=e106] [cursor=pointer]:
          - /url: /privacy.html
  - button "💬" [ref=e107] [cursor=pointer]
  - navigation "Mobile navigation" [ref=e108]:
    - button "🏠 Home" [ref=e109] [cursor=pointer]:
      - generic [ref=e110]: 🏠
      - generic [ref=e111]: Home
    - button "🧭 Explore" [ref=e112] [cursor=pointer]:
      - generic [ref=e113]: 🧭
      - generic [ref=e114]: Explore
    - button "❤️ Favorites" [ref=e115] [cursor=pointer]:
      - generic [ref=e116]: ❤️
      - generic [ref=e117]: Favorites
    - button "💬 Messages" [ref=e118] [cursor=pointer]:
      - generic [ref=e119]: 💬
      - generic [ref=e120]: Messages
    - button "👤 Account" [ref=e121] [cursor=pointer]:
      - generic [ref=e122]: 👤
      - generic [ref=e123]: Account
  - generic [ref=e124]:
    - button "×" [ref=e125] [cursor=pointer]
    - generic [ref=e126]:
      - heading "Register with Email" [level=2] [ref=e127]
      - generic [ref=e128]:
        - generic [ref=e129]:
          - generic [ref=e130]: Name (for sellers/buyers)
          - textbox "Your full name" [ref=e131]
        - generic [ref=e132]:
          - generic [ref=e133]: Phone
          - textbox "Enter phone number" [ref=e134]: "9000000000"
        - generic [ref=e135]: Email
        - textbox "name@company.com" [ref=e136]
        - generic [ref=e137]: Password
        - textbox "Create a password" [ref=e138]
        - generic [ref=e139]: Business Name
        - textbox "Your business name" [ref=e140]: Test Seller Co
        - generic [ref=e141]: Category
        - textbox "e.g. Industrial Pumps" [ref=e142]
        - generic [ref=e143]: WhatsApp Number
        - textbox "Mandatory for sellers" [ref=e144]
        - generic [ref=e145]: Website (Optional)
        - textbox "https://example.com" [ref=e146]
        - generic [ref=e147]: Business Registration Number (Optional)
        - textbox "Registration number" [ref=e148]
        - generic [ref=e149]: Business Address (Optional)
        - textbox "Business address" [ref=e150]
        - generic [ref=e151]: Role
        - combobox [ref=e152]:
          - option "Buyer"
          - option "Seller" [selected]
        - generic [ref=e153]: GST Number (Optional)
        - 'textbox "GSTIN Example: 27AAACM1234A1Z5" [active] [ref=e154]'
        - paragraph [ref=e155]: Add later to receive a GST Verified badge.
        - generic [ref=e156]:
          - button "Send OTP to Register" [ref=e157] [cursor=pointer]
          - button "Register with Email" [ref=e158] [cursor=pointer]
          - button "Switch to Login" [ref=e159] [cursor=pointer]
        - button "Register with Google" [ref=e161] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Seller profile wizard enforces WhatsApp and allows optional GST', async ({ page }) => {
  4  |   await page.goto('/');
  5  |   await page.click('#navLoginBtn');
  6  |   await page.waitForSelector('#authDrawer', { state: 'visible' });
  7  | 
  8  |   // Switch to register mode and select seller
  9  |   await page.click('#authSwitch');
  10 |   await page.selectOption('#authRole', 'seller');
  11 | 
  12 |   // Leave WhatsApp empty and attempt to proceed with wizard
  13 |   await page.fill('#authBusinessName', 'Test Seller Co');
  14 |   await page.fill('#authPhone', '9000000000');
  15 |   await page.fill('#authGst', ''); // GST empty
> 16 |   await page.click('#authSubmit');
     |              ^ Error: page.click: Test timeout of 60000ms exceeded.
  17 | 
  18 |   // The client-side flow should alert or show an inline message; check that wizard enforces WhatsApp by not proceeding
  19 |   // Since alerts are used, intercept dialogs
  20 |   page.on('dialog', dialog => dialog.accept());
  21 | 
  22 |   // If profile wizard opens, ensure WhatsApp input is present and mandatory
  23 |   const wizard = page.locator('#profileWizardModal');
  24 |   if (await wizard.isVisible()) {
  25 |     // Try to click next without entering WhatsApp
  26 |     await page.click('#profileWizardNext');
  27 |     // Expect an alert was shown previously; ensure wizard still visible
  28 |     expect(await wizard.isVisible()).toBeTruthy();
  29 |   } else {
  30 |     // Otherwise check that registration did not complete by verifying user not stored
  31 |     const user = await page.evaluate(() => localStorage.getItem('mp_user'));
  32 |     expect(user === null).toBeTruthy();
  33 |   }
  34 | });
```