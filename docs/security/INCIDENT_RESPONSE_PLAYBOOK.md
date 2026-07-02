# Incident Response Playbook

## Incident severity
- Sev1: Confirmed data breach or active compromise.
- Sev2: Security control bypass with high business impact.
- Sev3: Suspicious activity without confirmed compromise.

## Incident command roles
- Incident Commander: coordinates response and decisions.
- Security Lead: validates attack vectors and containment controls.
- Platform Lead: deploy rollback, routing, and infra mitigation.
- Communications Lead: stakeholder and customer updates.

## Response lifecycle
1. Detect and triage
- Confirm signal source, impact surface, and blast radius.

2. Contain
- Revoke tokens.
- Disable affected endpoints or features.
- Rotate exposed secrets.
- Enable stricter Cloudflare challenges/blocks for active vectors.

3. Eradicate
- Patch root cause.
- Remove malicious artifacts and access.

4. Recover
- Restore normal traffic gradually.
- Monitor for recurrence.
- Trigger staged rollback if indicators regress.

5. Communicate
- Internal stakeholders update cadence.
- User or regulator notifications where required.

6. Postmortem
- Root cause analysis.
- Corrective action list with owners and deadlines.

## SLA targets
- Sev1 acknowledgement: <= 15 minutes
- Sev2 acknowledgement: <= 30 minutes
- Sev3 acknowledgement: <= 4 hours

## Evidence and forensics
- Preserve request IDs, nonce/timestamp headers, and auth logs.
- Capture deployment hashes and config state at incident time.
- Maintain chain-of-custody notes for exported logs.

## Logging and evidence
- Preserve request logs, auth logs, and deployment logs.
- Preserve timeline with UTC timestamps.
- Track all containment and recovery actions.
