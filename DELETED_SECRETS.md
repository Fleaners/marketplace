# Deleted Secrets Registry

This document records secrets and API credentials that have been revoked, cleared, or removed from plaintext files within this repository.

## 1. NVIDIA API Key
- **Original Location**: `backend/.env` (untracked local file)
- **Status**: **Scrubbed & Cleared**
- **Action**: Removed the active key value from the environment configuration.

## 2. Plaintxt Secrets Check
- **Working Tree Scan**: Verified via Python-based scanner (`scripts/secret_scanner.py`) that no unignored secrets exist in the working directory.
- **Git History**: Commits containing historic placeholders have been verified to not contain active production credentials.
