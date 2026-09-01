# Migrate GrokForge to Pro team (run after: vercel login OR VERCEL_TOKEN with Pro team access)
# Usage: powershell -File migrate-to-pro.ps1 -TeamSlug <slug from vercel.com dashboard URL>

param(
  [Parameter(Mandatory=$true)][string]$TeamSlug,
  [string]$ProjectName = "grokforge"
)

$token = $env:VERCEL_TOKEN
if (-not $token) { throw "Set VERCEL_TOKEN first (Pro team access)" }

$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$team = Invoke-RestMethod -Uri "https://api.vercel.com/v2/teams/$TeamSlug" -Headers @{ Authorization = "Bearer $token" }
$teamId = $team.id
Write-Host "team=$($team.name) $teamId plan=$($team.billing.plan)"

# Create or get project
try {
  $existing = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$ProjectName?teamId=$teamId" -Headers @{ Authorization = "Bearer $token" }
  $projectId = $existing.id
  Write-Host "using existing project $projectId"
} catch {
  $body = @{
    name = $ProjectName
    framework = "nextjs"
    gitRepository = @{ type = "github"; repo = "Pitchfork-and-Torch/GrokForge" }
    buildCommand = "prisma generate && next build"
  } | ConvertTo-Json -Depth 5
  $created = Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects?teamId=$teamId" -Method POST -Headers $h -Body $body
  $projectId = $created.id
  Write-Host "created $projectId"
}

Write-Host "Next: set env + domains via agent with this teamId=$teamId projectId=$projectId"
