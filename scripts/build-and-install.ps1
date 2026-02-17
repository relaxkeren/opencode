# Build opencode from this repository and install to this Windows machine.
# Run from the repository root: .\scripts\build-and-install.ps1

$ErrorActionPreference = "Stop"

$REPO_ROOT = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location "$REPO_ROOT"

Write-Host "==> Installing dependencies..."
bun install

Write-Host "==> Building standalone executable..."
bun run packages/opencode/script/build.ts --single

$PLATFORM = "windows"
$ARCH = if ($env:PROCESSOR_ARCHITECTURE -eq "AMD64") { "x64" } else { "arm64" }

$DIST_DIR = "packages/opencode/dist/opencode-windows-${ARCH}"

$BINARY = "$DIST_DIR/bin/opencode.exe"
if (!(Test-Path "$BINARY")) {
    Write-Error "Build failed: binary not found at $BINARY"
    exit 1
}

$INSTALL_DIR = if ($env:OPENCODE_INSTALL_DIR) { $env:OPENCODE_INSTALL_DIR } else { "$env:USERPROFILE\.local\bin" }
New-Item -ItemType Directory -Force -Path "$INSTALL_DIR" | Out-Null

$pathDirs = $env:PATH -split ";"
if ($pathDirs -notcontains $INSTALL_DIR) {
    Write-Warning "$INSTALL_DIR is not in your PATH. Add to your profile: [Environment]::SetEnvironmentVariable('Path', `$env:Path + ';$INSTALL_DIR', 'User')"
}

Write-Host "==> Installing to $INSTALL_DIR..."
$targetPath = (Resolve-Path "$BINARY").Path
$linkPath = "$INSTALL_DIR\opencode.exe"
if (Test-Path "$linkPath") {
    Remove-Item "$linkPath" -Force
}
New-Item -ItemType SymbolicLink -Path "$linkPath" -Target "$targetPath" -Force | Out-Null

Write-Host "Done. Verify with: opencode --version"
