#!/usr/bin/env pwsh
# Install OpenCode Discord Bot as a Windows Service
# Uses NSSM only for service management, binary handles all logging

param(
    [string]$ServiceName = "OpenCodeDiscordBot",
    [string]$DisplayName = "OpenCode Discord Bot",
    [string]$Description = "OpenCode Discord Bot - AI coding assistant for Discord",
    [switch]$AutoStart = $true,
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Discord Bot Service Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator. Please restart PowerShell as Admin."
    exit 1
}

# Check for opencode-discord binary
Write-Host "Checking for opencode-discord binary..." -NoNewline
$binary = Get-Command opencode-discord -ErrorAction SilentlyContinue
if (-not $binary) {
    Write-Error " FAILED`nopencode-discord not found in PATH.`nPlease run: tools\build-and-install-discord-bot.ps1"
    exit 1
}
Write-Host " OK" -ForegroundColor Green
Write-Host "  Location: $($binary.Source)" -ForegroundColor Gray

# Check for NSSM
$NssmExe = "C:\ProgramData\chocolatey\bin\nssm.exe"
if (-not (Test-Path $NssmExe)) {
    $NssmInPath = Get-Command nssm -ErrorAction SilentlyContinue
    if ($NssmInPath) {
        $NssmExe = $NssmInPath.Source
    } else {
        Write-Host "NSSM not found. Installing via Chocolatey..." -ForegroundColor Yellow
        try {
            choco install nssm -y
            $NssmExe = "C:\ProgramData\chocolatey\bin\nssm.exe"
        } catch {
            Write-Error "Failed to install NSSM. Please install manually: choco install nssm"
            exit 1
        }
    }
}
Write-Host "NSSM: $NssmExe" -ForegroundColor Gray
Write-Host ""

# Check if service already exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    if ($Force) {
        Write-Host "Service '$ServiceName' already exists. Reinstalling..." -ForegroundColor Yellow
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        & $NssmExe remove $ServiceName confirm 2>&1 | Out-Null
        Start-Sleep -Seconds 2
    } else {
        Write-Error "Service '$ServiceName' already exists. Use -Force to reinstall."
        exit 1
    }
}

# Create log directory
$LogDir = "$env:USERPROFILE\.local\share\opencode\log"
if (-not (Test-Path $LogDir)) {
    Write-Host "Creating log directory..." -NoNewline
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    Write-Host " OK" -ForegroundColor Green
}

# NSSM startup type: SERVICE_AUTO_START = auto, SERVICE_DEMAND_START = manual
$StartMode = if ($AutoStart) { "SERVICE_AUTO_START" } else { "SERVICE_DEMAND_START" }

Write-Host "Configuring service..." -ForegroundColor Cyan
Write-Host "  Service Name: $ServiceName" -ForegroundColor Gray
Write-Host "  Display Name: $DisplayName" -ForegroundColor Gray
Write-Host "  Start Mode: $(if ($AutoStart) { 'Automatic' } else { 'Manual' })" -ForegroundColor Gray
Write-Host "  Binary: $($binary.Source)" -ForegroundColor Gray
Write-Host ""

# Install service
Write-Host "Installing service..." -NoNewline
& $NssmExe install $ServiceName $binary.Source 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error " FAILED"
    exit 1
}
Write-Host " OK" -ForegroundColor Green

# Configure service parameters
Write-Host "Configuring service..." -NoNewline
& $NssmExe set $ServiceName DisplayName $DisplayName 2>&1 | Out-Null
& $NssmExe set $ServiceName Description $Description 2>&1 | Out-Null
& $NssmExe set $ServiceName AppDirectory $env:USERPROFILE 2>&1 | Out-Null
& $NssmExe set $ServiceName Start $StartMode 2>&1 | Out-Null

# Note: NO log redirection - binary handles logging internally
# NSSM stdout/stderr not set = no redirection

# Set environment variables to ensure correct user home directory
$envString = "USERPROFILE=$env:USERPROFILE;HOMEDRIVE=C:;HOMEPATH=\Users\$($env:USERNAME)"
& $NssmExe set $ServiceName AppEnvironmentExtra $envString 2>&1 | Out-Null

# Configure restart behavior
& $NssmExe set $ServiceName AppRestartDelay 3000 2>&1 | Out-Null
Write-Host " OK" -ForegroundColor Green

# Configure service recovery (restart on failure)
Write-Host "Configuring failure recovery..." -NoNewline
sc.exe failure $ServiceName reset= 86400 actions= restart/3000/restart/6000/restart/10000 2>&1 | Out-Null
Write-Host " OK" -ForegroundColor Green

# Start service
Write-Host ""
Write-Host "Starting service..." -NoNewline
Start-Service -Name $ServiceName
Start-Sleep -Seconds 3

$service = Get-Service -Name $ServiceName
if ($service.Status -eq "Running") {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " WARNING" -ForegroundColor Yellow
    Write-Host "Service installed but may not be running. Check logs at: $LogDir\discord-out.log" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Service installed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Service Name: $ServiceName" -ForegroundColor Cyan
Write-Host "Status: $($service.Status)" -ForegroundColor Cyan
Write-Host "Log File: $LogDir\discord-out.log" -ForegroundColor Cyan
Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Yellow
Write-Host "  Start:   Start-Service $ServiceName" -ForegroundColor Gray
Write-Host "  Stop:    Stop-Service $ServiceName" -ForegroundColor Gray
Write-Host "  Restart: Restart-Service $ServiceName" -ForegroundColor Gray
Write-Host "  Status:  Get-Service $ServiceName" -ForegroundColor Gray
Write-Host "  Logs:    Get-Content '$LogDir\discord-out.log' -Tail 50" -ForegroundColor Gray
Write-Host "  Remove:  .\script\uninstall-service.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Discord Commands:" -ForegroundColor Yellow
Write-Host "  /session list  - List all sessions" -ForegroundColor Gray
Write-Host "  /log           - Show recent logs" -ForegroundColor Gray
Write-Host "  /stop          - Stop the bot" -ForegroundColor Gray
Write-Host "  /restart       - Restart the bot" -ForegroundColor Gray
Write-Host ""
