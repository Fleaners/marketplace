# Premium Seller Dashboard — Architecture Blueprint

**Status:** LOOP 1 - Discovery & Architecture  
**Last Updated:** 2026-07-03  
**Version:** 1.0.0

---

## System Overview

### Vision
A world-class, enterprise-grade seller management platform inspired by Amazon Seller Central, Shopify Plus, Stripe Dashboard, and Google Material Design. The experience combines luxury minimal aesthetics with intelligent, real-time business intelligence.

### Tech Stack
- **Frontend:** Next.js 14+ (React 18) + TypeScript + Tailwind CSS + Framer Motion
- **Backend:** Firebase (Firestore, Cloud Functions, Cloud Storage)
- **Analytics:** Google Analytics 4 + Custom Events
- **Auth:** Firebase Authentication (Phone OTP, Google OAuth, Email)
- **Hosting:** Firebase Hosting
- **Testing:** Playwright (E2E) + Jest (Unit)
- **Performance Monitoring:** Firebase Performance, Sentry

### Design Philosophy
- **Aesthetic:** Luxury minimal with matte black/white/neutral + configurable accents
- **Interaction:** Subtle glassmorphism, enterprise micro-interactions, skeleton states
- **Hierarchy:** Clear information architecture with scannable layouts
- **Accessibility:** WCAG AA (minimum) with semantic HTML and screen reader support
- **Responsiveness:** Desktop-first progressive enhancement (desktop → tablet → mobile)

---

## System Architecture

### 1. Application Structure
```
next_app/
├── app/
│   ├── (auth)/                 # Auth flows (login, register, OTP)
│   ├── (dashboard)/
│   │   ├── dashboard/          # Main KPI dashboard
│   │   ├── products/           # Product management
│   │   ├── inventory/          # Inventory tracking
│   │   ├── orders/             # Order management
│   │   ├── customers/          # Customer insights
│   │   ├── messages/           # Seller messaging
│   │   ├── analytics/          # Business analytics
│   │   ├── marketing/          # Marketing tools
│   │   ├── payments/           # Payment settings
│   │   ├── reviews/            # Review management
│   │   ├── store-profile/      # Store configuration
│   │   └── settings/           # Account & workspace settings
│   ├── api/                    # API routes (helpers, not main logic)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── dashboard/              # Dashboard-specific components
│   ├── ui/                     # Core design system components
│   ├── layout/                 # Layout wrappers (Sidebar, TopBar)
│   └── marketplace/            # Existing marketplace
├── lib/
│   ├── firebase/               # Firebase utilities
│   ├── analytics/              # GA4 tracking
│   ├── auth/                   # Auth helpers
│   └── types/                  # TypeScript types
└── public/
    ├── icons/
    └── images/
```

### 2. Data Layer Architecture

**Authentication & Authorization**
- Firebase Auth handles user identity
- Custom JWT issued for API calls
- Role-based access control (RBAC):
  - `owner`: Full access
  - `admin`: Dashboard + settings
  - `seller`: Products + orders only
  - `viewer`: Analytics read-only

**Real-time Sync**
- Firestore listeners on user's products, orders, customers
- Cloud Functions trigger on data changes
- Incremental sync with offline-first service worker

**Caching Strategy**
- React Query for server state (optional)
- IndexedDB for product catalog (large datasets)
- localStorage for user preferences
- Browser cache headers for static assets (1 year)

### 3. Component Hierarchy

```
App
├── AuthGuard
│   └── DashboardLayout
│       ├── Sidebar (Navigation)
│       ├── TopBar (Search, Notifications, Profile)
│       └── ContentArea
│           └── [Page-Specific Components]
└── AuthPage (Login, Register)
```

### 4. State Management
- **Page State:** React `useState` (local)
- **Global State:** Context API + hooks (user, theme, permissions)
- **Server State:** React Query or SWR (server data sync)
- **Persistent State:** localStorage (user preferences, theme)

### 5. Error Handling
- Error boundaries wrap major sections
- Toast notifications for user feedback
- Sentry integration for error tracking
- Fallback UI states (skeleton, empty, error)

---

## Database Schema (Firestore)

### Collections

#### `users` collection
```json
{
  "uid": "string (Primary Key)",
  "email": "string (indexed)",
  "phone": "string (optional)",
  "displayName": "string",
  "photoURL": "string (optional)",
  "businessId": "string (reference to /businesses/{businessId})",
  "role": "enum (owner | admin | seller | viewer)",
  "status": "enum (active | suspended | archived)",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "lastLogin": "Timestamp (optional)"
}
```

#### `businesses` collection
```json
{
  "businessId": "string (Primary Key)",
  "name": "string (indexed)",
  "industry": "string",
  "storeName": "string",
  "phoneNumber": "string",
  "email": "string",
  "website": "string (optional)",
  "logoURL": "string (optional)",
  "description": "string",
  "foundedDate": "Timestamp",
  "status": "enum (active | suspended | trial | archived)",
  "settings": {
    "currency": "string (default: USD)",
    "timezone": "string",
    "language": "string",
    "theme": "enum (light | dark | auto)",
    "accentColor": "string (hex)"
  },
  "subscriptionTier": "enum (starter | professional | enterprise)",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

#### `products` subcollection (under `/businesses/{businessId}`)
```json
{
  "productId": "string (Primary Key)",
  "name": "string (indexed)",
  "description": "string",
  "category": "string (indexed)",
  "subcategory": "string (optional)",
  "sku": "string (unique per business)",
  "price": "number",
  "costPerUnit": "number",
  "margin": "number (calculated)",
  "images": ["string (URLs)"],
  "variants": [
    {
      "variantId": "string",
      "name": "string",
      "sku": "string",
      "price": "number",
      "stock": "number"
    }
  ],
  "stock": {
    "current": "number",
    "reserved": "number",
    "threshold": "number"
  },
  "status": "enum (active | draft | archived)",
  "visibility": "enum (public | private | unlisted)",
  "seoData": {
    "title": "string",
    "slug": "string (indexed)",
    "description": "string",
    "keywords": ["string"]
  },
  "analytics": {
    "totalViews": "number",
    "totalSales": "number",
    "rating": "number",
    "reviews": "number",
    "returns": "number"
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

#### `orders` subcollection (under `/businesses/{businessId}`)
```json
{
  "orderId": "string (Primary Key)",
  "buyerId": "string (reference to /users)",
  "items": [
    {
      "productId": "string",
      "productName": "string",
      "quantity": "number",
      "price": "number",
      "total": "number"
    }
  ],
  "status": "enum (pending | processing | shipped | delivered | returned | cancelled)",
  "subtotal": "number",
  "tax": "number",
  "shipping": "number",
  "total": "number",
  "shippingAddress": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zip": "string",
    "country": "string"
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

#### `customers` subcollection (under `/businesses/{businessId}`)
```json
{
  "customerId": "string (Primary Key)",
  "email": "string (indexed)",
  "phone": "string (optional)",
  "firstName": "string",
  "lastName": "string",
  "profileImage": "string (optional)",
  "purchaseHistory": {
    "totalOrders": "number",
    "totalSpent": "number",
    "lastPurchaseDate": "Timestamp"
  },
  "demographics": {
    "country": "string",
    "region": "string",
    "city": "string"
  },
  "preferences": {
    "preferredPaymentMethod": "string",
    "newsletter": "boolean"
  },
  "lifetime": {
    "value": "number",
    "firstPurchaseDate": "Timestamp",
    "repeatPurchaseRate": "number"
  },
  "createdAt": "Timestamp"
}
```

#### `messages` subcollection (under `/businesses/{businessId}`)
```json
{
  "conversationId": "string (Primary Key)",
  "participants": ["string (user IDs)"],
  "subject": "string (optional)",
  "lastMessage": {
    "text": "string",
    "timestamp": "Timestamp",
    "senderId": "string"
  },
  "unreadCount": "number",
  "messages": [
    {
      "messageId": "string",
      "senderId": "string",
      "text": "string",
      "attachments": ["string (URLs)"],
      "isAIResponse": "boolean",
      "timestamp": "Timestamp"
    }
  ],
  "createdAt": "Timestamp"
}
```

#### `analytics` subcollection (under `/businesses/{businessId}`)
```json
{
  "date": "string (YYYY-MM-DD, Primary Key)",
  "dayOfWeek": "number",
  "metrics": {
    "revenue": "number",
    "orders": "number",
    "customers": "number",
    "sessions": "number",
    "bounceRate": "number"
  },
  "products": {
    "views": "number",
    "topProducts": [
      {
        "productId": "string",
        "sales": "number",
        "revenue": "number"
      }
    ]
  },
  "geography": {
    "topCountries": [
      {
        "country": "string",
        "orders": "number"
      }
    ]
  }
}
```

---

## User Flows

### 1. Seller Onboarding
```
Sign Up
  ↓
Verify Email/Phone (OTP)
  ↓
Create Business Profile
  ↓
Add Store Logo & Description
  ↓
Configure Settings (Currency, Timezone)
  ↓
First Product Upload
  ↓
Dashboard Welcome Tour
  ↓
Ready to Sell
```

### 2. Daily Seller Workflow
```
Login
  ↓
View Dashboard KPIs
  ↓
Check Notifications (Orders, Messages)
  ↓
Quick Actions:
  - Add/Edit Products
  - Manage Orders
  - Review Messages
  - Check Analytics
  ↓
Make Decisions
  ↓
Logout
```

### 3. Inventory Management
```
Products Grid
  ↓
Low Stock Alert
  ↓
Set Reorder Level
  ↓
Auto-Generate Order
  ↓
Track Receipt
  ↓
Update Stock
```

### 4. Customer Communication
```
Messages Center
  ↓
View Conversation
  ↓
AI Assistant Suggests Response
  ↓
Edit & Send
  ↓
Track Response
```

---

## Wireframes & Layout Grids

### Desktop Layout (1400px+)
```
┌─────────────────────────────────────────────────┐
│                 Top Bar                         │
├──────────┬────────────────────────────────────┤
│          │                                    │
│ Sidebar  │      Main Content Area            │
│ (200px)  │      (fits responsive grid)       │
│          │                                    │
│          │                                    │
└──────────┴────────────────────────────────────┘
```

### Tablet Layout (768px - 1023px)
- Collapsible sidebar (hamburger menu)
- Single column content
- Larger touch targets

### Mobile Layout (< 768px)
- Full-screen sidebar drawer
- Stack all cards vertically
- Bottom navigation tabs

---

## Design Tokens

### Colors
**Neutrals:**
- `neutral-50`: #FAFAFA
- `neutral-100`: #F5F5F5
- `neutral-200`: #E5E5E5
- `neutral-900`: #111111
- `neutral-950`: #0A0A0A

**Accents (Configurable):**
- Primary: Slate blue (`#0F172A`)
- Success: Emerald (`#10B981`)
- Warning: Amber (`#F59E0B`)
- Error: Rose (`#EF4444`)

### Typography
- **Headline 1:** 32px / 40px (font-weight: 600)
- **Headline 2:** 24px / 32px (font-weight: 600)
- **Body Large:** 16px / 24px (font-weight: 400)
- **Body Regular:** 14px / 20px (font-weight: 400)
- **Small:** 12px / 16px (font-weight: 500)

### Spacing Scale
- 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

### Border Radius
- `xs`: 2px
- `sm`: 4px
- `md`: 8px
- `lg`: 12px
- `xl`: 16px

### Shadows
- `sm`: 0 1px 2px rgba(0,0,0,0.05)
- `md`: 0 4px 6px rgba(0,0,0,0.1)
- `lg`: 0 10px 15px rgba(0,0,0,0.15)
- `xl`: 0 20px 25px rgba(0,0,0,0.2)

---

## Performance Targets

### Lighthouse Scores
- Performance: **95+**
- Accessibility: **95+**
- Best Practices: **90+**
- SEO: **95+**

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 1.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Load Time Budgets
- JavaScript: < 150KB (gzipped)
- CSS: < 40KB (gzipped)
- Images: Lazy-loaded, WebP format
- Fonts: System fonts + 1 web font (max 2 weights)

---

## Deployment Pipeline

### 1. Development → Staging
- Merge to `staging` branch
- Automated tests run
- Deploy to Firebase staging environment

### 2. Staging → Production
- Manual approval
- Smoke tests execute
- Deploy to Firebase production
- Monitor error rates (1 hour)
- Rollback if >1% error rate

### 3. Monitoring & Observability
- Real-time error tracking (Sentry)
- Performance monitoring (Firebase Performance)
- GA4 event tracking
- Automated alerts (email + Slack)

---

## Security Architecture

### Authentication
- Firebase Auth handles identity verification
- JWTs issued with claims (role, business_id)
- Refresh tokens rotated every 7 days

### Authorization
- Row-level security in Firestore rules
- Client-side RBAC checks
- Server-side validation on all APIs

### Data Protection
- HTTPS only
- Encryption at rest (Firebase default)
- PII hashing for analytics
- GDPR-compliant data retention

### Infrastructure
- Firebase security rules enforce:
  - Users can only read their own business data
  - Products only readable by business members
  - Analytics only readable by business admins

---

## Success Metrics

### Business KPIs
- Time to first sale: < 48 hours
- Seller satisfaction: > 4.5/5
- Retention rate (30-day): > 70%
- Dashboard adoption: > 80%

### Technical KPIs
- Page load time: < 1.5s
- Uptime: > 99.9%
- Error rate: < 0.1%
- Accessibility score: > 95

---

## Next Steps (LOOP 1 → LOOP 2)

1. ✅ Architecture document (THIS)
2. ⏳ Database schema implementation
3. ⏳ Design system components (UI primitives)
4. ⏳ Authentication flow
5. ⏳ Dashboard layout shell

**Exit Criteria for LOOP 1:**
- Architecture approved by stakeholders
- Database schema validated
- Design tokens defined in Tailwind config
- Project structure initialized

