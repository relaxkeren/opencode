#!/usr/bin/env pwsh
# Restart-aware launcher for opencode-discord bot

$BotDir = $PSScriptRoot
$RestartCode = 42

Write-Host "Starting opencode-discord bot (restart-aware)..."
Write-Host "Press Ctrl+C to stop"
Write-Host ""

while ($true) {
    & bun run src/index.ts
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq $RestartCode) {
        Write-Host "🔄 Restart requested. Reloading..."
        Start-Sleep -Seconds 2
        continue
    }
    
    if ($exitCode -ne 0) {
        Write-Host "❌ Bot exited with code: $exitCode"
    }
    break
}
