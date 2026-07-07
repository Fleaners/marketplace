# ============================================================
# scripts/build-deploy.ps1
# Build Next.js seller dashboard and deploy to Firebase Hosting
# 
# Usage:
#   .\scripts\build-deploy.ps1             # full build + deploy
#   .\scripts\build-deploy.ps1 -SkipDeploy  # build only
#   .\scripts\build-deploy.ps1 -SkipBuild   # deploy only (use existing out/)
# ============================================================
param(
  [switch]$SkipDeploy,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$RootDir      = Split-Path $PSScriptRoot -Parent
$NextAppDir   = Join-Path $RootDir "next_app"
$NextOutDir   = Join-Path $NextAppDir "out"
$WebNextDir   = Join-Path $RootDir "web_app\next"

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  marketplace.store Build & Deploy" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Build Next.js ──────────────────────────────────────
if (-not $SkipBuild) {
  Write-Host "▶  Building Next.js seller dashboard..." -ForegroundColor Yellow
  Push-Location $NextAppDir
  try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Next.js build failed (exit $LASTEXITCODE)" }
  } finally {
    Pop-Location
  }
  Write-Host "✓  Next.js build complete" -ForegroundColor Green
} else {
  Write-Host "⊘  Skipping Next.js build (--SkipBuild)" -ForegroundColor DarkGray
}

# ── Step 2: Sync out/ → web_app/next/ ─────────────────────────
Write-Host "▶  Syncing build output to web_app/next/..." -ForegroundColor Yellow

if (-not (Test-Path $NextOutDir)) {
  throw "Build output not found at: $NextOutDir — run without -SkipBuild first."
}

if (Test-Path $WebNextDir) {
  Remove-Item -Recurse -Force $WebNextDir
}
Copy-Item -Recurse -Force $NextOutDir $WebNextDir
Write-Host "✓  Synced $(Get-ChildItem $WebNextDir -Recurse -File | Measure-Object | Select-Object -ExpandProperty Count) files to web_app/next/" -ForegroundColor Green

# ── Step 3: Deploy to Firebase ────────────────────────────────
if (-not $SkipDeploy) {
  Write-Host "▶  Deploying to Firebase Hosting (project: marketplace-store-fef91)..." -ForegroundColor Yellow
  Push-Location $RootDir
  try {
    firebase deploy --only hosting --project marketplace-store-fef91
    if ($LASTEXITCODE -ne 0) { throw "Firebase deploy failed (exit $LASTEXITCODE)" }
  } finally {
    Pop-Location
  }
  Write-Host "✓  Deploy complete → https://marketplace-store-fef91.web.app/" -ForegroundColor Green
} else {
  Write-Host "⊘  Skipping deploy (-SkipDeploy)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  All done!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
