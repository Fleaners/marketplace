# API Keys and Secrets Audit

This audit lists required keys, where they are used, and current availability status in this workspace.

## Available (configured in repo/local env)
- Firebase Web API key for frontend app config
  - Source: [web_app/app.js](web_app/app.js)
  - Note: Firebase web API key is not a server secret by design.
- Google OAuth Client ID for functions runtime
  - Source: [functions/.env](functions/.env)

### Fetched from Firebase CLI (2026-07-02)
- Web App IDs discovered:
  - [REDACTED]
  - [REDACTED]
- Firebase API key confirmed from sdkconfig output: present
- GA4 measurementId in sdkconfig output: not present for either app

## Present but placeholders or empty
- SMTP_HOST
- SMTP_PORT (default 587 set)
- SMTP_USER
- SMTP_PASS
- SMTP_FROM
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_FROM_PHONE
- PERPLEXITY_API_KEY (template in [.env.example](.env.example))

## Twilio requirement update
- Project is now configured to use Firebase phone auth mode (`USE_FIREBASE_PHONE_AUTH=true`).
- In this mode, Twilio keys are optional and not required for phone OTP login.
- Twilio remains optional fallback only if Firebase phone auth mode is disabled.

## Required for production (must be set in secure env)
- JWT_SECRET
- GOOGLE_CLIENT_ID
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_FROM
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_FROM_PHONE
- PERPLEXITY_API_KEY (only if AI copilot endpoint enabled)
- GA4 measurement ID (optional but needed for full analytics events)

## How to get missing keys
- Google OAuth Client ID: Google Cloud Console -> APIs & Services -> Credentials
- GA4 measurement ID: Google Analytics -> Admin -> Data Streams -> Web stream
  - If empty today, link GA4 to Firebase project first, then fetch again.
- Twilio keys: Twilio Console -> Account SID / Auth Token / Phone Number
- SMTP credentials: your mail provider transactional SMTP account
- Perplexity key: Perplexity developer dashboard
- JWT secret: generate locally and store in secure runtime secret manager

## Security recommendation
- Never commit secret values to git.
- Rotate any key that was previously committed in plain text.
- Keep environment values in deployment secrets, not source code.
