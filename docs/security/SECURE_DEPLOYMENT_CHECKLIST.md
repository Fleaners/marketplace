# Secure Deployment Checklist

## Pre-deploy
- [ ] `npm audit` passes at configured threshold.
- [ ] `security-ci.yml` jobs all green.
- [ ] No secrets in diff, logs, or bundles.
- [ ] Environment variables sourced from secret manager.
- [ ] CSP tested in report-only and enforced mode.

## API and auth
- [ ] `JWT_SECRET` is set and rotated.
- [ ] Access token TTL is 15m.
- [ ] Refresh token store is enabled and rotation tested.
- [ ] Rate limits configured for login/search/messages/product create/upload.
- [ ] Replay and CSRF defenses validated.

## Data and infra
- [ ] Firestore rules deny by default.
- [ ] PostgreSQL uses TLS and least-privileged roles.
- [ ] Backups encrypted and restore test passed.
- [ ] Cloudflare WAF and bot controls enabled.

## Monitoring and response
- [ ] Security audit logs enabled.
- [ ] Alerting configured for auth failures and spikes.
- [ ] Sentry and SIEM dashboards updated.
- [ ] Incident playbook contacts and roles are current.

## Post-deploy
- [ ] Run smoke tests for auth, product creation, messaging, invoices.
- [ ] Verify security headers on production domain.
- [ ] Review CSP violation reports.
- [ ] Confirm no new critical findings in scanner dashboards.
