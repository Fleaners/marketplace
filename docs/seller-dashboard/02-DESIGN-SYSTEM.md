# Premium Seller Dashboard — Design System & Component Library

**Status:** LOOP 1 - Design System Definition  
**Last Updated:** 2026-07-03  
**Version:** 1.0.0

---

## Design System Overview

This document defines the reusable UI primitives and components that form the foundation of the Premium Seller Dashboard. All components follow the luxury minimal aesthetic and support light/dark/auto themes.

---

## Core Principles

1. **Consistency:** Every component follows the same design language
2. **Accessibility:** All interactive elements meet WCAG AA standards
3. **Performance:** Components ship as lightweight, tree-shakeable modules
4. **Customization:** Props-based theming supports accent colors
5. **Documentation:** Every component includes usage examples
6. **Testability:** Components export data-testid attributes

---

## Design Tokens (Tailwind Configuration)

```javascript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Neutral palette (matte)
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },
        // Accent colors (configurable per business)
        accent: {
          50: '#F8FAFC',
          500: '#0F172A', // Primary Slate
          600: '#0C0E1A',
          700: '#0A0E1C',
          900: '#050812',
        },
      },
      fontSize: {
        'headline-1': ['32px', { lineHeight: '40px', fontWeight: '600' }],
        'headline-2': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.05)',
        sm: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        md: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        lg: '0 10px 15px rgba(0,0,0,0.15)',
        xl: '0 20px 25px rgba(0,0,0,0.2)',
        glass: 'inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      backdropBlur: {
        xs: 'blur(2px)',
        sm: 'blur(4px)',
        md: 'blur(8px)',
      },
    },
  },
}
```

---

## Core UI Components

### 1. Button
**Purpose:** Primary interactive element for actions

**Variants:**
- `primary`: Filled (accent color)
- `secondary`: Outlined (neutral border)
- `tertiary`: Ghost (text only)
- `danger`: Destructive actions (red)

**Sizes:** `sm`, `md`, `lg`

**States:** `default`, `hover`, `active`, `disabled`, `loading`

```tsx
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}

// Usage
<Button variant="primary" size="md">
  Create Product
</Button>
```

### 2. Card
**Purpose:** Container for grouped content

**Variants:**
- `elevated`: Box shadow
- `outlined`: Border only
- `ghost`: No border/shadow
- `glass`: Subtle glassmorphism

```tsx
export interface CardProps {
  variant?: 'elevated' | 'outlined' | 'ghost' | 'glass';
  hover?: boolean;
  className?: string;
  children: React.ReactNode;
}

// Usage
<Card variant="elevated" hover>
  <h3>Revenue</h3>
  <p>$4,200.50</p>
</Card>
```

### 3. Input
**Purpose:** Text entry field

**Types:** `text`, `email`, `number`, `password`, `search`

**States:** `default`, `focus`, `error`, `disabled`, `loading`

```tsx
export interface InputProps {
  type?: string;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  onChange?: (value: string) => void;
}

// Usage
<Input
  label="Product Name"
  placeholder="Enter product name"
  error="Name is required"
/>
```

### 4. Select / Dropdown
**Purpose:** Choose from predefined options

**Features:** Searchable, multi-select, grouping

```tsx
export interface SelectProps {
  label?: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  searchable?: boolean;
  disabled?: boolean;
}

// Usage
<Select
  label="Category"
  options={categories}
  onChange={setCategory}
  searchable
/>
```

### 5. Toggle
**Purpose:** Boolean on/off switch

```tsx
export interface ToggleProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

// Usage
<Toggle
  label="Enable notifications"
  checked={notificationsEnabled}
  onChange={setNotificationsEnabled}
/>
```

### 6. Badge
**Purpose:** Categorical labels and tags

**Variants:** `primary`, `success`, `warning`, `error`, `neutral`

**Sizes:** `sm`, `md`

```tsx
export interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

// Usage
<Badge variant="success">Active</Badge>
<Badge variant="warning" size="sm">Low Stock</Badge>
```

### 7. Tooltip
**Purpose:** Contextual help text on hover

```tsx
export interface TooltipProps {
  content: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  children: React.ReactNode;
}

// Usage
<Tooltip content="Total revenue after fees">
  <InfoIcon />
</Tooltip>
```

### 8. Modal / Dialog
**Purpose:** User confirmations and forms

```tsx
export interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  danger?: boolean;
  children: React.ReactNode;
}

// Usage
<Modal
  isOpen={showDeleteConfirm}
  title="Delete Product?"
  onConfirm={deleteProduct}
  confirmText="Delete"
  danger
>
  This action cannot be undone.
</Modal>
```

### 9. Toast / Notification
**Purpose:** Temporary feedback messages

**Types:** `success`, `error`, `warning`, `info`

```tsx
export interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
}

// Usage (from context)
const { showToast } = useToast();
showToast({ type: 'success', message: 'Product saved!' });
```

### 10. Skeleton / Loading
**Purpose:** Content placeholders while loading

```tsx
export interface SkeletonProps {
  className?: string;
  count?: number;
  circle?: boolean;
  height?: number;
}

// Usage
<Skeleton count={3} height={100} />
```

---

## Layout Components

### 1. Sidebar
**Purpose:** Primary navigation for dashboard

**Features:**
- Collapsible on tablet/mobile
- Active state indicators
- Icons + labels
- Nested groups (optional)
- Logout/user menu

```tsx
export interface SidebarProps {
  items: NavigationItem[];
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  user?: UserProfile;
  onLogout?: () => void;
}
```

### 2. TopBar
**Purpose:** Global actions and settings

**Contains:**
- Search input
- Notifications bell
- AI Insights quick access
- Quick "Add Product" button
- Seller profile dropdown

```tsx
export interface TopBarProps {
  user?: UserProfile;
  onSearch?: (query: string) => void;
  onNotifications?: () => void;
  unreadNotifications?: number;
}
```

### 3. PageHeader
**Purpose:** Page title and breadcrumbs

```tsx
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href: string }>;
  actions?: React.ReactNode;
}

// Usage
<PageHeader
  title="Products"
  breadcrumbs={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Products', href: '/dashboard/products' },
  ]}
  actions={<Button>Add Product</Button>}
/>
```

---

## Data Display Components

### 1. Table
**Purpose:** Display structured data with sorting, filtering

**Features:**
- Sortable columns
- Selectable rows
- Pagination
- Sticky header
- Empty states
- Loading skeletons

```tsx
export interface TableProps<T> {
  columns: Array<{
    key: keyof T;
    label: string;
    sortable?: boolean;
    render?: (value: any, row: T) => React.ReactNode;
  }>;
  data: T[];
  loading?: boolean;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
}
```

### 2. DataGrid / Virtual List
**Purpose:** Large dataset rendering (virtualization)

**For product lists, order history, etc. — handles 1000+ rows efficiently**

### 3. Chart Components
**Purpose:** Data visualization

**Types:**
- `LineChart`: Revenue trends, conversion rates
- `BarChart`: Category sales, regional breakdown
- `PieChart`: Market segmentation, product mix
- `AreaChart`: Cumulative metrics
- `HeatMap`: Geo distribution, weekly patterns

**Library:** Recharts or Chart.js

---

## Form Components

### 1. FormField
**Purpose:** Wrapper for label + input + error

```tsx
export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: React.ReactNode;
}

// Usage
<FormField label="Email" required error="Invalid email">
  <Input type="email" />
</FormField>
```

### 2. FileUpload
**Purpose:** Image/document upload with preview

**Features:**
- Drag & drop
- Image preview
- Progress bar
- Multiple file support

```tsx
export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  onUpload?: (files: File[]) => void;
  maxSize?: number;
}
```

### 3. RichEditor (Optional)
**Purpose:** Product descriptions, marketing copy

**Library:** Slate.js or TipTap

---

## Feedback Components

### 1. EmptyState
**Purpose:** When no data exists

```tsx
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Usage
<EmptyState
  title="No products yet"
  description="Create your first product to get started"
  action={{ label: 'Add Product', onClick: () => {} }}
/>
```

### 2. ErrorBoundary
**Purpose:** Catch and display errors gracefully

```tsx
export interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
  children: React.ReactNode;
}
```

### 3. ProgressBar
**Purpose:** Show completion or loading progress

```tsx
export interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
}
```

---

## Advanced Components

### 1. KPICard (Dashboard-specific)
**Purpose:** Display key business metrics

```tsx
export interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
  };
  icon?: React.ReactNode;
  onClick?: () => void;
}

// Usage
<KPICard
  title="Revenue"
  value="4,200.50"
  unit="USD"
  trend={{ direction: 'up', percentage: 12.5 }}
  icon={<DollarIcon />}
/>
```

### 2. ProductCard
**Purpose:** Mini product preview

```tsx
export interface ProductCardProps {
  product: Product;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}
```

### 3. TimeSeriesChart
**Purpose:** Revenue, orders over time

**Interactive features:**
- Hover tooltips
- Date range selector
- Comparison toggle (YoY)

### 4. CustomerTable
**Purpose:** Customer list with lifecycle indicators

---

## Interaction Patterns

### 1. Hover Effects
```css
/* Subtle elevation on card hover */
.card:hover {
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
  transition: all 200ms ease-out;
}
```

### 2. Loading States
```tsx
// Skeleton with Framer Motion fade-in
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  <Skeleton />
</motion.div>
```

### 3. Transitions
- **Page transitions:** 200ms fade
- **Modal entrance:** 150ms scale + fade
- **Notifications:** 300ms slide up + fade
- **Micro-interactions:** 100ms bounces

### 4. Empty States
- Large, friendly icons
- Clear call-to-action
- Contextual guidance

### 5. Error Recovery
- Inline error messages
- Retry buttons
- Success confirmation after action

---

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible (outline or background)
- [ ] Color contrast > 4.5:1 for text
- [ ] Icons always accompanied by text labels
- [ ] Form labels associated with inputs (`<label htmlFor>`)
- [ ] ARIA attributes for modals, tabs, collapsibles
- [ ] Alt text for all images
- [ ] Skip to main content link
- [ ] Semantic HTML structure

---

## Theme Implementation

### Light Theme (Default)
```tsx
const lightTheme = {
  background: 'bg-white',
  text: 'text-neutral-900',
  border: 'border-neutral-200',
  cardBackground: 'bg-neutral-50',
};
```

### Dark Theme
```tsx
const darkTheme = {
  background: 'bg-neutral-950',
  text: 'text-neutral-50',
  border: 'border-neutral-800',
  cardBackground: 'bg-neutral-900',
};
```

### Theme Context
```tsx
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  accentColor: '#0F172A',
  setTheme: () => {},
  setAccentColor: () => {},
});
```

---

## Component Inventory

| Category | Component | Status | Location |
|----------|-----------|--------|----------|
| **Forms** | Button | ⏳ | `components/ui/Button.tsx` |
| | Input | ⏳ | `components/ui/Input.tsx` |
| | Select | ⏳ | `components/ui/Select.tsx` |
| | Toggle | ⏳ | `components/ui/Toggle.tsx` |
| **Data** | Table | ⏳ | `components/ui/Table.tsx` |
| | Card | ⏳ | `components/ui/Card.tsx` |
| | Badge | ⏳ | `components/ui/Badge.tsx` |
| **Layout** | Sidebar | ⏳ | `components/layout/Sidebar.tsx` |
| | TopBar | ⏳ | `components/layout/TopBar.tsx` |
| | PageHeader | ⏳ | `components/layout/PageHeader.tsx` |
| **Feedback** | Modal | ⏳ | `components/ui/Modal.tsx` |
| | Toast | ⏳ | `components/ui/Toast.tsx` |
| | Skeleton | ⏳ | `components/ui/Skeleton.tsx` |
| **Dashboard** | KPICard | ⏳ | `components/dashboard/KPICard.tsx` |
| | ProductCard | ⏳ | `components/dashboard/ProductCard.tsx` |

---

## Next Steps

1. ✅ Component specifications defined
2. ⏳ Tailwind configuration updated
3. ⏳ Component implementation (LOOP 2)
4. ⏳ Storybook documentation
5. ⏳ Accessibility testing

