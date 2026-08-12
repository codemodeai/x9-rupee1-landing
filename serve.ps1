<#
  Local preview server for the X9 CREATIVES ₹1 landing page.

  Usage:
    .\serve.ps1              # serves on http://localhost:5173
    .\serve.ps1 -Port 8080   # serves on a different port
    .\serve.ps1 -NoBrowser   # don't open the browser

  Sends no-cache headers (see dev-server.py) so edits always show up on refresh.
#>
param(
  [int]$Port = 5173,
  [switch]$NoBrowser
)

$root = $PSScriptRoot
$url  = "http://localhost:$Port/"

Write-Host ""
Write-Host "  X9 CREATIVES - Rs.1 landing page" -ForegroundColor Black -BackgroundColor Green
Write-Host "  url : $url" -ForegroundColor Cyan
Write-Host ""

if (-not $NoBrowser) { Start-Process $url }

python "$root\dev-server.py" $Port
