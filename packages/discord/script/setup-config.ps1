#!/usr/bin/env pwsh
# Setup Discord Bot configuration

$ErrorActionPreference = "Stop"

$ConfigDir = "$env:USERPROFILE\.config\opencode"
$ConfigFile = "$ConfigDir\discord-bot.json"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Discord Bot Configuration Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create config directory
if (-not (Test-Path $ConfigDir)) {
    Write-Host "Creating config directory: $ConfigDir" -ForegroundColor Gray
    New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
}

# Check if config already exists
if (Test-Path $ConfigFile) {
    Write-Host "Config file already exists: $ConfigFile" -ForegroundColor Yellow
    $overwrite = Read-Host "Overwrite? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Keeping existing config." -ForegroundColor Gray
        exit 0
    }
}

# Get Discord bot token
Write-Host ""
Write-Host "Please enter your Discord Bot Token:" -ForegroundColor Yellow
Write-Host "(Get this from https://discord.com/developers/applications)" -ForegroundColor Gray
$token = Read-Host -MaskInput "Discord Bot Token"

if (-not $token) {
    Write-Error "Token is required. Aborting."
    exit 1
}

# Create config
$config = @{
    enabled = $true
    token = $token
    dm = @{
        allowFrom = @()
        requirePairing = $true
    }
    guilds = @{}
    groupPolicy = "allowlist"
    commands = @{
        native = "auto"
    }
    mediaMaxMb = 8
    historyLimit = 100
    replyToMode = "off"
}

# Write config (without BOM)
$json = $config | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($ConfigFile, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Configuration saved!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Config location: $ConfigFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run the bot: opencode-discord" -ForegroundColor Gray
Write-Host "  2. Or install as service: .\script\install-service.ps1" -ForegroundColor Gray
Write-Host ""
