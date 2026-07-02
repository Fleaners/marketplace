# Cloudflare WAF Rules Template

Apply these controls in Cloudflare for marketplace-store-fef91.

## Managed protections
- Enable Cloudflare Managed WAF ruleset.
- Enable OWASP Core Ruleset.
- Enable Bot Fight mode.
- Enable DDoS managed protection.

## Route-level rate limits
- /api/auth/login: 5 requests per minute per IP.
- /api/auth/login/request-otp: 3 requests per minute per IP.
- /api/auth/login/verify-otp: 3 requests per minute per IP.
- /api/products (GET search): 60 requests per minute per IP.
- /api/products (POST): 10 requests per minute per user/IP.
- /api/messages/*/reply: 20 requests per minute per user/IP.
- /api/uploads: 5 requests per minute per user/IP.
- /api/admin/*: strict low limits and IP allow list only.

## Expression examples
- Block non-allowed countries for admin paths.
- Challenge bot score below threshold.
- Block requests matching SQLi/XSS signatures.
- Require managed challenge for repeated failed login fingerprints.
- Block requests missing required replay headers on sensitive endpoints.
- Block known bad ASNs/IP reputation feeds for abuse-heavy paths.

## Operational notes
- Start with challenge mode before hard block on uncertain rules.
- Keep exception list narrow and documented.
- Review WAF analytics weekly and tune noisy signatures.
