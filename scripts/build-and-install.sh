#!/usr/bin/env bash
# Build opencode from this repository and install to this Mac.
# Run from the repository root: ./scripts/build-and-install.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Installing dependencies..."
bun install

echo "==> Building standalone executable..."
bun run packages/opencode/script/build.ts --single

PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
esac
if [[ "$PLATFORM" == "darwin" ]]; then
  DIST_DIR="packages/opencode/dist/opencode-darwin-${ARCH}"
else
  echo "Unsupported platform: $PLATFORM" >&2
  exit 1
fi

BINARY="$DIST_DIR/bin/opencode"
if [[ ! -f "$BINARY" ]]; then
  echo "Build failed: binary not found at $BINARY" >&2
  exit 1
fi

INSTALL_DIR="${OPENCODE_INSTALL_DIR:-$HOME/.local/bin}"
mkdir -p "$INSTALL_DIR"
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo "Warning: $INSTALL_DIR is not in your PATH. Add to ~/.zshrc: export PATH=\"\$HOME/.local/bin:\$PATH\"" >&2
fi

echo "==> Installing to $INSTALL_DIR..."
LINK="$INSTALL_DIR/opencode"
[[ -e "$LINK" ]] && rm -f "$LINK"
ln -sf "$REPO_ROOT/$BINARY" "$LINK"

echo "Done. Verify with: opencode --version"
