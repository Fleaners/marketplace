GIT FILTER-REPO PURGE PLAN
=================================

Purpose
-------
Step-by-step plan to purge a leaked Firebase web API key from the git history using `git-filter-repo`.

Important: THIS IS DESTRUCTIVE. It rewrites history. Coordinate with your team, create backups, and do not run on the main repository without approval.

Summary of steps
----------------
1. Create a mirrored backup of the repository.
2. Create a `replacements.txt` file with the exact leaked key and the replacement token.
3. Run `git filter-repo --replace-text replacements.txt` in the mirror.
4. Inspect the mirror to confirm the key is removed.
5. Force-push the rewritten refs to the remote.
6. Rotate credentials and inform stakeholders to re-clone.

Detailed instructions
---------------------

1) Backup (create a mirror clone)

Replace `git@github.com:owner/repo.git` with your repo URL.

```bash
git clone --mirror https://github.com/OWNER/REPO.git repo-mirror.git
cd repo-mirror.git
```

2) Create `replacements.txt`

Create a file `replacements.txt` inside `repo-mirror.git` with the following format.
Do NOT commit this file to your repo; keep it local and delete it after the purge.

Content (example template):

# Replace the leaked Firebase Web API key with a redaction token
<OLD_FIREBASE_API_KEY>==>REDACTED-FIREBASE-API-KEY

Replace `<OLD_FIREBASE_API_KEY>` with the exact string of the leaked key (copy it from your repo or logs). The right-hand side can be any safe placeholder string.

3) Run git-filter-repo

Ensure `git-filter-repo` is installed. On many systems:

```bash
pip install --user git-filter-repo
# or on Debian/Ubuntu: sudo apt install git-filter-repo
```

Then run:

```bash
git filter-repo --replace-text replacements.txt
```

4) Verify

Search the rewritten mirror to confirm the old key is gone:

```bash
git grep "<partial-or-full-fragment-of-old-key>" $(git rev-list --all) || echo 'no matches'
```

Also inspect files and commits where the key previously appeared.

5) Force-push rewritten history to remote

Warning: This rewrites history for all branches. Coordinate with all collaborators and inform them to re-clone.

```bash
git push --force --all origin
git push --force --tags origin
```

6) Post-purge actions (required)

- Rotate the leaked Firebase API key immediately and replace it with the new key in your environment/CI. (Do NOT commit the new key.)
- Rotate any other secrets that may have been leaked.
- Update GitHub Actions / CI secrets and any server-side config that serves public config.
- Ask all collaborators to re-clone the repository: `git clone https://github.com/OWNER/REPO.git` (old local clones will have references to the old history).

Notes & rollback
----------------
- If you make a mistake, you still have the mirror backup `repo-mirror.git`. Do not delete it until you are fully satisfied.
- Some third-party services (like GH pages) may cache content; rotate or re-deploy them as needed.

Contact
-------
If you want, I can generate the exact `replacements.txt` content (with placeholders) and a small helper script — but I will NOT run the destructive commands myself. Run them locally when you're ready.
