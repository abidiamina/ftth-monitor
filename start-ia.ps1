$ErrorActionPreference = "Stop"

Write-Host "Starting IA microservice..."

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$iaDir = Join-Path $root "microservice-ia"

if (-not (Test-Path $iaDir)) {
  throw "IA microservice directory not found: $iaDir"
}

Set-Location $iaDir
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
