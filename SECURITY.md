Security remediation and operational steps

1) Rotate Firebase API key (immediate)
- Go to Firebase Console -> Project Settings -> Web API keys.
- Regenerate the Web API key used by the project.
- Add HTTP referrer restrictions to the key (your domain(s) only).

2) Remove exposed keys from the repository (done partially)
- Inline public config in `web_app/index.html` has been removed.
- Note: build artifacts (Next.js `.next` / `out`) may contain the key. Regenerate a clean build locally and remove any committed build artifacts from the repo using `git rm --cached` or purge via `git filter-repo` if needed.

3) Purge leaked secrets from git history (if key was committed)
- If the leaked key must be considered compromised, rotate keys immediately and then purge history:
  - Install `git-filter-repo`.
  - Run:
    ```bash
    git filter-repo --invert-paths --paths "next_app/.next/" --force
    git filter-repo --path web_app/index.html --replace-text replacements.txt
    ```
  - See https://github.com/newren/git-filter-repo for safe usage.

4) Move public config to a server endpoint (recommended)
- The client already supports runtime loading via `/api/public/config` by calling `loadFirebasePublicConfig()` in `web_app/app.js`.
- Ensure your backend provides a `GET /api/public/config` that returns non-secret fields (apiKey, authDomain, projectId, storageBucket, measurementId) from environment variables at runtime.

5) CI/Secrets
- Store `FIREBASE_TOKEN`, service account JSON, and other secrets only in your CI secrets vault (GitHub Actions Secrets, or a secrets manager).
- Add secret-scan step in CI using `scripts/full-secret-scan.ps1` or `gitleaks`.

6) Local development
- Use `.env` files for local dev and ensure `.env` is present in `.gitignore` (already ignored).
- Keep a `.env.example` checked in with placeholder values.

7) Audit and monitoring
- Add Dependabot and CodeQL (already present in repo) and monitor alerts.
- Run a full secret-scan and add a pre-commit hook to prevent secrets from being committed.

If you want, I can:
- Remove committed Next.js build outputs that expose the key (I will not rewrite git history without your explicit approval).
- Create a small backend endpoint `functions/public-config` to serve the Firebase config from environment variables (and update hosting rules).
- Prepare `replacements.txt` with the exact patterns to replace if you approve purging history.

Next recommended step: rotate the API key now in Firebase Console and tell me when done; I will then remove any remaining references and optionally prepare the history purge steps (A+B).