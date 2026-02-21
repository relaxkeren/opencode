#!/usr/bin/env pwsh
# Stop the opencode-discord bot

$ScriptDir = $PSScriptRoot
$PidFile = Join-Path $ScriptDir "opencode-discord.pid"

if (-not (Test-Path $PidFile)) {
    Write-Error "PID file not found. Bot may not be running."
    exit 1
}

$BotPid = Get-Content $PidFile -ErrorAction SilentlyContinue

if (-not $BotPid) {
    Write-Error "PID file is empty"
    Remove-Item $PidFile -Force
    exit 1
}

try {
    $Process = Get-Process -Id $BotPid -ErrorAction Stop
    Write-Host "Stopping bot with PID $BotPid..."
    Stop-Process -Id $BotPid -Force
    Write-Host "Bot stopped"
} catch {
    Write-Host "Process not found (may have already exited)"
}

Remove-Item $PidFile -Force
Write-Host "PID file removed"
