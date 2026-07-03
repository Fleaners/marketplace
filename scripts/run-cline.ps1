param(
    [Parameter(Mandatory=$false)]
    [string]$Task,

    [Parameter(Mandatory=$false)]
    [switch]$Interactive
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonPath = Join-Path $scriptDir "..\.venv\Scripts\python.exe"
$agentScript = Join-Path $scriptDir "cline-agent.py"

if (-not (Test-Path $pythonPath)) {
    Write-Host "Python virtual environment not found at $pythonPath" -ForegroundColor Red
    Write-Host "Create it with: python -m venv .venv" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $agentScript)) {
    Write-Host "Agent script not found at $agentScript" -ForegroundColor Red
    exit 1
}

$arguments = @($agentScript)
if ($Task) {
    $arguments += "--task"
    $arguments += $Task
}
if ($Interactive) {
    $arguments += "--interactive"
}

& $pythonPath @arguments
exit $LASTEXITCODE
