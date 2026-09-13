[CmdletBinding()]
param(
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Version)) {
  $package = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot "..\package.json") | ConvertFrom-Json
  $Version = $package.version
}

$identityName = $env:MSIX_IDENTITY_NAME
$publisher = $env:MSIX_PUBLISHER
if ([string]::IsNullOrWhiteSpace($identityName) -or [string]::IsNullOrWhiteSpace($publisher)) {
  throw "Faltan MSIX_IDENTITY_NAME y MSIX_PUBLISHER. Usa los valores exactos de Partner Center."
}

$makeAppx = Get-ChildItem -Path "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Filter makeappx.exe -Recurse -File |
  Sort-Object FullName -Descending | Select-Object -First 1
if ($null -eq $makeAppx) {
  throw "No se encontró makeappx.exe en el Windows SDK del runner."
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path
$staging = Join-Path $root "src-tauri\target\msix-staging"
$output = Join-Path $root "src-tauri\target\release\bundle\msix\Penké EC_${Version}_x64.msix"
$exe = Join-Path $root "src-tauri\target\release\penke-ec.exe"
$resources = Join-Path $root "src-tauri\resources"
$template = Join-Path $root "msix\Package.appxmanifest.template"

if (-not (Test-Path -LiteralPath $exe)) { throw "No se encontró el ejecutable Tauri: $exe" }
if (-not (Test-Path -LiteralPath $resources)) { throw "No se encontraron los recursos Tauri: $resources" }

if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging, (Join-Path $staging "Assets") -Force | Out-Null
Copy-Item -LiteralPath $exe -Destination (Join-Path $staging "penke-ec.exe")
Copy-Item -LiteralPath (Join-Path $resources "firmaec-backend.jar") -Destination $staging
Copy-Item -LiteralPath (Join-Path $resources "runtime") -Destination $staging -Recurse

foreach ($asset in @("StoreLogo.png", "Square150x150Logo.png", "Square44x44Logo.png")) {
  Copy-Item -LiteralPath (Join-Path $root "src-tauri\icons\$asset") -Destination (Join-Path $staging "Assets\$asset")
}

$manifest = Get-Content -Raw -LiteralPath $template
$manifest = $manifest.Replace("__IDENTITY_NAME__", $identityName).Replace("__PUBLISHER__", $publisher).Replace("__VERSION__", $Version)
Set-Content -LiteralPath (Join-Path $staging "AppxManifest.xml") -Value $manifest -Encoding UTF8

if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Force }
New-Item -ItemType Directory -Path (Split-Path -Parent $output) -Force | Out-Null
& $makeAppx.FullName pack /d $staging /p $output /o
if ($LASTEXITCODE -ne 0) { throw "makeappx falló con código $LASTEXITCODE" }
Write-Host "MSIX generado: $output"
