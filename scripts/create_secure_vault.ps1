Set-Location "c:\Users\ELCOT\Documents\New folder\marketplace"

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Security

$vaultDir = Join-Path $env:USERPROFILE ".marketplace-secrets"
if (-not (Test-Path $vaultDir)) {
  New-Item -ItemType Directory -Path $vaultDir | Out-Null
}

$payload = [ordered]@{
  createdAt = (Get-Date).ToString("o")
  source = "marketplace workspace"
  files = @{}
}

$files = @(
  "functions/.env",
  "next_app/.env.local",
  "scripts/service-account-key.json"
)

foreach ($f in $files) {
  if (Test-Path $f) {
    $payload.files[$f] = Get-Content $f -Raw
  }
}

$json = $payload | ConvertTo-Json -Depth 6
$plainBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$protected = [System.Security.Cryptography.ProtectedData]::Protect(
  $plainBytes,
  $null,
  [System.Security.Cryptography.DataProtectionScope]::CurrentUser
)
$encrypted = [Convert]::ToBase64String($protected)
$vaultFile = Join-Path $vaultDir "marketplace-secrets.dpapi"
Set-Content -Path $vaultFile -Value $encrypted -Encoding UTF8
icacls $vaultFile /inheritance:r /grant:r "$env:USERNAME`:(F)" /grant:r "SYSTEM`:(F)" | Out-Null

Write-Output "Encrypted vault saved to $vaultFile"
