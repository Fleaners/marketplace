# Secure Coding Guidelines

## Non-negotiable rules
- Never trust user input.
- Reject unknown fields by default.
- No hardcoded credentials or API secrets.
- Use parameterized queries only.
- Escape/encode output before rendering in UI.
- Avoid `eval`, `Function`, and dynamic code execution.

## API design rules
- Validate request body, params, and query for every route.
- Enforce strict DTO schemas with allowlists.
- Apply auth + RBAC + ownership checks on protected routes.
- Use request IDs and write security audit logs.
- Return generic server errors; do not leak internals.

## Auth/session rules
- Access token max TTL: 15 minutes.
- Refresh token rotation mandatory.
- Revoke token family on suspicious activity.
- Require replay headers (`X-Timestamp`, `X-Nonce`) for sensitive mutations.

## Input and content handling
- Block NoSQL operators (`$gt`, `$ne`, `$where`, `$regex`, `$or`, `$and`).
- Block prototype pollution keys (`__proto__`, `constructor`, `prototype`).
- Enforce max payload depth and field lengths.
- Sanitize pasted and rich-text input with DOMPurify in frontend contexts.

## File upload rules
- Allow only jpg/jpeg/png/webp/pdf.
- Verify MIME type and extension.
- Enforce size limits.
- Run malware scan before persistent storage.
- Strip EXIF/metadata where applicable.

## Logging and privacy
- Never log passwords, tokens, OTPs, or secrets.
- Redact PII in structured logs.
- Keep logs tamper-evident and access-controlled.

## Dependency and pipeline standards
- Required CI gates: secret scan, SAST, dependency scan, container scan.
- Block merges on critical/high findings.
- Generate SBOM for each main-branch build.
