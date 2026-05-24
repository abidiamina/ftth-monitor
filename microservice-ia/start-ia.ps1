$ErrorActionPreference = "Stop"

Write-Host "Starting IA microservice..."
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
