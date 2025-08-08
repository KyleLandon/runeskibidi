param(
  [string]$Port = "4000",
  [string]$TickRate = "20",
  [string]$CorsOrigin = "",
  [string]$AdminToken = "",
  [string]$SupabaseUrl = "",
  [string]$SupabaseServiceRoleKey = "",
  [switch]$RequireAuth
)

Write-Host "Setting up Runeskibidi authoritative server..."

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js not found. Install Node LTS first (winget install OpenJS.NodeJS.LTS)" -ForegroundColor Yellow
}

Push-Location $PSScriptRoot

if (!(Test-Path package-lock.json)) {
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
npm run start

Pop-Location


