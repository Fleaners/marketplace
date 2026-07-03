#!/usr/bin/env bash
# Helper script to purge a secret using git-filter-repo.
# WARNING: Destructive. Run only on a local mirror clone and after taking a backup.

if [ -z "$OLD_FIREBASE_API_KEY" ]; then
  echo "Set OLD_FIREBASE_API_KEY environment variable to the leaked key and rerun."
  echo "Example: export OLD_FIREBASE_API_KEY=ABCD1234..."
  exit 1
fi

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo not found. Install it first: pip install --user git-filter-repo"
  exit 1
fi

REPL_FILE="replacements.txt"
cat > "$REPL_FILE" <<EOF
$OLD_FIREBASE_API_KEY==>REDACTED-FIREBASE-API-KEY
EOF

echo "Running git-filter-repo with $REPL_FILE (mirror mode recommended)."
git filter-repo --replace-text "$REPL_FILE"

echo "Done. Inspect the repo, then push with --force --all and --force --tags when ready."
echo "Recommended: run this from a mirror clone and keep backups."
