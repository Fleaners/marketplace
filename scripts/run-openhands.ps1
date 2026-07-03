# OpenHands Task Runner for Marketplace Project
# Usage: ./scripts/run-openhands.ps1 -Task "Your task description"

param(
    [Parameter(Mandatory=$true)]
    [string]$Task,
    
    [Parameter(Mandatory=$false)]
    [string]$Model = "gpt-4",
    
    [Parameter(Mandatory=$false)]
    [int]$MaxIterations = 50,
    
    [Parameter(Mandatory=$false)]
    [switch]$Interactive = $false
)

# Check if OpenHands is installed
Write-Host "Checking OpenHands installation..." -ForegroundColor Cyan

try {
    $openhands = openhands --version 2>$null
    Write-Host "✓ OpenHands found: $openhands" -ForegroundColor Green
} catch {
    Write-Host "✗ OpenHands not found. Installing..." -ForegroundColor Yellow
    pip install openhands
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install OpenHands" -ForegroundColor Red
        exit 1
    }
}

# Check API key
if (-not $env:OPENAI_API_KEY) {
    Write-Host "✗ OPENAI_API_KEY environment variable not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:OPENAI_API_KEY='your_key_here'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ API key configured" -ForegroundColor Green

# Run OpenHands
Write-Host "Starting OpenHands agent..." -ForegroundColor Cyan
Write-Host "Task: $Task" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Gray

if ($Interactive) {
    # Interactive mode
    openhands `
        --task "$Task" `
        --config ".openhands.config.json"
} else {
    # Batch mode
    openhands `
        --task "$Task" `
        --config ".openhands.config.json" `
        --no-interactive
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "" -ForegroundColor Gray
    Write-Host "✓ Task completed successfully" -ForegroundColor Green
} else {
    Write-Host "" -ForegroundColor Gray
    Write-Host "✗ Task failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
