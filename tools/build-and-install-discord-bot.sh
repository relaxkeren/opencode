#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DISCORD_DIR="$REPO_ROOT/packages/discord"
LOCAL_BIN="$HOME/.local/bin"

echo "========================================"
echo "Build and Install Discord Bot"
echo "========================================"
echo ""

# Check for bun
echo -n "Checking for Bun... "
if ! command -v bun &> /dev/null; then
    echo "FAILED"
    echo "Bun not found. Please install Bun: https://bun.sh"
    exit 1
fi
echo "OK"

# Detect platform
OS="$(uname -s)"
case "$OS" in
    Darwin*)    PLATFORM="darwin" ;;
    Linux*)     PLATFORM="linux" ;;
    *)          echo "Unsupported platform: $OS"; exit 1 ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
    x86_64)     ARCH="x64" ;;
    aarch64|arm64)  ARCH="arm64" ;;
    *)          echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

echo "Platform: $PLATFORM"
echo "Architecture: $ARCH"
echo ""

# Navigate to discord package
cd "$DISCORD_DIR"

# Build the executable
echo -e "Building executable... \033[33m"
bun run script/build.ts --single
echo -e "\033[0m"

# Determine executable name
EXE_NAME="opencode-discord"
BUILD_DIR="$DISCORD_DIR/dist/opencode-discord-$PLATFORM-$ARCH"
SOURCE_EXE="$BUILD_DIR/bin/$EXE_NAME"

if [ ! -f "$SOURCE_EXE" ]; then
    echo "Build failed: $SOURCE_EXE not found"
    exit 1
fi

echo -e "Build successful: $SOURCE_EXE \033[32mOK\033[0m"
echo ""

# Create local bin directory if needed
if [ ! -d "$LOCAL_BIN" ]; then
    echo -n "Creating $LOCAL_BIN... "
    mkdir -p "$LOCAL_BIN"
    echo "OK"
fi

# Copy executable
echo -n "Installing to $LOCAL_BIN... "
cp -f "$SOURCE_EXE" "$LOCAL_BIN/$EXE_NAME"
chmod +x "$LOCAL_BIN/$EXE_NAME"
echo "OK"

# Verify installation
echo -n "Verifying installation... "
if command -v "$EXE_NAME" &> /dev/null; then
    VERSION="$("$EXE_NAME" --version 2>&1)"
    echo "OK"
    echo -e "  Version: $VERSION"
else
    echo "WARNING"
    echo -e "Binary installed but not in PATH. Add to PATH: $LOCAL_BIN"
fi

echo ""
echo "========================================"
echo -e "Installation Complete! \033[32m"
echo "========================================"
echo ""
echo -e "Binary location: \033[90m$LOCAL_BIN/$EXE_NAME\033[0m"
echo ""
echo -e "\033[33mUsage:\033[0m"
echo -e "  opencode-discord              # Run in production mode"
echo -e "  opencode-discord --dev        # Run in debug mode (verbose logging)"
echo -e "  opencode-discord --version    # Show version"
echo ""
