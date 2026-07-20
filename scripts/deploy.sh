#!/usr/bin/env bash
# Builds the frontend, copies it into the shenron-docker checkout, and pushes -
# the NAS's git hook auto-deploys on push. See shenron-docker/CLAUDE.md
# "Tip Input" for why there's no build: step on the NAS side.
set -euo pipefail

TIP_INPUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHENRON_DOCKER_DIR="${SHENRON_DOCKER_DIR:-$HOME/dev/shenron-docker}"
COMMIT_MESSAGE="${1:-Update tip-input}"

if [ ! -d "$SHENRON_DOCKER_DIR/tip-input" ]; then
  echo "error: $SHENRON_DOCKER_DIR/tip-input not found (set SHENRON_DOCKER_DIR?)" >&2
  exit 1
fi

echo "==> Building $TIP_INPUT_DIR"
cd "$TIP_INPUT_DIR"
npm run build

echo "==> Copying dist/ into $SHENRON_DOCKER_DIR/tip-input"
rm -rf "$SHENRON_DOCKER_DIR/tip-input/dist"
cp -r "$TIP_INPUT_DIR/dist" "$SHENRON_DOCKER_DIR/tip-input/dist"

cd "$SHENRON_DOCKER_DIR"
git add tip-input/

if git diff --cached --quiet; then
  echo "==> No changes to deploy (dist/ output is identical to what's live)"
  exit 0
fi

git status --short

read -r -p "Push to shenron-docker now? This triggers a live NAS deploy. [y/N] " reply
if [[ ! "$reply" =~ ^[Yy]$ ]]; then
  echo "==> Committed locally in $SHENRON_DOCKER_DIR but not pushed. Run 'git push' there when ready."
  git commit -m "$COMMIT_MESSAGE"
  exit 0
fi

git commit -m "$COMMIT_MESSAGE"
git push
