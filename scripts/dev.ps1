[CmdletBinding()]
param(
    [Alias("Host")]
    [string]$HostName = "127.0.0.1",
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$VenvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"

if (Test-Path -LiteralPath $VenvPython) {
    $Python = $VenvPython
} else {
    $Python = "python"
}

Push-Location -LiteralPath $ProjectRoot
try {
    & $Python -m uvicorn app.main:app --host $HostName --port $Port
    $ExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

if ($ExitCode -ne 0) {
    throw "uvicorn exited with code $ExitCode"
}
