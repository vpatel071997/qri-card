#!/bin/bash
#
# setup.sh - Set up the QriCard project for local development.
#
# Usage: ./setup.sh
#
set -euo pipefail

# Move to the directory this script lives in, so it works from anywhere.
cd "$(dirname "$0")"

MIN_NODE_MAJOR=20

info()  { echo "==> $*"; }
warn()  { echo "WARN: $*" >&2; }
error() { echo "ERROR: $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Check prerequisites
# ---------------------------------------------------------------------------
info "Checking prerequisites..."

command -v node >/dev/null 2>&1 || error "Node.js is not installed. Please install Node.js v${MIN_NODE_MAJOR} or newer (https://nodejs.org)."
command -v npm  >/dev/null 2>&1 || error "npm is not installed. It normally ships with Node.js."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
    error "Node.js v${MIN_NODE_MAJOR} or newer is required (found $(node -v))."
fi

info "Node.js $(node -v) and npm $(npm -v) detected."

# ---------------------------------------------------------------------------
# 2. Install dependencies
# ---------------------------------------------------------------------------
info "Installing dependencies with 'npm ci'..."
if [ -f package-lock.json ]; then
    # 'npm ci' gives a clean, reproducible install from the lockfile.
    npm ci || {
        warn "'npm ci' failed. Falling back to 'npm install'."
        npm install
    }
else
    npm install
fi

# ---------------------------------------------------------------------------
# 3. Set up environment file
# ---------------------------------------------------------------------------
if [ -f .env.example ] && [ ! -f .env ]; then
    info "Creating .env from .env.example..."
    cp .env.example .env
fi

# ---------------------------------------------------------------------------
# 4. Verify the toolchain (lint check)
# ---------------------------------------------------------------------------
info "Verifying formatting with Prettier..."
npm run lint:check || warn "Some files are not formatted. Run 'npm run lint' to fix them."

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
cat <<'EOF'

Setup complete! 🎉

Next steps:
  npm start            Run the web app        -> http://localhost:3000
  npm test             Run the test suite
  npm run electron:dev Run as a desktop app
  npm run lint         Auto-format the code

Happy hacking!
EOF
