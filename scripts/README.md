# Firebase CI Deploy Helper

This folder contains helper scripts for CI-friendly Firebase deployments.

## Service Account Deployment

1. Create a service account in the Google Cloud project:

```bash
# Replace PROJECT_ID with marketplace-store-fef91
gcloud iam service-accounts create firebase-ci-deployer \
  --description="Firebase CI deployer account" \
  --display-name="Firebase CI Deployer"
```

2. Grant the service account Cloud Functions deploy permissions:

```bash
gcloud projects add-iam-policy-binding marketplace-store-fef91 \
  --member="serviceAccount:firebase-ci-deployer@marketplace-store-fef91.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.admin"
```

Optionally add hosting permissions if you want to deploy hosting as well:

```bash
gcloud projects add-iam-policy-binding marketplace-store-fef91 \
  --member="serviceAccount:firebase-ci-deployer@marketplace-store-fef91.iam.gserviceaccount.com" \
  --role="roles/firebasehosting.admin"
```

3. Create a key file:

```bash
gcloud iam service-accounts keys create scripts/service-account-key.json \
  --iam-account=firebase-ci-deployer@marketplace-store-fef91.iam.gserviceaccount.com
```

4. Deploy from CI or locally:

```powershell
cd "c:\Users\ELCOT\Documents\New folder\marketplace"
$env:GOOGLE_APPLICATION_CREDENTIALS = "$(Resolve-Path scripts/service-account-key.json)"
npx firebase deploy --only functions --project marketplace-store-fef91 --non-interactive
```

Or use the helper script:

```powershell
cd "c:\Users\ELCOT\Documents\New folder\marketplace"
.\scripts\firebase-deploy-service-account.ps1
```

## Notes

- Do not commit `service-account-key.json` to source control.
- Add `scripts/service-account-key.json` to `.gitignore` if it is not already ignored.
