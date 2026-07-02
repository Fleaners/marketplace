param(
  [string]$EnvPath = "$PSScriptRoot\..\functions\.env"
)

Write-Host "Setting Firebase Functions secrets in $EnvPath" -ForegroundColor Cyan
Write-Host "Values are entered interactively and written to local functions/.env" -ForegroundColor Cyan

if (-not (Test-Path $EnvPath)) {
  New-Item -ItemType File -Path $EnvPath -Force | Out-Null
}

function Prompt-Secret([string]$name, [string]$default = "") {
  if ($default) {
    $prompt = "$name (leave blank to keep current)"
  } else {
    $prompt = "$name"
  }
  $secure = Read-Host -Prompt $prompt -AsSecureString
  $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  }
  finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
  if ([string]::IsNullOrWhiteSpace($plain)) { return $default }
  return $plain
}

function Prompt-Value([string]$name, [string]$default = "") {
  $enteredValue = Read-Host -Prompt "$name (leave blank to keep current: $default)"
  if ([string]::IsNullOrWhiteSpace($enteredValue)) { return $default }
  return $enteredValue
}

$current = @{}
Get-Content $EnvPath -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_ -match '^\s*#') { return }
  if ($_ -match '=') {
    $parts = $_.Split('=', 2)
    $current[$parts[0]] = $parts[1]
  }
}

$values = [ordered]@{}
$values['GOOGLE_CLIENT_ID'] = Prompt-Value 'GOOGLE_CLIENT_ID' ($current['GOOGLE_CLIENT_ID'])
$values['USE_FIREBASE_PHONE_AUTH'] = Prompt-Value 'USE_FIREBASE_PHONE_AUTH (true/false)' ($current['USE_FIREBASE_PHONE_AUTH'])
$values['JWT_SECRET'] = Prompt-Secret 'JWT_SECRET' ($current['JWT_SECRET'])
$values['SMTP_HOST'] = Prompt-Value 'SMTP_HOST' ($current['SMTP_HOST'])
$values['SMTP_PORT'] = Prompt-Value 'SMTP_PORT' ($current['SMTP_PORT'])
$values['SMTP_USER'] = Prompt-Value 'SMTP_USER' ($current['SMTP_USER'])
$values['SMTP_PASS'] = Prompt-Secret 'SMTP_PASS' ($current['SMTP_PASS'])
$values['SMTP_FROM'] = Prompt-Value 'SMTP_FROM' ($current['SMTP_FROM'])
$values['TWILIO_ACCOUNT_SID'] = Prompt-Value 'TWILIO_ACCOUNT_SID' ($current['TWILIO_ACCOUNT_SID'])
$values['TWILIO_AUTH_TOKEN'] = Prompt-Secret 'TWILIO_AUTH_TOKEN' ($current['TWILIO_AUTH_TOKEN'])
$values['TWILIO_FROM_PHONE'] = Prompt-Value 'TWILIO_FROM_PHONE' ($current['TWILIO_FROM_PHONE'])
$values['PERPLEXITY_API_KEY'] = Prompt-Secret 'PERPLEXITY_API_KEY' ($current['PERPLEXITY_API_KEY'])
$values['PERPLEXITY_AGENT_PRESET'] = Prompt-Value 'PERPLEXITY_AGENT_PRESET' ($current['PERPLEXITY_AGENT_PRESET'])
$values['PERPLEXITY_AGENT_MODEL'] = Prompt-Value 'PERPLEXITY_AGENT_MODEL' ($current['PERPLEXITY_AGENT_MODEL'])
$values['GA4_MEASUREMENT_ID'] = Prompt-Value 'GA4_MEASUREMENT_ID' ($current['GA4_MEASUREMENT_ID'])

$lines = @()
$values.GetEnumerator() | ForEach-Object {
  $lines += "{0}={1}" -f $_.Key, $_.Value
}

Set-Content -Path $EnvPath -Value $lines -Encoding UTF8
Write-Host "Updated $EnvPath" -ForegroundColor Green
Write-Host "Next: deploy functions and hosting to apply new values." -ForegroundColor Yellow
