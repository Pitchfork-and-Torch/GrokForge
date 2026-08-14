# Migrate GrokForge production to the paid GrokForge Pro Vercel team.
# Run from a shell where YOU can authenticate to the Pro team.
#
# Path A (best): transfer existing project in Vercel UI (see DOMAIN.md / agent notes).
# Path B (this script): create/link project on Pro team + env + domain + deploy.
#
# Prerequisites:
#   1) vercel login  (browser - pick GrokForge Pro team if asked)
#   2) Or: $env:VERCEL_TOKEN = "<token with Pro team access>"
#
# Usage:
#   cd $env:USERPROFILE\GrokForge
#   powershell -ExecutionPolicy Bypass -File .\scripts\migrate-to-pro-team.ps1 -TeamSlug YOUR_PRO_SLUG
#
# Find TeamSlug: while on Pro team, URL is https://vercel.com/<TeamSlug>/...

param(
  [Parameter(Mandatory = $true)]
  [string]$TeamSlug,

  [string]$ProjectName = "grokforge",
  [string]$CustomDomain = "grokforge.app",
  [string]$WwwDomain = "www.grokforge.app",
  [string]$Repo = "Pitchfork-and-Torch/GrokForge"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

function Get-DotEnv([string]$path, [string]$key) {
  if (-not (Test-Path $path)) { return $null }
  foreach ($line in Get-Content $path) {
    if ($line -match "^\s*$key=(.*)$") {
      return $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
  return $null
}

function Invoke-VercelApi {
  param([string]$Method = "GET", [string]$Url, [hashtable]$Headers, [string]$Body = $null)
  if ($Body) {
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -Body $Body
  }
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers
}

$token = $env:VERCEL_TOKEN
if (-not $token) {
  # Try CLI auth
  $who = npx --yes vercel whoami 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "Not logged in. Run: npx vercel login   then re-run this script with VERCEL_TOKEN or CLI session."
  }
  Write-Host "CLI session: $who"
  Write-Host "This script prefers VERCEL_TOKEN for API. Create one: https://vercel.com/account/tokens"
  throw "Set VERCEL_TOKEN to a token that can access team slug '$TeamSlug'"
}

$h = @{ Authorization = "Bearer $token" }
$hj = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

$team = Invoke-VercelApi -Url "https://api.vercel.com/v2/teams/$TeamSlug" -Headers $h
$teamId = $team.id
Write-Host "Team: $($team.name) ($teamId) plan=$($team.billing.plan)"

# Project create or get
$projectId = $null
try {
  $existing = Invoke-VercelApi -Url "https://api.vercel.com/v9/projects/$ProjectName`?teamId=$teamId" -Headers $h
  $projectId = $existing.id
  Write-Host "Existing project: $projectId"
} catch {
  $body = @{
    name           = $ProjectName
    framework      = "nextjs"
    gitRepository  = @{ type = "github"; repo = $Repo }
    buildCommand   = "prisma generate && next build"
    installCommand = "npm install"
  } | ConvertTo-Json -Depth 6
  $created = Invoke-VercelApi -Method POST -Url "https://api.vercel.com/v10/projects?teamId=$teamId" -Headers $hj -Body $body
  $projectId = $created.id
  Write-Host "Created project: $projectId"
}

# Env from local
$db = Get-DotEnv "$root\.env" "DATABASE_URL"
$auth = Get-DotEnv "$root\.env" "AUTH_SECRET"
if (-not $auth) { $auth = Get-DotEnv "$root\.env" "NEXTAUTH_SECRET" }
$xai = Get-DotEnv "$root\.env.local" "XAI_API_KEY"
if (-not $xai) { $xai = $env:XAI_API_KEY }
$model = Get-DotEnv "$root\.env.local" "XAI_MODEL"
if (-not $model) { $model = "grok-3-mini" }
$prodUrl = "https://$CustomDomain"

if (-not $db -or -not $auth) { throw "Missing DATABASE_URL or AUTH_SECRET in local .env" }

function Set-Env([string]$key, [string]$value, [string[]]$targets, [string]$type = "encrypted") {
  if (-not $value) { Write-Host "SKIP $key"; return }
  # delete existing
  try {
    $list = Invoke-VercelApi -Url "https://api.vercel.com/v9/projects/$projectId/env?teamId=$teamId" -Headers $h
    foreach ($e in @($list.envs | Where-Object { $_.key -eq $key })) {
      Invoke-RestMethod -Method DELETE -Uri "https://api.vercel.com/v9/projects/$projectId/env/$($e.id)?teamId=$teamId" -Headers $h | Out-Null
    }
  } catch {}
  $body = @{ key = $key; value = $value; type = $type; target = $targets } | ConvertTo-Json
  Invoke-VercelApi -Method POST -Url "https://api.vercel.com/v10/projects/$projectId/env?teamId=$teamId" -Headers $hj -Body $body | Out-Null
  Write-Host "ENV $key ok"
}

Set-Env "DATABASE_URL" $db @("production", "preview", "development")
Set-Env "AUTH_SECRET" $auth @("production", "preview", "development")
Set-Env "NEXTAUTH_SECRET" $auth @("production", "preview", "development")
Set-Env "NEXTAUTH_URL" $prodUrl @("production") "plain"
Set-Env "AUTH_URL" $prodUrl @("production") "plain"
if ($xai) {
  Set-Env "XAI_API_KEY" $xai @("production", "preview")
  Set-Env "XAI_MODEL" $model @("production", "preview") "plain"
}

# Domains
foreach ($d in @($CustomDomain, $WwwDomain)) {
  $body = @{ name = $d } | ConvertTo-Json
  try {
    Invoke-VercelApi -Method POST -Url "https://api.vercel.com/v10/projects/$projectId/domains?teamId=$teamId" -Headers $hj -Body $body | Out-Null
    Write-Host "DOMAIN added $d"
  } catch {
    Write-Host "DOMAIN $d : $($_.ErrorDetails.Message)"
  }
}

# Deploy from GitHub main
$deployBody = @{
  name = $ProjectName
  project = $projectId
  target = "production"
  gitSource = @{ type = "github"; org = "Pitchfork-and-Torch"; repo = "GrokForge"; ref = "main" }
} | ConvertTo-Json -Depth 6
$dep = Invoke-VercelApi -Method POST -Url "https://api.vercel.com/v13/deployments?teamId=$teamId&forceNew=1" -Headers $hj -Body $deployBody
Write-Host "Deploy: $($dep.id) url=$($dep.url) state=$($dep.readyState)"
Write-Host "Inspector: https://vercel.com/$TeamSlug/$ProjectName"
Write-Host "When SSL is ready: $prodUrl"
