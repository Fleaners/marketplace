Set-Location "c:\Users\ELCOT\Documents\New folder\marketplace"

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Security

$vaultFile = Join-Path $env:USERPROFILE ".marketplace-secrets\marketplace-secrets.dpapi"
if (-not (Test-Path $vaultFile)) {
  throw "Secure vault not found at $vaultFile"
}

$confirm = Read-Host "Restore sensitive files from secure vault into workspace now? Type YES to continue"
if ($confirm -ne "YES") {
  Write-Output "Restore cancelled."
  exit 0
}

$encrypted = Get-Content $vaultFile -Raw
$protectedBytes = [Convert]::FromBase64String($encrypted)
$plainBytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
  $protectedBytes,
  $null,
  [System.Security.Cryptography.DataProtectionScope]::CurrentUser
)
$json = [System.Text.Encoding]::UTF8.GetString($plainBytes)
$payload = $json | ConvertFrom-Json -Depth 6

foreach ($entry in $payload.files.PSObject.Properties) {
  $target = $entry.Name
  $content = [string]$entry.Value
  $dir = Split-Path -Parent $target
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
  }
  Set-Content -Path $target -Value $content -Encoding UTF8
  Write-Output "Restored: $target"
}

Write-Output "Sensitive files restored from secure vault."
