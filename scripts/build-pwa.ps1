[CmdletBinding()]
param(
    [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
$corepack = Get-Command corepack -ErrorAction SilentlyContinue
$useCorepack = $false

if (-not $pnpm) {
    if (-not $corepack) {
        throw 'pnpm was not found. Install Node.js with Corepack, run "corepack enable", or install pnpm and reopen PowerShell.'
    }

    $useCorepack = $true
    Write-Host 'pnpm was not found on PATH; using Corepack to provide pnpm.'
}

function Invoke-Pnpm {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )

    if ($useCorepack) {
        & $corepack.Source pnpm @Arguments
    } else {
        & $pnpm.Source @Arguments
    }

    if ($LASTEXITCODE -ne 0) {
        throw "pnpm command failed with exit code $LASTEXITCODE"
    }
}

if (-not $SkipInstall) {
    Write-Host 'Installing dependencies from pnpm-lock.yaml...'
    Invoke-Pnpm install --frozen-lockfile
}

Write-Host 'Building the PWA...'
Invoke-Pnpm build:h5

$outputDir = Join-Path $projectRoot 'pwa-dist'
$entryFile = Join-Path $outputDir 'index.html'
if (-not (Test-Path -LiteralPath $entryFile -PathType Leaf)) {
    throw "PWA build completed but the expected output was not found: $entryFile"
}

Write-Host "PWA build completed: $outputDir"
