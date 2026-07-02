$required = @(
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'PERPLEXITY_API_KEY',
  'GA4_MEASUREMENT_ID'
)

$useFirebasePhoneAuth = [Environment]::GetEnvironmentVariable('USE_FIREBASE_PHONE_AUTH')
$twilioRequired = $true
if (-not [string]::IsNullOrWhiteSpace($useFirebasePhoneAuth) -and $useFirebasePhoneAuth.ToLower() -eq 'true') {
  $twilioRequired = $false
}

if ($twilioRequired) {
  $required += @(
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_FROM_PHONE'
  )
}

Write-Host "Required environment keys status:" -ForegroundColor Cyan
Write-Host "USE_FIREBASE_PHONE_AUTH=$useFirebasePhoneAuth" -ForegroundColor Cyan
if (-not $twilioRequired) {
  Write-Host "Twilio keys are optional because Firebase phone auth is enabled." -ForegroundColor Cyan
}

$missing = @()
foreach ($key in $required) {
  $value = [Environment]::GetEnvironmentVariable($key)
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Host "- $key : MISSING" -ForegroundColor Yellow
    $missing += $key
  } else {
    Write-Host "- $key : SET" -ForegroundColor Green
  }
}

if ($missing.Count -gt 0) {
  Write-Host "`nMissing keys count: $($missing.Count)" -ForegroundColor Yellow
  Write-Host "Set these in your deployment secret manager or environment before production rollout." -ForegroundColor Yellow
  exit 1
}

Write-Host "`nAll required keys are set." -ForegroundColor Green
exit 0
