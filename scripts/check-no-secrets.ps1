$ErrorActionPreference = 'Stop'

$patterns = @(
  'AIza[0-9A-Za-z\-_]{35}',
  '(?i)jwt[_-]?secret\s*[=:]\s*["''][^"'']+["'']',
  '(?i)password\s*[=:]\s*["''][^"'']+["'']',
  '(?i)private[_-]?key',
  '(?i)database[_-]?url\s*[=:]\s*["''][^"'']+["'']',
  '(?i)cloudinary[_-]?(api[_-]?secret|url)\s*[=:]\s*["''][^"'']+["'']',
  '(?i)aws[_-]secret[_-]access[_-]key\s*[=:]\s*["''][^"'']+["'']',
  '(?i)refresh[_-]?token\s*[=:]\s*["''][^"'']+["'']',
  '(?i)service-account.*\.json',
  '(?i)twilio[_-]auth[_-]token\s*[=:]\s*["''][^"'']+["'']'
)

$files = git diff --cached --name-only
if (-not $files) {
  Write-Host 'No staged files to scan.' -ForegroundColor Cyan
  exit 0
}

$violations = @()
foreach ($file in $files) {
  if (-not (Test-Path $file)) { continue }
  if ((Get-Item $file).PSIsContainer) { continue }

  $content = Get-Content -Path $file -Raw -ErrorAction SilentlyContinue
  if (-not $content) { continue }

  foreach ($pattern in $patterns) {
    if ($content -match $pattern) {
      $violations += "Potential secret pattern '$pattern' in $file"
    }
  }
}

if ($violations.Count -gt 0) {
  Write-Host 'Secret scan failed:' -ForegroundColor Red
  $violations | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
  exit 1
}

Write-Host 'Secret scan passed.' -ForegroundColor Green
exit 0
