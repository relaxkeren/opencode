#!/usr/bin/env pwsh
# Uninstall OpenCode Discord Bot Windows Service

param(
    [string]$ServiceName = "OpenCodeDiscordBot",
    [switch]$KeepLogs = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Discord Bot Service Uninstaller" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator. Please restart PowerShell as Admin."
    exit 1
}

# Check if service exists
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Warning "Service '$ServiceName' not found."
    exit 0
}

# Find NSSM
$NssmExe = "C:\ProgramData\chocolatey\bin\nssm.exe"
if (-not (Test-Path $NssmExe)) {
    $NssmInPath = Get-Command nssm -ErrorAction SilentlyContinue
    if ($NssmInPath) {
        $NssmExe = $NssmInPath.Source
    }
}

# Stop service
if ($service.Status -eq "Running") {
    Write-Host "Stopping service..." -NoNewline
    Stop-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 2
    Write-Host " OK" -ForegroundColor Green
}

# Remove service
Write-Host "Removing service..." -NoNewline
if (Test-Path $NssmExe) {
    & $NssmExe remove $ServiceName confirm 2>&1 | Out-Null
} else {
    # Fallback to sc.exe
    sc.exe delete $ServiceName | Out-Null
}
Write-Host " OK" -ForegroundColor Green

# Verify removal
$verifyService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($verifyService) {
    Write-Error "Failed to remove service. It may still exist."
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Service removed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

if (-not $KeepLogs) {
    $LogDir = "$env:USERPROFILE\.local\share\opencode\log"
    $response = Read-Host "Delete log files at $LogDir? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "Deleting log files..." -NoNewline
        Remove-Item -Path "$LogDir\discord-*.log" -ErrorAction SilentlyContinue
        Write-Host " OK" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "To reinstall:" -ForegroundColor Yellow
Write-Host "  .\script\install-service.ps1" -ForegroundColor Gray
Write-Host ""
