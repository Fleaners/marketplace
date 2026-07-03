# Agent Canvas Launcher for Windows PowerShell

param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentCanvasPath = Join-Path $scriptDir "agent-canvas.js"

# Run agent canvas
& C:\Users\ELCOT\AppData\Local\hermes\hermes-agent\venv\Scripts\node.exe $agentCanvasPath @Arguments
