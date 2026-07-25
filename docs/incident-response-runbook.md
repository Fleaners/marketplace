# Incident Response Runbook

## 1. Suspected Key Leak

### Immediate Action: Revoke and Rotate Key
Identify the leaked key and immediately disable or rotate it.

```bash
# Disable a Secret Manager secret version
gcloud secrets versions disable VERSION_ID --secret="SECRET_NAME" --project="PROJECT_ID"

# Add a new secret version
echo -n "NEW_SECRET_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=- --project="PROJECT_ID"
```

### Audit Access Logs
Check Cloud Audit Logs for access to the compromised secret.

```bash
# Query Cloud Logging for Secret Manager access
gcloud logging read 'resource.type="secret_manager_secret" AND protoPayload.methodName="google.cloud.secretmanager.v1.SecretManagerService.AccessSecretVersion"' --limit=50 --project="PROJECT_ID"
```

### Assess Impact
Query Firestore to check for unauthorized reads or writes during the exposure window. Ensure audit logs are reviewed.

### Notify
Determine if the leak impacted user data. If PII or critical user data is exposed, follow the legal and compliance notification matrix to inform affected users within 72 hours.

## 2. Unusual API Usage

- **Detect:** Review alerts from `anomalyDetector` or Cloud Monitoring.
- **Investigate:** Identify the source IP or User ID causing the spike.
- **Mitigate:** Apply IP bans via Firebase App Check, Cloud Armor, or manually disable the user account.
```bash
# Example: Disable a user via Firebase Auth CLI
firebase auth:export accounts.json
# (Find and modify user, then re-import or use Admin SDK to disable)
```

## 3. Data Breach Suspicion

- **Containment:** Immediately restrict access to affected databases or storage buckets. Revert IAM roles to strict read-only if necessary.
- **Investigation:** Correlate Cloud Audit Logs, Firestore access logs, and HTTP request logs to determine the breach vector.
- **Remediation:** Patch the vulnerability, rotate all potentially compromised credentials, and restore known-good backups if data was tampered with.

## 4. Dependency Vulnerability

- **Triage:** Review Dependabot or CodeQL alerts weekly.
- **Action:** Update dependencies to patched versions.
- **Verify:** Run full test suite (`npm run test`) and deploy to staging.
- **Deploy:** Roll out the fix to production immediately for Critical/High severity issues.

## 5. Contact & Escalation Matrix

| Role | Name | Contact Info | Conditions for Escalation |
| :--- | :--- | :--- | :--- |
| Security Lead | [Name] | [Phone/Email] | Critical vulnerabilities, suspected breaches |
| DevOps Engineer| [Name] | [Phone/Email] | Infrastructure downtime, key rotation failures|
| Legal Counsel | [Name] | [Phone/Email] | PII exposure, compliance breaches |

## 6. Post-Incident Review

- **Incident Summary:** What happened and when.
- **Root Cause:** How did the incident occur.
- **Resolution:** Steps taken to mitigate the issue.
- **Action Items:** Preventive measures (e.g., new alerts, tighter IAM roles).
