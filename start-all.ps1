$ErrorActionPreference = "Stop"

Write-Host "Starting FTTH backend + IA microservice..."

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$iaDir = Join-Path $root "microservice-ia"

if (-not (Test-Path $backendDir)) {
  throw "Backend directory not found: $backendDir"
}

if (-not (Test-Path $iaDir)) {
  throw "IA microservice directory not found: $iaDir"
}

$backendJob = Start-Job -Name "ftth-backend" -ScriptBlock {
  param($dir)
  Set-Location $dir
  npm run dev
} -ArgumentList $backendDir

$iaJob = Start-Job -Name "ftth-ia" -ScriptBlock {
  param($dir)
  Set-Location $dir
  python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
} -ArgumentList $iaDir

Write-Host "Backend job started: $($backendJob.Id)"
Write-Host "IA microservice job started: $($iaJob.Id)"
Write-Host ""
Write-Host "To view logs:"
Write-Host "  Receive-Job -Id $($backendJob.Id) -Keep"
Write-Host "  Receive-Job -Id $($iaJob.Id) -Keep"
Write-Host ""
Write-Host "To stop all:"
Write-Host "  Get-Job -Name ftth-backend,ftth-ia | Stop-Job"
Write-Host "  Get-Job -Name ftth-backend,ftth-ia | Remove-Job"
