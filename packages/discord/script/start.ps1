#!/usr/bin/env pwsh
# Simple launcher for opencode-discord bot from source

$BotDir = Split-Path $PSScriptRoot -Parent
$PidFile = Join-Path $PSScriptRoot "opencode-discord.pid"

# Check if already running
if (Test-Path $PidFile) {
    $ExistingPid = Get-Content $PidFile -ErrorAction SilentlyContinue
    if ($ExistingPid) {
        try {
            $null = Get-Process -Id $ExistingPid -ErrorAction Stop
            Write-Host "Bot is already running with PID $ExistingPid"
            exit 1
        } catch {
            Remove-Item $PidFile -Force
        }
    }
}

# Check if bun is available
try {
    $null = Get-Command bun -ErrorAction Stop
} catch {
    Write-Error "'bun' not found in PATH"
    exit 1
}

# Check if opencode is in PATH
try {
    $null = Get-Command opencode -ErrorAction Stop
} catch {
    Write-Error "'opencode' not found in PATH"
    exit 1
}

Write-Host "Starting opencode-discord bot from source..."

# Start the bot using bun
$Process = Start-Process -FilePath "bun" -ArgumentList "run", "src/index.ts" -WorkingDirectory $BotDir -WindowStyle Hidden -PassThru

# Save PID
$Process.Id | Out-File $PidFile

# Quick health check
Start-Sleep -Milliseconds 500
if ($Process.HasExited) {
    Write-Error "Bot exited immediately (code: $($Process.ExitCode))"
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Bot started with PID: $($Process.Id)"
Write-Host "PID file: $PidFile"
Write-Host ""
Write-Host "To stop: .\stop-bot.ps1"
