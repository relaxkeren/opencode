#!/usr/bin/env pwsh
# Stop the opencode-discord bot

$ScriptDir = Split-Path $PSScriptRoot -Parent
$PidFile = Join-Path $ScriptDir "opencode-discord.pid"

if (-not (Test-Path $PidFile)) {
    Write-Error "PID file not found. Bot may not be running."
    exit 1
}

$Pid = Get-Content $PidFile -ErrorAction SilentlyContinue

if (-not $Pid) {
    Write-Error "PID file is empty"
    Remove-Item $PidFile -Force
    exit 1
}

try {
    $Process = Get-Process -Id $Pid -ErrorAction Stop
    Write-Host "Stopping bot with PID $Pid..."
    Stop-Process -Id $Pid -Force
    Write-Host "Bot stopped"
} catch {
    Write-Host "Process not found (may have already exited)"
}

Remove-Item $PidFile -Force
Write-Host "PID file removed"
