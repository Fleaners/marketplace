param(
    [string]$KeyPath = "$PSScriptRoot\service-account-key.json"
)

if (-not (Test-Path $KeyPath)) {
    Write-Error "Service account key file not found: $KeyPath"
    Write-Error "Either place the JSON key at $KeyPath or set GOOGLE_APPLICATION_CREDENTIALS to the key path."
    exit 1
}

$env:GOOGLE_APPLICATION_CREDENTIALS = (Resolve-Path $KeyPath).Path
Set-Location (Resolve-Path "$PSScriptRoot\..")

Write-Host "Using GOOGLE_APPLICATION_CREDENTIALS=$env:GOOGLE_APPLICATION_CREDENTIALS"
Write-Host "Deploying Cloud Functions to project marketplace-store-fef91..."

npx firebase deploy --only functions --project marketplace-store-fef91 --non-interactive
