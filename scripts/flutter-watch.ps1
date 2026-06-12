$flutterPath = "C:\src\flutter\bin"
$gitPath = "C:\Program Files\Git\cmd"
$project = "C:\Users\ELCOT\Documents\New folder\marketplace\flutter_app"
$env:Path = "$gitPath;$flutterPath;" + $env:Path

function Is-PortOpen($port){
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    return $conn -ne $null
}

while ($true) {
    Write-Host "=== Running flutter pub get ==="
    Push-Location $project
    flutter pub get
    Pop-Location

    if (Is-PortOpen 8080) {
        Write-Host "Port 8080 already has a listener. Exiting watcher."
        break
    }

    Write-Host "=== Starting flutter run -d web-server ==="
    Push-Location $project
    $proc = Start-Process -FilePath flutter -ArgumentList 'run','-d','web-server','--web-port=8080','--web-hostname=0.0.0.0' -PassThru -NoNewWindow
    Start-Sleep -Seconds 5

    $timeout = 300
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        if (Is-PortOpen 8080) {
            Write-Host "Flutter web-server is listening on port 8080"
            break
        }
        if ($proc.HasExited) { break }
        Start-Sleep -Seconds 2
        $elapsed += 2
    }

    if (Is-PortOpen 8080) { 
        Pop-Location
        break
    }

    Write-Host "Flutter not serving yet; stopping process and retrying..."
    try { $proc | Stop-Process -Force -ErrorAction SilentlyContinue } catch {}
    Pop-Location
    Start-Sleep -Seconds 3
}

Write-Host "Watcher finished."