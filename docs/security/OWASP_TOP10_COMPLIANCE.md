# OWASP Top 10 Compliance Matrix

| OWASP Category | Status | Implemented Controls |
|---|---|---|
| A01 Broken Access Control | In progress | JWT auth, RBAC permissions, ownership checks on resource routes |
| A02 Cryptographic Failures | In progress | Argon2id hashing, HTTPS/HSTS, short-lived JWT |
| A03 Injection | In progress | Input sanitizer, unknown field rejection, prepared statements policy |
| A04 Insecure Design | In progress | Threat model, security architecture, abuse-case controls |
| A05 Security Misconfiguration | In progress | Helmet, CSP, COOP/COEP/CORP, strict headers |
| A06 Vulnerable Components | In progress | npm audit, OWASP dependency-check, Dependabot, CodeQL |
| A07 Identification/Auth Failures | In progress | OTP limits, refresh rotation, token expiration, lockout strategy |
| A08 Software/Data Integrity Failures | In progress | CI security gates, CodeQL, secret scanning, SBOM |
| A09 Security Logging/Monitoring Failures | In progress | Structured security audit logs, request IDs, alert pipeline |
| A10 SSRF | Partial | Outbound provider allowlisting recommended in egress layer |

## Verification checklist
- [ ] All mutation routes enforce auth + authorization.
- [ ] All mutation routes reject unknown fields.
- [ ] Replay headers validated on sensitive endpoints.
- [ ] CSRF defense active for cookie-based browser state changes.
- [ ] Access tokens expire in <= 15 minutes.
- [ ] Refresh tokens are rotated and revoked on use.
- [ ] Secret scanning passes in CI.
- [ ] Dependency critical/high issues blocked in CI.
- [ ] CSP violations monitored and tuned.
- [ ] Incident runbook tested quarterly.
