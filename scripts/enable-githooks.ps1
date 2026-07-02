Set-Location (Split-Path -Parent $PSScriptRoot)

git config core.hooksPath .githooks
Write-Host "Configured git hooks path: .githooks" -ForegroundColor Green
