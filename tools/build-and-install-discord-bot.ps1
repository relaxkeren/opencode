#!/usr/bin/env pwsh
# Build and install Discord Bot executable
# Compatible with both PowerShell 5.1 and PowerShell 7+

$ErrorActionPreference = "Stop"

$RepoRoot = "C:\Users\Ke\repos\opencode"
$DiscordDir = "$RepoRoot\packages\discord"
$LocalBin = "$env:USERPROFILE\.local\bin"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build and Install Discord Bot" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for bun
Write-Host "Checking for Bun..." -NoNewline
$bun = Get-Command bun -ErrorAction SilentlyContinue
if (-not $bun) {
    Write-Error " FAILED`nBun not found. Please install Bun: https://bun.sh"
    exit 1
}
Write-Host " OK" -ForegroundColor Green

# Detect platform
$Platform = if ($env:OS -eq "Windows_NT") {
    "windows"
} else {
    "linux"
}

# Detect architecture using environment variable (compatible with all PowerShell versions)
$Arch = switch ($env:PROCESSOR_ARCHITECTURE) {
    "AMD64" { "x64" }
    "x86"   { "x64" }  # Assume x64 even on x86 Windows for simplicity
    "ARM64" { "arm64" }
    default { "x64" }  # Default to x64
}

# Also check PROCESSOR_ARCHITEW6432 for 32-bit PowerShell on 64-bit Windows
if ($env:PROCESSOR_ARCHITEW6432 -eq "AMD64") {
    $Arch = "x64"
}

Write-Host "Platform: $Platform" -ForegroundColor Gray
Write-Host "Architecture: $Arch" -ForegroundColor Gray
Write-Host ""

# Navigate to discord package
Set-Location $DiscordDir

# Build the executable
Write-Host "Building executable..." -ForegroundColor Yellow
& bun run script/build.ts --single 2>&1 | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Gray
}

# Determine executable name
$ExeName = "opencode-discord"
if ($Platform -eq "windows") {
    $ExeName += ".exe"
}

$BuildDir = "$DiscordDir\dist\opencode-discord-$Platform-$Arch"
$SourceExe = "$BuildDir\bin\$ExeName"

if (-not (Test-Path $SourceExe)) {
    Write-Error "Build failed: $SourceExe not found"
    exit 1
}

Write-Host "Build successful: $SourceExe" -ForegroundColor Green
Write-Host ""

# Create local bin directory if needed
if (-not (Test-Path $LocalBin)) {
    Write-Host "Creating $LocalBin..." -NoNewline
    New-Item -ItemType Directory -Path $LocalBin -Force | Out-Null
    Write-Host " OK" -ForegroundColor Green
}

# Copy executable
Write-Host "Installing to $LocalBin..." -NoNewline
Copy-Item -Path $SourceExe -Destination "$LocalBin\$ExeName" -Force
Write-Host " OK" -ForegroundColor Green

# Verify installation
Write-Host "Verifying installation..." -NoNewline
$installed = Get-Command opencode-discord -ErrorAction SilentlyContinue
if (-not $installed) {
    Write-Host " WARNING" -ForegroundColor Yellow
    Write-Host "Binary installed but not in PATH. Add to PATH: $LocalBin" -ForegroundColor Yellow
} else {
    $version = & opencode-discord --version 2>&1
    Write-Host " OK" -ForegroundColor Green
    Write-Host "  Version: $version" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Binary location: $LocalBin\$ExeName" -ForegroundColor Gray
Write-Host ""
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  opencode-discord              # Run in production mode" -ForegroundColor Gray
Write-Host "  opencode-discord --dev        # Run in debug mode (verbose logging)" -ForegroundColor Gray
Write-Host "  opencode-discord --version    # Show version" -ForegroundColor Gray
Write-Host ""
Write-Host "Windows Service:" -ForegroundColor Yellow
Write-Host "  cd packages/discord" -ForegroundColor Gray
Write-Host "  .\script\install-service.ps1   # Install as Windows Service" -ForegroundColor Gray
Write-Host ""
