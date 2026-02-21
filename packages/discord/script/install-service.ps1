#!/usr/bin/env pwsh
# Install OpenCode Discord Bot as a Windows Service
# Requires NSSM (Non-Sucking Service Manager) - will download if not present

param(
    [string]$ServiceName = "OpenCodeDiscordBot",
    [string]$DisplayName = "OpenCode Discord Bot",
    [string]$Description = "OpenCode Discord Bot Service - AI coding assistant for Discord",
    [switch]$AutoStart = $true,
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$BotDir = Split-Path $Script:MyInvocation.MyCommand.Path -Parent | Split-Path -Parent
$NssmVersion = "2.24"
$NssmUrls = @(
    "https://nssm.cc/release/nssm-$NssmVersion.zip"
    "https://github.com/kirillkovalenko/nssm/releases/download/2.24/nssm-$NssmVersion.zip"
)
$NssmDir = "$env:TEMP\nssm-$NssmVersion"
$NssmExe = "$NssmDir\win64\nssm.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OpenCode Discord Bot Service Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator. Please restart PowerShell as Admin."
    exit 1
}

# Check if service already exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    if ($Force) {
        Write-Host "Service '$ServiceName' already exists. Stopping and removing..." -ForegroundColor Yellow
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        & $NssmExe remove $ServiceName confirm 2>$null
        if ($LASTEXITCODE -ne 0) {
            # Try sc.exe as fallback
            sc.exe delete $ServiceName | Out-Null
        }
        Start-Sleep -Seconds 2
    } else {
        Write-Error "Service '$ServiceName' already exists. Use -Force to reinstall or run uninstall-service.ps1 first."
        exit 1
    }
}

# Check for NSSM
Write-Host "Checking for NSSM..." -NoNewline

# First check if NSSM is already in PATH
$NssmInPath = Get-Command nssm -ErrorAction SilentlyContinue
if ($NssmInPath) {
    $NssmExe = $NssmInPath.Source
    Write-Host " FOUND IN PATH" -ForegroundColor Green
    Write-Host "  Location: $NssmExe" -ForegroundColor Gray
} elseif (Test-Path $NssmExe) {
    Write-Host " FOUND" -ForegroundColor Green
} else {
    Write-Host " NOT FOUND" -ForegroundColor Yellow
    Write-Host "Downloading NSSM $NssmVersion..." -ForegroundColor Yellow
    
    $ZipFile = "$env:TEMP\nssm-$NssmVersion.zip"
    $DownloadSuccess = $false
    
    foreach ($url in $NssmUrls) {
        try {
            Write-Host "  Trying $url..." -ForegroundColor Gray
            Invoke-WebRequest -Uri $url -OutFile $ZipFile -UseBasicParsing -TimeoutSec 30
            Expand-Archive -Path $ZipFile -DestinationPath $env:TEMP -Force
            Remove-Item $ZipFile -Force
            $DownloadSuccess = $true
            Write-Host "OK" -ForegroundColor Green
            break
        } catch {
            Write-Host "  Failed: $($_.Exception.Message)" -ForegroundColor Red
            continue
        }
    }
    
    if (-not $DownloadSuccess) {
        Write-Host ""
        Write-Warning "Failed to download NSSM automatically."
        Write-Host ""
        Write-Host "Quick fix - Install via Chocolatey:" -ForegroundColor Yellow
        Write-Host "  choco install nssm" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Or manual download:" -ForegroundColor Yellow
        Write-Host "  1. Go to: https://github.com/kirillkovalenko/nssm/releases" -ForegroundColor Cyan
        Write-Host "  2. Download: nssm-$NssmVersion.zip" -ForegroundColor Cyan
        Write-Host "  3. Extract to: $NssmDir" -ForegroundColor Cyan
        Write-Host "  4. Make sure this file exists: $NssmExe" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Then run this script again." -ForegroundColor Yellow
        exit 1
    }
}

# Check for bun
Write-Host "Checking for Bun..." -NoNewline
try {
    $null = Get-Command bun -ErrorAction Stop
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Error "Bun not found in PATH. Please install Bun first: https://bun.sh/"
    exit 1
}

# Check for opencode
Write-Host "Checking for OpenCode..." -NoNewline
try {
    $null = Get-Command opencode -ErrorAction Stop
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Error "OpenCode not found in PATH. Please install OpenCode first."
    exit 1
}

# Create log directory
$LogDir = "$BotDir\logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Prepare service configuration
Write-Host ""
Write-Host "Configuring service..." -ForegroundColor Cyan

# NSSM startup type: 2 = auto, 3 = manual, 4 = disabled
$StartMode = if ($AutoStart) { "2" } else { "3" }

# NSSM parameters
$NssmParams = @{
    Application = "bun"
    Arguments = "run", "src/index.ts"
    AppDirectory = $BotDir
    DisplayName = $DisplayName
    Description = $Description
    Start = $StartMode
    LogStdout = "$LogDir\service-out.log"
    LogStderr = "$LogDir\service-err.log"
    RotateFiles = 1
    RotateBytes = 10485760  # 10MB
}

Write-Host "  Service Name: $ServiceName" -ForegroundColor Gray
Write-Host "  Display Name: $DisplayName" -ForegroundColor Gray
Write-Host "  Start Mode: $StartMode" -ForegroundColor Gray
Write-Host "  Working Directory: $BotDir" -ForegroundColor Gray
Write-Host "  Log Directory: $LogDir" -ForegroundColor Gray
Write-Host ""

# Install service
Write-Host "Installing service..." -NoNewline
& $NssmExe install $ServiceName $NssmParams.Application ($NssmParams.Arguments -join " ") 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error " FAILED"
    exit 1
}
Write-Host " OK" -ForegroundColor Green

# Configure service parameters
Write-Host "Configuring service parameters..." -NoNewline
& $NssmExe set $ServiceName DisplayName $DisplayName 2>&1 | Out-Null
& $NssmExe set $ServiceName Description $Description 2>&1 | Out-Null
& $NssmExe set $ServiceName AppDirectory $BotDir 2>&1 | Out-Null
& $NssmExe set $ServiceName Start $StartMode 2>&1 | Out-Null
& $NssmExe set $ServiceName AppStdout $NssmParams.LogStdout 2>&1 | Out-Null
& $NssmExe set $ServiceName AppStderr $NssmParams.LogStderr 2>&1 | Out-Null
& $NssmExe set $ServiceName AppRotateFiles 1 2>&1 | Out-Null
& $NssmExe set $ServiceName AppRotateBytes 10485760 2>&1 | Out-Null

# Configure restart behavior
& $NssmExe set $ServiceName AppRestartDelay 3000 2>&1 | Out-Null  # 3 second delay
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
    Write-Host "Service installed but may not be running. Check logs at: $LogDir" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Service installed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Service Name: $ServiceName" -ForegroundColor Cyan
Write-Host "Status: $($service.Status)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Yellow
Write-Host "  Start:   Start-Service $ServiceName" -ForegroundColor Gray
Write-Host "  Stop:    Stop-Service $ServiceName" -ForegroundColor Gray
Write-Host "  Restart: Restart-Service $ServiceName" -ForegroundColor Gray
Write-Host "  Status:  Get-Service $ServiceName" -ForegroundColor Gray
Write-Host "  Logs:    Get-Content '$LogDir\service-out.log' -Tail 50" -ForegroundColor Gray
Write-Host "  Remove:  .\script\uninstall-service.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Windows Services GUI: services.msc" -ForegroundColor Gray
Write-Host ""
