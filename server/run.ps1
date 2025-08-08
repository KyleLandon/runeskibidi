git param(
  [string]$Port = "4000",
  [string]$TickRate = "20",
  [string]$CorsOrigin = "",
  [string]$AdminToken = "",
  [string]$SupabaseUrl = "",
  [string]$SupabaseServiceRoleKey = "",
  [switch]$RequireAuth,
  [switch]$NoPause
)

Write-Host "Setting up Runeskibidi authoritative server..."

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js not found. Install Node LTS first (winget install OpenJS.NodeJS.LTS)" -ForegroundColor Yellow
}

Push-Location $PSScriptRoot

if (!(Test-Path node_modules)) {
  Write-Host "Installing dependencies..."
  npm ci
}

$env:PORT = $Port
$env:TICK_RATE = $TickRate
if ($CorsOrigin) { $env:CORS_ORIGIN = $CorsOrigin }
if ($AdminToken) { $env:ADMIN_TOKEN = $AdminToken }
if ($SupabaseUrl) { $env:SUPABASE_URL = $SupabaseUrl }
if ($SupabaseServiceRoleKey) { $env:SUPABASE_SERVICE_ROLE_KEY = $SupabaseServiceRoleKey }
if ($RequireAuth) { $env:REQUIRE_AUTH = "true" } else { $env:REQUIRE_AUTH = "false" }

Write-Host "Starting server on port $Port (tick $TickRate Hz)..."

# Ensure logs directory exists and tee output
if (!(Test-Path logs)) { New-Item -ItemType Directory -Path logs | Out-Null }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path (Join-Path $PSScriptRoot 'logs') "server-$stamp.log"
Write-Host "Logging to $logFile"

try {
  npm run start 2>&1 | Tee-Object -FilePath $logFile
} finally {
  Write-Host "Server process exited with code $LASTEXITCODE"
  Write-Host "Log saved at: $logFile"
  if (-not $NoPause) {
    Write-Host "Press Enter to close this window..."
    Read-Host | Out-Null
  }
}

Pop-Location


