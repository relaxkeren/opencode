#!/usr/bin/env pwsh
# Uninstall OpenCode Discord Bot Windows Service

param(
    [string]$ServiceName = "OpenCodeDiscordBot",
    [switch]$KeepLogs = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$NssmVersion = "2.24"
$NssmDir = "$env:TEMP\nssm-$NssmVersion"
$NssmExe = "$NssmDir\win64\nssm.exe"
$LogDir = "$PSScriptRoot\..\logs"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OpenCode Discord Bot Service Uninstaller" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator. Please restart PowerShell as Admin."
    exit 1
}

# Check if NSSM exists
if (-not (Test-Path $NssmExe)) {
    # Try to find NSSM in common locations
    $PossiblePaths = @(
        "$env:ProgramFiles\nssm\nssm.exe",
        "$env:ProgramFiles(x86)\nssm\nssm.exe",
        "$env:SYSTEMDRIVE\nssm\nssm.exe"
    )
    
    foreach ($path in $PossiblePaths) {
        if (Test-Path $path) {
            $NssmExe = $path
            break
        }
    }
    
    if (-not (Test-Path $NssmExe)) {
        Write-Warning "NSSM not found. Will try sc.exe fallback."
    }
}

# Check if service exists
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Warning "Service '$ServiceName' not found. Nothing to uninstall."
    exit 0
}

Write-Host "Found service: $($service.DisplayName)" -ForegroundColor Yellow
Write-Host "Current status: $($service.Status)" -ForegroundColor Yellow
Write-Host ""

# Stop service if running
if ($service.Status -eq "Running") {
    Write-Host "Stopping service..." -NoNewline
    Stop-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 2
    
    # Double-check it's stopped
    $service = Get-Service -Name $ServiceName
    if ($service.Status -eq "Stopped") {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " WARNING" -ForegroundColor Yellow
        Write-Host "Service did not stop gracefully. Will force remove." -ForegroundColor Yellow
    }
} else {
    Write-Host "Service already stopped" -ForegroundColor Gray
}

# Remove service
Write-Host "Removing service..." -NoNewline
if (Test-Path $NssmExe) {
    & $NssmExe remove $ServiceName confirm 2>&1 | Out-Null
} else {
    # Fallback to sc.exe
    sc.exe delete $ServiceName 2>&1 | Out-Null
}

Start-Sleep -Seconds 2

# Verify removal
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Error "Could not remove service. You may need to remove it manually using 'sc.exe delete $ServiceName'"
    exit 1
}

# Clean up logs
if (-not $KeepLogs) {
    if (Test-Path $LogDir) {
        Write-Host "Removing log files..." -NoNewline
        Remove-Item -Path "$LogDir\service-*.log" -Force -ErrorAction SilentlyContinue
        Write-Host " OK" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Service uninstalled successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

if ($KeepLogs) {
    Write-Host "Log files preserved at: $LogDir" -ForegroundColor Gray
} else {
    Write-Host "Log files cleaned up" -ForegroundColor Gray
}

Write-Host ""
