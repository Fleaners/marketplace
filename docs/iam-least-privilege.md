# IAM Least-Privilege Documentation

## Service Account Inventory

This project uses specific service accounts to enforce the principle of least privilege.

| Service Account | Description | Roles |
| :--- | :--- | :--- |
| Cloud Functions Runtime | Executing cloud functions | `roles/secretmanager.secretAccessor`, `roles/datastore.user`, `roles/logging.logWriter` |
| Cloud Scheduler | Invoking scheduled tasks | `roles/cloudfunctions.invoker` |
| CI/CD Pipeline | Automated deployments | `roles/firebase.admin` (deploy only, no runtime access) |
| AI Service | Accessing AI platform | `roles/aiplatform.user` |

## Environment Separation Strategy

Environments (Dev, Staging, Prod) are logically and physically separated using distinct Google Cloud projects and distinct Secret Manager namespaces.

- **Dev**: `dev-marketplace-proj` - Secrets prefixed with `DEV_` or within the dev project's Secret Manager.
- **Staging**: `staging-marketplace-proj` - Secrets prefixed with `STAGING_` or within the staging project's Secret Manager.
- **Prod**: `prod-marketplace-proj` - Secrets prefixed with `PROD_` or within the prod project's Secret Manager.

## Key Separation by Function

Keys and secrets are segregated by their functional domain to limit blast radius in case of compromise.
- **AI Keys**: Used strictly for Vertex AI / external AI API access.
- **Payment Keys**: Used exclusively for Stripe / payment gateway interactions.
- **Auth Keys**: Used for JWT signing and third-party OAuth providers.

## Rotation Policy

| Credential Type | Rotation Frequency | Method | Overlap Window |
| :--- | :--- | :--- | :--- |
| API Keys (External) | 90 Days | Automated / Manual | 24 Hours |
| Database Passwords | 180 Days | Automated | 1 Hour |
| Service Account Keys | 90 Days | Automated | 24 Hours |
| JWT Signing Keys | 30 Days | Automated | 12 Hours |

## IAM Configuration Commands

Use the following `gcloud` commands to configure the IAM bindings.

### 1. Cloud Functions Runtime SA
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:function-runtime@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:function-runtime@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:function-runtime@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

### 2. Cloud Scheduler SA
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:scheduler-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.invoker"
```

### 3. CI/CD Pipeline SA
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"
```

### 4. AI Service SA
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:ai-service-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```
