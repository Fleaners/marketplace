# Premium Seller Dashboard — User Flows & Information Architecture

**Status:** LOOP 1 - Information Architecture  
**Last Updated:** 2026-07-03  
**Version:** 1.0.0

---

## Information Architecture (IA)

### Sitemap

```
/
├── (auth)
│   ├── /login                          # Email/Phone OTP login
│   ├── /signup                         # Business registration
│   ├── /onboarding                     # First-time setup wizard
│   └── /forgot-password                # Password recovery
│
├── (dashboard)
│   ├── /dashboard                      # Main KPI dashboard
│   │
│   ├── /products                       # Product management
│   │   ├── /products                   # Grid/Table view
│   │   ├── /products/[id]              # Product detail & edit
│   │   ├── /products/[id]/analytics    # Product-specific metrics
│   │   └── /products/import            # CSV/bulk upload
│   │
│   ├── /inventory                      # Inventory tracking
│   │   ├── /inventory                  # Live stock levels
│   │   ├── /inventory/forecasting      # Demand predictions
│   │   ├── /inventory/transfers        # Inter-warehouse moves
│   │   └── /inventory/alerts           # Stock threshold configs
│   │
│   ├── /orders                         # Order management
│   │   ├── /orders                     # Orders list/timeline
│   │   ├── /orders/[id]                # Order detail & tracking
│   │   ├── /orders/[id]/fulfillment    # Packing & shipping
│   │   └── /orders/returns             # Return requests
│   │
│   ├── /customers                      # Customer intelligence
│   │   ├── /customers                  # Customer directory
│   │   ├── /customers/[id]             # Customer profile & history
│   │   ├── /customers/segments         # Cohort analysis
│   │   └── /customers/lifetime-value   # CLV rankings
│   │
│   ├── /messages                       # Seller messaging
│   │   ├── /messages                   # Conversation list
│   │   └── /messages/[conversationId]  # Chat thread
│   │
│   ├── /analytics                      # Business intelligence
│   │   ├── /analytics/overview         # KPI dashboard
│   │   ├── /analytics/sales            # Revenue & trends
│   │   ├── /analytics/products         # Product performance
│   │   ├── /analytics/customers        # Customer insights
│   │   ├── /analytics/geography        # Regional breakdown
│   │   └── /analytics/reports          # Custom report builder
│   │
│   ├── /marketing                      # Marketing & promotions
│   │   ├── /marketing/campaigns        # Active campaigns
│   │   ├── /marketing/promotions       # Discount codes
│   │   └── /marketing/email            # Email templates
│   │
│   ├── /payments                       # Financial settings
│   │   ├── /payments/methods           # Bank/payment methods
│   │   ├── /payments/payouts           # Payout history
│   │   ├── /payments/statements        # Monthly statements
│   │   └── /payments/fees              # Fee breakdown
│   │
│   ├── /reviews                        # Review management
│   │   ├── /reviews                    # All reviews
│   │   ├── /reviews/[reviewId]         # Review detail & response
│   │   └── /reviews/templates          # Response templates
│   │
│   ├── /store-profile                  # Store configuration
│   │   ├── /store-profile/info         # Store name, logo, description
│   │   ├── /store-profile/branding     # Colors, assets
│   │   ├── /store-profile/hours        # Operating hours
│   │   └── /store-profile/policies     # Return, shipping, warranty
│   │
│   ├── /settings                       # Account & workspace
│   │   ├── /settings/account           # Email, password, MFA
│   │   ├── /settings/team              # Team members & roles
│   │   ├── /settings/workspace         # Workspace name, currency
│   │   ├── /settings/notifications     # Alert preferences
│   │   ├── /settings/integrations      # Connected services
│   │   └── /settings/billing           # Subscription, invoices
│   │
│   └── /ai-assistant                   # AI business intelligence
│       ├── /ai-assistant/home          # AI chat interface
│       └── /ai-assistant/insights      # Pre-generated recommendations
│
└── [marketplace pages remain]
```

---

## User Flows

### Flow 1: Complete Seller Registration & Onboarding

```
START
  ↓
[User visits app]
  ↓
[Choose: Login or Sign Up]
  ├─ EXISTING SELLER
  │   ├─ Enter email
  │   ├─ Request OTP (SMS/Email)
  │   ├─ Verify OTP
  │   ├─ [Load Dashboard]
  │   └─ END
  │
  └─ NEW SELLER
      ├─ Enter email
      ├─ Request OTP
      ├─ Verify OTP
      ├─ [Onboarding Wizard - Step 1: Business Info]
      │   ├─ Business name
      │   ├─ Industry/category
      │   ├─ Phone number
      │   └─ [NEXT]
      │
      ├─ [Onboarding Wizard - Step 2: Store Profile]
      │   ├─ Store name (public facing)
      │   ├─ Store logo upload
      │   ├─ Store description (for SEO)
      │   ├─ Website (optional)
      │   └─ [NEXT]
      │
      ├─ [Onboarding Wizard - Step 3: Settings]
      │   ├─ Currency (default: USD)
      │   ├─ Timezone
      │   ├─ Language
      │   ├─ Theme preference
      │   └─ [NEXT]
      │
      ├─ [Onboarding Wizard - Step 4: First Product]
      │   ├─ Product name
      │   ├─ Category
      │   ├─ Price
      │   ├─ SKU
      │   ├─ Images upload
      │   ├─ Description
      │   └─ [CREATE PRODUCT]
      │
      ├─ [Onboarding Complete]
      │   ├─ Show welcome tour
      │   ├─ Highlight key features
      │   └─ [GO TO DASHBOARD]
      │
      └─ END
```

### Flow 2: Daily Dashboard Workflow

```
START
  ↓
[User logs in]
  ↓
[Load Dashboard]
  ├─ Show KPI cards (revenue, orders, customers, etc.)
  ├─ Display charts (revenue trend, top products, etc.)
  ├─ Show notifications (new orders, messages, alerts)
  ├─ Highlight AI insights
  │
  └─ [USER CHOOSES ACTION]
      ├─ Action 1: CHECK ORDERS
      │   ├─ [Navigate to /orders]
      │   ├─ View order list (newest first)
      │   ├─ Filter by status
      │   ├─ Click order → see details + fulfillment options
      │   ├─ Mark as shipped, print label, etc.
      │   └─ Return to dashboard
      │
      ├─ Action 2: MANAGE PRODUCTS
      │   ├─ [Navigate to /products]
      │   ├─ View grid or table
      │   ├─ Search/filter by category
      │   ├─ Bulk edit price/stock
      │   ├─ Drag-and-drop to reorder
      │   ├─ Create new product
      │   └─ Return to dashboard
      │
      ├─ Action 3: CHECK MESSAGES
      │   ├─ [Navigate to /messages]
      │   ├─ View conversation list
      │   ├─ Click conversation
      │   ├─ View chat history
      │   ├─ AI suggests response
      │   ├─ Edit and send message
      │   └─ Return to dashboard
      │
      ├─ Action 4: REVIEW ANALYTICS
      │   ├─ [Navigate to /analytics]
      │   ├─ Select date range
      │   ├─ View charts (revenue, products, customers)
      │   ├─ Export report (CSV/PDF)
      │   └─ Return to dashboard
      │
      └─ [USER LOGS OUT]
          └─ END
```

### Flow 3: Create & Publish New Product

```
START (from /products)
  ↓
[Click "+ New Product" button]
  ↓
[Product Creation Form Opens]
  ├─ Basic Info
  │   ├─ Product name *
  │   ├─ Category *
  │   ├─ Subcategory (optional)
  │   └─ Description
  │
  ├─ Pricing & SKU
  │   ├─ SKU *
  │   ├─ Price *
  │   ├─ Cost per unit (for margin calculation)
  │   └─ Tax settings (if applicable)
  │
  ├─ Images
  │   ├─ Drag-and-drop or click to upload
  │   ├─ Primary image (required)
  │   ├─ Additional images (max 5)
  │   ├─ Crop/reposition
  │   └─ Generate AI descriptions from images (optional)
  │
  ├─ Inventory
  │   ├─ Stock quantity *
  │   ├─ Stock threshold alert
  │   └─ Multi-warehouse (if enabled)
  │
  ├─ SEO (optional)
  │   ├─ Meta title (auto-filled suggestion)
  │   ├─ Meta description
  │   ├─ Keywords
  │   └─ URL slug
  │
  ├─ Variants (if applicable)
  │   ├─ Add variant (size, color, etc.)
  │   ├─ Set variant prices & SKUs
  │   └─ Set variant stock levels
  │
  ├─ Review & Confirm
  │   ├─ Preview product
  │   ├─ AI suggestions for title, description
  │   └─ Check for required fields
  │
  ├─ [SAVE DRAFT] OR [PUBLISH]
  │   ├─ If DRAFT: Save and return to products list
  │   └─ If PUBLISH: Create product + show success notification
  │
  └─ END
```

### Flow 4: Fulfill an Order

```
START (from /orders)
  ↓
[User sees order notification or navigates to /orders]
  ↓
[Click on pending order]
  ↓
[Order Detail Page]
  ├─ Order info (ID, date, status, items)
  ├─ Customer details (name, address, phone)
  ├─ Items to ship (quantities, SKUs)
  │
  ├─ [PICK ITEMS]
  │   ├─ Scan/enter SKUs
  │   ├─ Confirm quantities
  │   └─ Mark items as picked
  │
  ├─ [PACK]
  │   ├─ Generate packing list
  │   ├─ Add items to box
  │   └─ Confirm packed
  │
  ├─ [SHIP]
  │   ├─ Select carrier (FedEx, UPS, etc.)
  │   ├─ Select service (2-day, overnight, etc.)
  │   ├─ Generate shipping label
  │   ├─ Print label
  │   ├─ Attach to package
  │   └─ Submit shipment
  │
  ├─ [TRACK]
  │   ├─ Shipping label created ✓
  │   ├─ Order marked as "shipped"
  │   ├─ Customer notified via email
  │   ├─ Tracking number shared
  │   └─ Real-time tracking shown
  │
  └─ END (Customer receives package)
```

### Flow 5: Analyze Customer Lifetime Value

```
START (from /customers)
  ↓
[Navigate to Customers section]
  ↓
[View Customer Directory]
  ├─ All customers with:
  │   ├─ Name, email, phone
  │   ├─ Total orders
  │   ├─ Total spent (LTV)
  │   ├─ Last purchase date
  │   └─ Repeat purchase rate
  │
  ├─ Filter/Sort Options
  │   ├─ Sort by LTV (highest first)
  │   ├─ Filter by country/region
  │   ├─ Filter by last purchase date
  │   └─ Search by name/email
  │
  ├─ [Click on high-value customer]
  │   ├─ View customer profile
  │   ├─ Purchase history (all orders)
  │   ├─ Product preferences
  │   ├─ Total spent & lifetime value
  │   ├─ Average order value (AOV)
  │   ├─ Geographic location
  │   │
  │   ├─ AI Recommendations
  │   │   ├─ "This customer loves product category X"
  │   │   ├─ "Recommend cross-sell products"
  │   │   └─ "Best time to email: Thursday evenings"
  │   │
  │   └─ Actions
  │       ├─ Send targeted email
  │       ├─ Offer discount
  │       ├─ Request review
  │       └─ Create support ticket
  │
  └─ END
```

### Flow 6: Leverage AI Business Assistant

```
START (from AI Assistant)
  ↓
[Navigate to /ai-assistant]
  ↓
[AI Home]
  ├─ Chat interface at center
  ├─ Pre-generated insights in sidebar
  │   ├─ "Inventory alert: 3 products low stock"
  │   ├─ "Revenue opportunity: Bundle top 3 products"
  │   ├─ "Customer churn risk: 5 customers inactive 30+ days"
  │   └─ "Demand forecast: Peak sales expected Friday"
  │
  ├─ [USER CHOOSES ACTION]
  │   ├─ Click insight → AI explains in detail
  │   ├─ Or type question in chat
  │   │
  │   └─ Example Queries:
  │       ├─ "What's my best-selling product?"
  │       ├─ "Which regions have the highest AOV?"
  │       ├─ "Recommend prices for these 5 products"
  │       ├─ "Show me customer retention trends"
  │       └─ "Draft an email to inactive customers"
  │
  ├─ [AI RESPONDS]
  │   ├─ Natural language answer
  │   ├─ Data-backed recommendations
  │   ├─ Actionable next steps
  │   └─ Optional: Quick action buttons
  │       ├─ "Apply recommendation"
  │       ├─ "Export report"
  │       └─ "Schedule action"
  │
  └─ END
```

---

## Navigation Mental Model

### Sidebar Structure (Primary Navigation)

```
┌─ DASHBOARD
├─ PRODUCTS
├─ INVENTORY
├─ ORDERS
├─ CUSTOMERS
├─ MESSAGES
├─ ANALYTICS
├─ MARKETING
├─ PAYMENTS
├─ REVIEWS
├─ STORE PROFILE
├─ SETTINGS
└─ AI ASSISTANT (always visible, prominent icon)
```

**Key Principles:**
1. **Business logic flow:** Left-to-right reading (top items = highest priority)
2. **Frequency of use:** Dashboard → Products → Orders → Customers → Analytics
3. **Grouping:** Operational (top) vs. Configuration (bottom)
4. **Mobile:** Bottom tab bar in mobile view (Dashboard, Products, Orders, Messages, Profile)

### Top Bar Quick Actions

```
┌─────────────────────────────────────────────┐
│ [🔍 Search] [🔔 Notifications] [💡 AI] [+] │
└─────────────────────────────────────────────┘
     ↓           ↓                ↓       ↓
   Search     Alerts          Insights Quick Add
  Products  Notifications   Business   Product
  Orders    Messages        Tips
```

---

## Page Layouts (Wireframes)

### Dashboard Main Page

```
┌──────────────────────────────────────────────────────────┐
│ Dashboard  [Date Picker: Last 30 Days]  [Refresh] [View] │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  [KPI Card: Revenue]  [KPI Card: Orders]  [KPI Card: Cust]│
│    $4,200.50            127 (↑12%)          856 (↑5%)     │
│                                                            │
│  [KPI Card: Conversion] [KPI Card: AOV]  [KPI Card: Stock]│
│    2.3% (↓0.5%)           $43.50            Good (89%)     │
│                                                            │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  [Revenue Trend Chart - Last 30 Days]    [Top Products]   │
│  $ ■■■■■■■■■■■■■■■■■                    1. Blue Widget   │
│    ■■■■■■■■■■■■■■■■                     2. Red Gadget    │
│                                          3. Black Unit    │
│                                                            │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  [AI Insights]                          [Recent Activity]  │
│  • Inventory alert: 3 items low         • Order #4721      │
│  • Revenue opportunity: Bundle top 3    • Customer joined  │
│  • Churn risk: 5 customers inactive     • Review posted    │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### Products Page

```
┌──────────────────────────────────────────────────────┐
│ Products  [+ Add Product] [Import CSV] [View: Grid] │
├───────────────────────────────────────────────────────┤
│ [Filter] [Search] [Sort By: Newest]                   │
├───────────────────────────────────────────────────────┤
│                                                        │
│ [Product Card]      [Product Card]      [Product Card]│
│ [Image]             [Image]             [Image]       │
│ Blue Widget         Red Gadget          Black Unit    │
│ SKU: BW-001         SKU: RG-002         SKU: BU-003   │
│ $29.99              $49.99              $99.99        │
│ Stock: 45 ✓         Stock: 0 ⚠️         Stock: 120 ✓  │
│ Sales: 234          Sales: 156          Sales: 89     │
│ Rating: 4.8 ⭐     Rating: 4.5 ⭐     Rating: 4.7 ⭐ │
│ [Edit] [Duplicate]  [Edit] [Duplicate]  [Edit] [Dup]  │
│                                                        │
└───────────────────────────────────────────────────────┘
```

### Orders Page

```
┌──────────────────────────────────────────────────────┐
│ Orders [Filter: All] [View: List]  [Export Orders]   │
├───────────────────────────────────────────────────────┤
│ Status: [All ▼] [Pending] [Processing] [Shipped] [Done]│
├───────────────────────────────────────────────────────┤
│                                                        │
│ Order   Customer      Items  Total    Status    Date  │
│ ────────────────────────────────────────────────────  │
│ #4729   John Smith    3      $127.50  Pending   2 hrs │
│ #4728   Jane Doe      1      $49.99   Shipped   4 hrs │
│ #4727   Bob Johnson   5      $289.95  Shipped   1 day │
│                                                        │
│ [Show more] or paginate                               │
│                                                        │
└───────────────────────────────────────────────────────┘
```

---

## Information Hierarchy Rules

### Dashboard (Main KPI View)
1. **Most visible:** Revenue (top-left)
2. **Then:** Orders, Customers, Conversion Rate
3. **Below:** Inventory Health, AOV, Best Seller
4. **Charts:** Revenue trend (primary), top products (secondary)
5. **Sidebar:** AI Insights, Recent Activity

### Products
1. **Most visible:** Product images + name + price
2. **Key metrics:** SKU, stock status (🟢🟠🔴), sales count, rating
3. **Actions:** Edit, Duplicate, Delete (right side or hover menu)
4. **Filtering:** Category, stock status, rating

### Orders
1. **Most visible:** Order ID, customer name, order total, status
2. **Timeline:** Show most recent first
3. **Status badges:** Color-coded (pending=🟡, shipped=🔵, delivered=🟢)
4. **Quick actions:** View details, mark shipped, print label

---

## Content Strategy

### Copy Tone
- **Supportive:** "You're doing great! 127 orders this month."
- **Clear:** "3 items running low—consider reordering."
- **Action-oriented:** "View recommendations" not "Recommendations available"
- **Professional:** No slang, but friendly and approachable

### Confirmations
- **After successful action:** Toast notification (bottom-right, 3 seconds)
- **Before destructive action:** Modal confirmation with clear warning
- **Error messages:** Inline, with specific guidance

### Onboarding Copy
- Step-by-step guidance
- Progressive disclosure (don't overwhelm)
- Celebrate milestones ("Your first product is live!")

---

## Next Steps

1. ✅ Information Architecture documented
2. ✅ User flows defined
3. ✅ Wireframes sketched
4. ⏳ Design mockups (Figma/Adobe XD)
5. ⏳ Stakeholder review & approval
6. ⏳ LOOP 2: Implementation begins

