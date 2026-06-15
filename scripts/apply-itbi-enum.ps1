#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Aplica de forma segura e idempotente o valor 'itbi' ao enum fonte_comparavel
  no Supabase remoto (migration 20260615000001).

.DESCRIPTION
  NÃO embute credencial. Recebe a connection string via -DbUrl ou $env:ACM_DB_URL.
  Fluxo: testa conexão -> mostra enum atual -> aplica ALTER TYPE ... ADD VALUE
  IF NOT EXISTS 'itbi' -> reconfirma. Idempotente: rodar 2x é seguro.
  Owner: @devops / @data-engineer. Ver docs/runbooks/apply-itbi-enum-migration.md.

.PARAMETER DbUrl
  Connection string Postgres (preferir Session pooler IPv4, porta 5432).
  Default: $env:ACM_DB_URL.

.EXAMPLE
  $env:ACM_DB_URL = "postgresql://postgres.<ref>:<senha>@aws-1-<region>.pooler.supabase.com:5432/postgres"
  pwsh ./scripts/apply-itbi-enum.ps1
#>
param(
  [string]$DbUrl = $env:ACM_DB_URL
)

$ErrorActionPreference = 'Stop'

$EnumQuery = @"
SELECT enumlabel FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'fonte_comparavel'
ORDER BY e.enumsortorder;
"@

$AlterStmt = "ALTER TYPE fonte_comparavel ADD VALUE IF NOT EXISTS 'itbi';"

# --- Pré-checagens -----------------------------------------------------------
if ([string]::IsNullOrWhiteSpace($DbUrl)) {
  Write-Host "ERRO: connection string ausente." -ForegroundColor Red
  Write-Host "  Defina `$env:ACM_DB_URL ou passe -DbUrl. Ver docs/runbooks/apply-itbi-enum-migration.md" -ForegroundColor Yellow
  exit 1
}

$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) {
  $candidate = "C:\Users\Zero\scoop\apps\postgresql\current\bin\psql.exe"
  if (Test-Path $candidate) { $psql = $candidate }
}
if (-not $psql) {
  Write-Host "ERRO: psql não encontrado no PATH." -ForegroundColor Red
  exit 1
}

# Mascara host para log (não vazar senha)
$hostMasked = if ($DbUrl -match '@([^/:]+)') { $Matches[1] } else { '<host>' }
Write-Host "Host alvo: $hostMasked" -ForegroundColor Cyan

# --- 1. Testar conexão + estado atual ---------------------------------------
Write-Host "`n[1/3] Conectando e lendo enum atual..." -ForegroundColor Cyan
$before = & $psql $DbUrl -tAc $EnumQuery 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERRO de conexão/leitura:" -ForegroundColor Red
  Write-Host $before
  Write-Host "  (senha desatualizada? ver runbook — usar Session pooler porta 5432)" -ForegroundColor Yellow
  exit 1
}
Write-Host "  Valores atuais: $($before -join ', ')"

if ($before -contains 'itbi') {
  Write-Host "`nOK: 'itbi' JÁ existe no enum. Nada a fazer (idempotente)." -ForegroundColor Green
  exit 0
}

# --- 2. Aplicar ALTER TYPE ---------------------------------------------------
Write-Host "`n[2/3] Aplicando: $AlterStmt" -ForegroundColor Cyan
$apply = & $psql $DbUrl -v ON_ERROR_STOP=1 -c $AlterStmt 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERRO ao aplicar:" -ForegroundColor Red
  Write-Host $apply
  exit 1
}
Write-Host "  $apply"

# --- 3. Reconfirmar ----------------------------------------------------------
Write-Host "`n[3/3] Reconfirmando..." -ForegroundColor Cyan
$after = & $psql $DbUrl -tAc $EnumQuery 2>&1
Write-Host "  Valores agora: $($after -join ', ')"

if ($after -contains 'itbi') {
  Write-Host "`nSUCESSO: 'itbi' presente no enum fonte_comparavel." -ForegroundColor Green
  Write-Host "Próximo: registrar no histórico (opcional):" -ForegroundColor Yellow
  Write-Host "  supabase --workdir `"$PWD`" migration repair --status applied 20260615000001"
  Write-Host "Depois: engine pode rodar push_acm_supabase.py --bairro moema --apply (ACM_FONTE=itbi)."
  exit 0
} else {
  Write-Host "`nFALHA: 'itbi' não apareceu após o ALTER. Investigar." -ForegroundColor Red
  exit 1
}
