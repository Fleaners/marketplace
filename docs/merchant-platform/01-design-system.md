# marketplace-store-fef91.web.app Merchant Platform Design System

## Brand Direction
- Product name: marketplace-store-fef91.web.app
- Theme: Premium Minimal Commerce
- Principle: Simplicity on the surface. Intelligence underneath.

## Color Tokens
- Primary: #131921
- Accent: #FF9900
- Background: #F8FAFC
- Card: #FFFFFF
- Success: #16A34A
- Warning: #F59E0B
- Danger: #DC2626

## Semantic Aliases
- Text Primary: #0F172A
- Text Secondary: #64748B
- Border Subtle: #E2E8F0
- Focus Ring: #FF9900
- Surface Dark: #0B1220

## Typography
- Heading font: Sora SemiBold
- Body font: Inter Regular
- Numeric font: IBM Plex Mono

## Type Scale
- Display: 40/48
- H1: 32/40
- H2: 24/32
- H3: 20/28
- Body Large: 18/28
- Body: 16/24
- Caption: 13/20
- Micro: 12/16

## Spacing
- 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- Default card padding: 20
- Section spacing: 24 to 40

## Radius and Shadow
- Radius XS: 8
- Radius S: 12
- Radius M: 16
- Radius L: 20
- Radius XL: 28
- Card shadow: 0 12px 28px rgba(15, 23, 42, 0.08)

## Motion
- Fast: 120ms
- Standard: 180ms
- Emphasis: 240ms
- Easing: cubic-bezier(0.2, 0, 0, 1)
- Motion types:
  - Tap feedback
  - Card hover lift (web only)
  - Skeleton shimmer
  - Drawer slide up/down

## Iconography
- Rounded, 2px stroke
- Filled indicators only for status and alerts

## Data Language Rules
Use plain language labels:
- My Products
- Business Insights
- Sales This Month
- People Who Contacted You
- Customer Interest

Avoid technical labels:
- Funnel
- Conversion metrics
- Attribution model
- Event taxonomy

## Figma Tokens (JSON)
```json
{
  "color": {
    "primary": "#131921",
    "accent": "#FF9900",
    "bg": "#F8FAFC",
    "card": "#FFFFFF",
    "success": "#16A34A",
    "warning": "#F59E0B",
    "danger": "#DC2626"
  },
  "radius": { "s": 12, "m": 16, "l": 20 },
  "spacing": { "2": 8, "3": 12, "4": 16, "5": 20, "6": 24, "8": 32 },
  "typography": {
    "heading": "Sora",
    "body": "Inter",
    "numbers": "IBM Plex Mono"
  }
}
```
