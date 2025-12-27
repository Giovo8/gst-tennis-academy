param(
  [string]$SupabaseCLI = "supabase"
)

if (-not (Get-Command $SupabaseCLI -ErrorAction SilentlyContinue)) {
  Write-Error "Supabase CLI not found. Install it from https://supabase.com/docs/guides/cli"
  exit 1
}

$schemaPath = Join-Path -Path $PSScriptRoot -ChildPath "..\supabase\schema.sql"
if (-not (Test-Path $schemaPath)) {
  Write-Error "schema.sql not found at $schemaPath"
  exit 1
}

Write-Host "Pushing schema to Supabase (requires authenticated supabase CLI)..."
& $SupabaseCLI db push --file $schemaPath
