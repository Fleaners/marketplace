# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gst-badge.spec.ts >> GST badge rendering for sellers with and without GST
- Location: scripts\gst-badge.spec.ts:3:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
    - button [ref=e125] [cursor=pointer]: ×
    - generic [ref=e126]:
      - heading [level=2] [ref=e127]: Login
      - generic [ref=e128]:
        - generic [ref=e129]:
          - generic [ref=e130]: Name (for sellers/buyers)
          - textbox [ref=e131]:
            - /placeholder: Your full name
        - generic [ref=e132]:
          - generic [ref=e133]: Phone
          - textbox [ref=e134]:
            - /placeholder: Enter phone number
        - generic [ref=e135]: Email
        - textbox [ref=e136]:
          - /placeholder: name@company.com
        - generic [ref=e137]: Password
        - textbox [ref=e138]:
          - /placeholder: Create a password
        - generic [ref=e139]: Website (Optional)
        - textbox [ref=e140]:
          - /placeholder: https://example.com
        - generic [ref=e141]: Business Registration Number (Optional)
        - textbox [ref=e142]:
          - /placeholder: Registration number
        - generic [ref=e143]: Business Address (Optional)
        - textbox [ref=e144]:
          - /placeholder: Business address
        - generic [ref=e145]: Role
        - combobox [ref=e146]
        - generic [ref=e147]:
          - button [ref=e148] [cursor=pointer]: Send OTP
          - button [ref=e149] [cursor=pointer]: Login with OTP
          - button [ref=e150] [cursor=pointer]: Register
          - button [ref=e151] [cursor=pointer]: Switch to Register
        - button [ref=e153] [cursor=pointer]: Forgot Password?
        - button [ref=e155] [cursor=pointer]: Sign in with Google
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('GST badge rendering for sellers with and without GST', async ({ page }) => {
  4  |   await page.goto('/');
  5  | 
  6  |   // Simulate a seller profile with GST
  7  |   await page.evaluate(() => {
  8  |     const profile = {
  9  |       role: 'seller',
  10 |       businessName: 'GST Seller',
  11 |       gstNumber: '27AAACM1234A1Z5',
  12 |       whatsappVerified: true,
  13 |       verified: true
  14 |     };
  15 |     localStorage.setItem('mp_user', JSON.stringify(profile));
  16 |   });
  17 | 
  18 |   await page.reload();
  19 |   // Ensure the client renders the completion panels using the stored user profile
  20 |   await page.evaluate(() => {
  21 |     try {
  22 |       const profile = JSON.parse(localStorage.getItem('mp_user') || 'null');
  23 |       if (profile && typeof window.renderCompletionPanels === 'function') {
  24 |         window.renderCompletionPanels(profile);
  25 |       }
  26 |     } catch (e) {
  27 |       // ignore
  28 |     }
  29 |   });
  30 |   const badgeSelector = '.badge';
  31 |   await page.waitForTimeout(300);
  32 |   const badges = await page.$$eval(badgeSelector, els => els.map(e => e.textContent?.trim()));
> 33 |   expect(badges.some(b => b && b.includes('GST Verified'))).toBeTruthy();
     |                                                             ^ Error: expect(received).toBeTruthy()
  34 | 
  35 |   // Now simulate seller without GST
  36 |   await page.evaluate(() => {
  37 |     const profile = {
  38 |       role: 'seller',
  39 |       businessName: 'NoGST Seller',
  40 |       gstNumber: '',
  41 |       whatsappVerified: true,
  42 |       verified: true
  43 |     };
  44 |     localStorage.setItem('mp_user', JSON.stringify(profile));
  45 |   });
  46 |   await page.reload();
  47 |   await page.evaluate(() => {
  48 |     try {
  49 |       const profile = JSON.parse(localStorage.getItem('mp_user') || 'null');
  50 |       if (profile && typeof window.renderCompletionPanels === 'function') {
  51 |         window.renderCompletionPanels(profile);
  52 |       }
  53 |     } catch (e) {
  54 |       // ignore
  55 |     }
  56 |   });
  57 |   const badges2 = await page.$$eval(badgeSelector, els => els.map(e => e.textContent?.trim()));
  58 |   expect(badges2.some(b => b && b.includes('GST Verified'))).toBeFalsy();
  59 | });
```