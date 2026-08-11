#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

SKIP_INSTALL=0
if [[ "${1:-}" == "--skip-install" ]]; then
  SKIP_INSTALL=1
elif [[ $# -gt 0 ]]; then
  echo "Usage: $0 [--skip-install]" >&2
  exit 2
fi

if command -v pnpm >/dev/null 2>&1; then
  run_pnpm() {
    pnpm "$@"
  }
elif command -v corepack >/dev/null 2>&1; then
  echo 'pnpm was not found on PATH; using Corepack to provide pnpm.'
  run_pnpm() {
    corepack pnpm "$@"
  }
else
  echo 'pnpm was not found. Install Node.js with Corepack, run "corepack enable", or install pnpm.' >&2
  exit 1
fi

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo 'Installing dependencies from pnpm-lock.yaml...'
  run_pnpm install --frozen-lockfile
fi

echo 'Building the PWA...'
run_pnpm build:h5

OUTPUT_DIR="$PROJECT_ROOT/pwa-dist"
ENTRY_FILE="$OUTPUT_DIR/index.html"
if [[ ! -f "$ENTRY_FILE" ]]; then
  echo "PWA build completed but the expected output was not found: $ENTRY_FILE" >&2
  exit 1
fi

echo "PWA build completed: $OUTPUT_DIR"
