# Next.js + TypeScript Zero-Downtime Migration Plan

This plan migrates marketplace-store-fef91.web.app to Next.js in phases without breaking the current Firebase-hosted domain.

## Current State
- Live site remains in web_app and is deployed on Firebase Hosting.
- API remains in Cloud Functions under /api/**.
- New Next.js scaffold is in next_app.

## Phase 1: Side-by-Side Development (No Traffic Shift)
1. Develop new buyer pages in next_app.
2. Keep Firebase hosting public directory as web_app.
3. Reuse existing API endpoints (/api/recommendations, /api/products, /api/business).

## Phase 2: Route-by-Route Validation
1. Build and test these routes in Next app:
- /
- /business/[slug]
- /explore
- /favorites
2. Verify accessibility, privacy toggles, and analytics parity.
3. Keep web_app as production fallback.

## Phase 3: Canary Routing
1. Add a temporary Hosting rewrite for /next/** to Next app output.
2. Validate production traffic behavior for internal users.
3. Monitor API latency and client-side errors.

## Phase 4: Progressive Cutover
1. Move one route at a time from web_app to Next output.
2. Keep /api/** rewrite unchanged.
3. Keep old route fallback in web_app for instant rollback.

## Phase 5: Full Migration
1. Switch hosting public/rewrite to Next build output.
2. Keep web_app as rollback artifact for one release cycle.
3. Remove legacy assets after stability window.

## Rollback Safety
- Keep web_app deployable at all times.
- Never remove /api/** function rewrite.
- Revert only hosting config if issues appear.

## Commands
From next_app:
- npm install
- npm run dev
- npm run build

Deploy strategy:
- Continue deploying web_app until canary success criteria are met.
