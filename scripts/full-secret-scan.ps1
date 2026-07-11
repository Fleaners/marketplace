$ErrorActionPreference = 'Stop'

$root = "c:\Users\ELCOT\Documents\New folder\marketplace"
Set-Location $root

# Scan source and configuration files that should never contain secrets.
$includeRoots = @(
  '.github',
  'backend',
  'functions',
  'next_app',
  'scripts',
  'web_app',
  'docs'
)

$skipPathFragments = @(
  '\.git\',
  '\node_modules\',
  '\.next\',
  '\next_app\out\',
  '\web_app\next\',
  '\test-results\',
  '\playwright-report\'
)

$skipExtensions = @(
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
  '.pdf', '.zip', '.gz', '.tar', '.7z', '.jar', '.keystore',
  '.ttf', '.woff', '.woff2', '.eot', '.mp4', '.mp3', '.wav',
  '.env', '.local', '.encrypted', '.production', '.development'
)

$patterns = @(
  @{ Name = 'Google API key'; Regex = 'AIza[0-9A-Za-z\-_]{35}' },
  @{ Name = 'Private key block'; Regex = '-----BEGIN PRIVATE KEY-----' },
  @{ Name = 'Google OAuth client secret assignment'; Regex = '(?i)client[_-]?secret\s*[=:]\s*["''][^"'']{8,}["'']' },
  @{ Name = 'Generic secret/token assignment'; Regex = '(?i)(api[_-]?key|secret|token|password)\s*[=:]\s*["''][^"''\s]{8,}["'']' },
  @{ Name = 'Google OAuth client id literal'; Regex = '[0-9]{12}-[a-z0-9\-]{10,}\.apps\.googleusercontent\.com' }
)

$rulePathAllowlist = @{
  'Private key block' = @('.\scripts\full-secret-scan.ps1')
  'Google OAuth client secret assignment' = @('.\scripts\full-secret-scan.ps1')
  'Generic secret/token assignment' = @(
    '.\scripts\full-secret-scan.ps1',
    '.\functions\tests\ai.test.mjs',
    '.\scripts\auth-flow.e2e.spec.ts',
    '.\scripts\run-openhands.ps1',
    '.\web_app\app.js'
  )
}

$violations = New-Object System.Collections.Generic.List[string]

foreach ($rootDir in $includeRoots) {
  if (-not (Test-Path $rootDir)) { continue }

  Get-ChildItem -Path $rootDir -File -Recurse | ForEach-Object {
    $file = $_
    $full = $file.FullName

    $normalizedPath = $full.ToLowerInvariant().Replace('/', '\')
    $shouldSkip = $false
    foreach ($fragment in $skipPathFragments) {
      $normalizedFragment = $fragment.ToLowerInvariant().Replace('/', '\')
      if ($normalizedPath.Contains($normalizedFragment)) {
        $shouldSkip = $true
        break
      }
    }
    if ($shouldSkip) { return }

    if ($skipExtensions -contains $file.Extension.ToLowerInvariant()) {
      return
    }

    $content = ''
    try {
      $content = Get-Content -Path $full -Raw -ErrorAction Stop
    } catch {
      return
    }

    if (-not $content) { return }

    foreach ($pattern in $patterns) {
      if ($content -match $pattern.Regex) {
        $relative = Resolve-Path -Path $full -Relative
        $allowedPaths = @($rulePathAllowlist[$pattern.Name])
        if ($allowedPaths -contains $relative) {
          continue
        }
        $violations.Add("$($pattern.Name) in $relative") | Out-Null
      }
    }
  }
}

if ($violations.Count -gt 0) {
  Write-Host 'Secret scan failed with potential key-like findings:' -ForegroundColor Red
  $violations | Sort-Object -Unique | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
  exit 1
}

Write-Host 'Secret scan passed. No key-like patterns found.' -ForegroundColor Green
exit 0
