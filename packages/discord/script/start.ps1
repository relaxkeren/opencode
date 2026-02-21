#!/usr/bin/env pwsh
# Launcher for opencode-discord bot from source with restart support

$BotDir = Split-Path $Script:MyInvocation.MyCommand.Path -Parent | Split-Path -Parent
$PidFile = Join-Path $Script:MyInvocation.MyCommand.Path "opencode-discord.pid"

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

# Exit code that signals restart
$RESTART_EXIT_CODE = 42

while ($true) {
    Write-Host "Starting opencode-discord bot from source..."

    # Start the bot using bun
    $Process = Start-Process -FilePath "bun" -ArgumentList "run", "src/index.ts" -WorkingDirectory $BotDir -WindowStyle Hidden -PassThru -Wait

    # Save PID
    $Process.Id | Out-File $PidFile

    # Wait for process to exit
    $Process.WaitForExit()
    $ExitCode = $Process.ExitCode

    # Remove PID file
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue

    # Check if restart was requested
    if ($ExitCode -eq $RESTART_EXIT_CODE) {
        Write-Host "🔄 Restart requested. Restarting bot..."
        Start-Sleep -Seconds 2
        continue
    }

    # Any other exit code means stop
    if ($ExitCode -ne 0) {
        Write-Host "Bot exited with code: $ExitCode"
    } else {
        Write-Host "Bot stopped normally."
    }
    break
}
