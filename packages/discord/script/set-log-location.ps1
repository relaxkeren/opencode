#!/usr/bin/env pwsh
# Change Discord Bot log location to standard OpenCode log directory

param(
    [string]$ServiceName = "OpenCodeDiscordBot",
    [string]$LogDir = "$env:USERPROFILE\.local\share\opencode\log"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Updating Discord Bot Log Location" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator."
    exit 1
}

# Create log directory if it doesn't exist
if (-not (Test-Path $LogDir)) {
    Write-Host "Creating log directory: $LogDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

Write-Host "Log directory: $LogDir" -ForegroundColor Gray
Write-Host ""

# Find NSSM
$NssmExe = "C:\ProgramData\chocolatey\bin\nssm.exe"
if (-not (Test-Path $NssmExe)) {
    $NssmExe = "nssm"
}

# Check if service exists
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Error "Service '$ServiceName' not found."
    exit 1
}

# Stop service if running
if ($service.Status -eq "Running") {
    Write-Host "Stopping service..." -NoNewline
    Stop-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 2
    Write-Host " OK" -ForegroundColor Green
}

# Update log paths
Write-Host "Updating log configuration..." -ForegroundColor Cyan
& $NssmExe set $ServiceName AppStdout "$LogDir\discord-out.log" 2>&1 | Out-Null
& $NssmExe set $ServiceName AppStderr "$LogDir\discord-err.log" 2>&1 | Out-Null
& $NssmExe set $ServiceName AppRotateFiles 1 2>&1 | Out-Null
& $NssmExe set $ServiceName AppRotateBytes 10485760 2>&1 | Out-Null

Write-Host "  stdout: $LogDir\discord-out.log" -ForegroundColor Gray
Write-Host "  stderr: $LogDir\discord-err.log" -ForegroundColor Gray
Write-Host "  rotation: 10MB" -ForegroundColor Gray

# Start service
Write-Host ""
Write-Host "Starting service..." -NoNewline
Start-Service -Name $ServiceName
Start-Sleep -Seconds 3

$svc = Get-Service -Name $ServiceName
if ($svc.Status -eq "Running") {
    Write-Host " OK" -ForegroundColor Green
    Write-Host ""
    Write-Host "Logs will be written to:" -ForegroundColor Green
    Write-Host "  $LogDir\discord-out.log" -ForegroundColor Cyan
    Write-Host "  $LogDir\discord-err.log" -ForegroundColor Cyan
} else {
    Write-Host " FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  Get-Content '$LogDir\discord-out.log' -Tail 50" -ForegroundColor Gray
