<#
.SYNOPSIS
Interactive script to migrate secrets from .env to Google Cloud Secret Manager.

.DESCRIPTION
Reads a specified .env file, finds specific sensitive keys, and prompts the user to 
migrate them to Google Cloud Secret Manager for the marketplace-store-fef91 project.
#>

[CmdletBinding()]
param (
    [string]$EnvFilePath = "functions/.env",
    [string]$Project = "marketplace-store-fef91",
    [ValidateSet("dev", "staging", "prod", "")]
    [string]$Environment = "",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$LogFile = "migration-log.txt"
$TargetKeys = @(
    "JWT_SECRET", "SMTP_PASS", "TWILIO_AUTH_TOKEN", "PERPLEXITY_API_KEY", 
    "RECAPTCHA_SECRET_KEY", "GEMINI_API_KEY", "NVIDIA_API_KEY", 
    "GOOGLE_CLIENT_ID", "CLOUDINARY_API_SECRET", "FIELD_ENCRYPTION_KEY"
)

function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] $Message"
    Add-Content -Path $LogFile -Value $LogMessage
}

function Mask-Secret {
    param([string]$Value)
    if ([string]::IsNullOrEmpty($Value) -or $Value.Length -le 8) {
        return "********"
    }
    $First = $Value.Substring(0, 4)
    $Last = $Value.Substring($Value.Length - 4, 4)
    return "$First...$Last"
}

if (-not (Test-Path $EnvFilePath)) {
    Write-Host "File not found: $EnvFilePath" -ForegroundColor Red
    Write-Log "Error: File not found: $EnvFilePath"
    exit 1
}

Write-Host "Starting Secret Migration..." -ForegroundColor Cyan
Write-Log "Started migration for file $EnvFilePath with Environment '$Environment'"

# Read env file preserving structure
$EnvLines = Get-Content $EnvFilePath

$Modified = $false
$NewEnvLines = @()

foreach ($Line in $EnvLines) {
    $MatchFound = $false

    foreach ($Key in $TargetKeys) {
        if ($Line -match "^$Key=(.*)") {
            $MatchFound = $true
            $Value = $matches[1].Trim("'", '"')
            
            # Skip already migrated
            if ($Value -match "^SECRET_MANAGER:") {
                Write-Host "Skipping $Key (already migrated)" -ForegroundColor DarkGray
                $NewEnvLines += $Line
                break
            }

            $MaskedValue = Mask-Secret $Value
            Write-Host "`nFound sensitive key: " -NoNewline; Write-Host $Key -ForegroundColor Yellow
            Write-Host "Current value: $MaskedValue"

            $Choice = Read-Host "Migrate this to Secret Manager? (y/n)"
            if ($Choice -eq 'y') {
                $SecretName = if ($Environment) { "${Environment}_${Key}" } else { $Key }
                
                Write-Host "Migrating to Secret Manager as '$SecretName'..." -ForegroundColor Cyan
                
                if ($DryRun) {
                    Write-Host "[DRY RUN] Would create secret $SecretName and add version." -ForegroundColor Green
                    Write-Log "[DRY RUN] Migrated $Key to $SecretName"
                    $NewEnvLines += "$Key=SECRET_MANAGER:$SecretName"
                    $Modified = $true
                } else {
                    try {
                        # Check if secret exists
                        $Exists = (gcloud secrets list --project=$Project --filter="name:$SecretName" --format="value(name)")
                        
                        if (-not $Exists) {
                            Write-Host "Creating secret resource..."
                            gcloud secrets create $SecretName --project=$Project --replication-policy=automatic | Out-Null
                            Write-Log "Created secret resource: $SecretName"
                        }

                        Write-Host "Adding secret version..."
                        $TempFile = [System.IO.Path]::GetTempFileName()
                        [System.IO.File]::WriteAllText($TempFile, $Value, [System.Text.Encoding]::UTF8)
                        gcloud secrets versions add $SecretName --data-file=$TempFile --project=$Project | Out-Null
                        Remove-Item $TempFile
                        Write-Log "Added secret version to: $SecretName"

                        Write-Host "Successfully migrated $Key" -ForegroundColor Green
                        
                        $NewEnvLines += "$Key=SECRET_MANAGER:$SecretName"
                        $Modified = $true
                    } catch {
                        Write-Host "Error migrating $Key : $_" -ForegroundColor Red
                        Write-Log "Error migrating $Key : $_"
                        $NewEnvLines += $Line
                    }
                }
            } else {
                Write-Host "Skipping $Key" -ForegroundColor DarkGray
                Write-Log "Skipped migration for $Key"
                $NewEnvLines += $Line
            }
            break
        }
    }
    
    if (-not $MatchFound) {
        $NewEnvLines += $Line
    }
}

if ($Modified -and -not $DryRun) {
    Write-Host "`nUpdating $EnvFilePath..." -ForegroundColor Cyan
    $NewEnvLines | Set-Content $EnvFilePath -Encoding UTF8
    Write-Log "Updated $EnvFilePath with SECRET_MANAGER placeholders."
    Write-Host "Migration complete!" -ForegroundColor Green
} elseif ($DryRun) {
    Write-Host "`n[DRY RUN] Would update $EnvFilePath" -ForegroundColor Cyan
} else {
    Write-Host "`nNo changes made." -ForegroundColor Yellow
}
