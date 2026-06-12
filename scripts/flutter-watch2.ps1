$flutterPath = "C:\src\flutter\bin"
$gitPath = "C:\Program Files\Git\cmd"
$project = "C:\Users\ELCOT\Documents\New folder\marketplace\flutter_app"
$env:Path = "$gitPath;$flutterPath;" + $env:Path

function Is-PortOpen($port){
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    return $conn -ne $null
}

while ($true) {
    Write-Host "=== Cleaning up flutter/dart and lockfile ==="
    taskkill /IM dart.exe /F 2>$null | Out-Null
    taskkill /IM flutter.exe /F 2>$null | Out-Null
    if (Test-Path "$flutterPath\cache\lockfile") { Remove-Item "$flutterPath\cache\lockfile" -Force -ErrorAction SilentlyContinue }

    Write-Host "=== Running flutter pub get ==="
    Push-Location $project
    $pub = & flutter pub get 2>&1 | Tee-Object -Variable _pubOut
    if ($LASTEXITCODE -ne 0) {
        Write-Host "flutter pub get failed:"
        $pub | Select-Object -Last 20 | ForEach-Object { Write-Host $_ }
    }
    Pop-Location

    if (Is-PortOpen 8080) {
        Write-Host "Port 8080 already has a listener. Exiting watcher."
        break
    }

    Write-Host "=== Starting flutter run -d web-server (wait) ==="
    Push-Location $project
    $args = 'run','-d','web-server','--web-port=8080','--web-hostname=0.0.0.0'
    Start-Process -FilePath flutter -ArgumentList $args -NoNewWindow -Wait -PassThru

    # After flutter run exits or while it's running, check port
    $timeout = 300
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        if (Is-PortOpen 8080) {
            Write-Host "Flutter web-server is listening on port 8080"
            break
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
    }

    if (Is-PortOpen 8080) { 
        Pop-Location
        break
    }

    Write-Host "Flutter not serving yet; retrying after cleanup..."
    Pop-Location
    Start-Sleep -Seconds 3
}

Write-Host "Watcher finished."