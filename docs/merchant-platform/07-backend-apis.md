# Backend APIs (Seller Platform)

## Auth and Profile
- POST /api/auth/login
- POST /api/auth/login/request-otp
- POST /api/auth/login/verify-otp
- GET /api/business/me
- PATCH /api/business/me

## Products
- GET /api/products
- POST /api/products
- GET /api/products/:id
- PUT /api/products/:id
- DELETE /api/products/:id
- POST /api/products/import/csv
- POST /api/products/import/excel
- POST /api/products/:id/duplicate
- POST /api/products/:id/pause
- POST /api/products/:id/share

## Messages and Buyer Interest
- GET /api/messages
- POST /api/messages/:threadId/reply
- GET /api/products/visits
- POST /api/products/:id/visits

## Insights and Analytics
- GET /api/insights/summary
- GET /api/insights/visitors
- GET /api/insights/top-products
- GET /api/insights/category-interest
- POST /api/analytics/events

## Marketplace Copilot
- GET /api/ai/suggestions
- POST /api/ai/analyze

## Help Center
- GET /api/help/articles
- POST /api/help/contact
