# Production Deployment Instructions

## 1. Local Validation
- Run backend tests
- Run functions lint/build checks
- Open web_app/seller-next.html locally

## 2. Environment Variables
Set for backend/functions:
- JWT_SECRET
- GOOGLE_CLIENT_ID
- PERPLEXITY_API_KEY (optional for copilot)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE

## 3. Deploy Functions
Use existing task:
- firebase-deploy-functions

## 4. Deploy Hosting
Use existing task:
- firebase-deploy-hosting

## 5. Smoke Checks
- GET /api/status returns healthy message
- Load homepage and seller-next page
- Verify login, product card rendering, insights cards

## 6. Analytics Verification
- Confirm GA4 events fire:
  - page_view
  - product_view
  - contact_seller
  - whatsapp_click
- Confirm event fields include city, device_type, traffic_source

## 7. Performance Targets
- Largest contentful paint under 2.5s mobile
- JavaScript payload under 250KB initial route for seller dashboard
- Interaction to next paint under 200ms for tab switches

## 8. Security
- Keep API keys out of repo
- Rotate exposed legacy keys
- Add rate limits for OTP and messaging endpoints
- Add audit logs for admin actions only
