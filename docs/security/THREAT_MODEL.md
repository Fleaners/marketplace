# Threat Model

## Scope
- Web frontend (`web_app`)
- API (`functions`)
- Data layer (Firestore + PostgreSQL)
- Edge controls (Cloudflare)
- CI/CD and source control

## Critical assets
- User identities and sessions
- Business profile data and invoices
- Authentication secrets and API keys
- Payment and invoice metadata

## Attack surfaces
- Public API endpoints
- Authentication and OTP workflows
- Product/message/invoice mutations
- Browser rendering and client scripts
- Build/deploy pipelines

## STRIDE summary

### Spoofing
- Risk: credential stuffing, token theft.
- Controls: rate limits, Argon2id, JWT short TTL, refresh token rotation, reCAPTCHA.

### Tampering
- Risk: payload manipulation, NoSQL operators.
- Controls: strict DTO allowlists, unknown field rejection, sanitizer blocking `$*` operators and prototype pollution.

### Repudiation
- Risk: lack of forensic evidence.
- Controls: request IDs, audit logs, timestamped structured events.

### Information Disclosure
- Risk: secret leakage, verbose errors, PII logs.
- Controls: redaction middleware, generic 5xx responses, secret scanning in CI.

### Denial of Service
- Risk: API flooding, logical protocol abuse.
- Controls: Cloudflare WAF, global + route rate limits, replay protection, request size/depth caps.

### Elevation of Privilege
- Risk: insecure role checks.
- Controls: RBAC permission gates, ownership checks, deny-by-default policy.

## Abuse cases to test continuously
- SSTI probes (`{{7*7}}`, `${7*7}`, `<%= process.env %>`)
- SQLi/NoSQLi payloads (`$where`, `$regex`, `' OR 1=1 --`)
- Replay requests with reused nonce
- OTP brute force
- XSS payloads in profile/post/product fields
- CSRF attempts with missing/mismatched token

## Residual risk
- In-memory nonce store is best-effort in serverless scale-out; for strict global replay guarantees, move nonce store to Redis/Firestore TTL collection.
- Trusted Types currently in report-only mode for compatibility; move to enforced mode after frontend policy rollout.
