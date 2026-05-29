# Baixa PDF.js (build dist) e copia para lib/
$ErrorActionPreference = "Stop"

$version = "3.11.174"
$zipName = "pdfjs-$version-dist.zip"
$url = "https://github.com/mozilla/pdf.js/releases/download/v$version/$zipName"
$root = $PSScriptRoot
$lib = Join-Path $root "lib"
$temp = Join-Path $env:TEMP "pdfjs-setup-$version"

New-Item -ItemType Directory -Force -Path $lib | Out-Null
New-Item -ItemType Directory -Force -Path $temp | Out-Null

$zipPath = Join-Path $temp $zipName
Write-Host "Baixando PDF.js v$version..."
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing

Write-Host "Extraindo..."
Expand-Archive -Path $zipPath -DestinationPath $temp -Force

$extracted = Get-ChildItem -Path $temp -Directory | Where-Object { $_.Name -like "pdfjs-*" } | Select-Object -First 1
if (-not $extracted) {
  $nested = Get-ChildItem -Path $temp -Recurse -Filter "pdf.min.js" | Select-Object -First 1
  if ($nested) {
    $buildDir = $nested.DirectoryName
    Copy-Item (Join-Path $buildDir "pdf.min.js") (Join-Path $lib "pdf.min.js") -Force
    Copy-Item (Join-Path $buildDir "pdf.worker.min.js") (Join-Path $lib "pdf.worker.min.js") -Force
    Write-Host "OK: lib/pdf.min.js e lib/pdf.worker.min.js instalados."
    exit 0
  }
  throw "Não foi possível localizar pdf.min.js no ZIP extraído."
}

$pdfJs = Join-Path $extracted.FullName "build\pdf.min.js"
$pdfWorker = Join-Path $extracted.FullName "build\pdf.worker.min.js"

if (-not (Test-Path $pdfJs)) {
  throw "Arquivo não encontrado: $pdfJs. Verifique a estrutura do ZIP da release."
}

Copy-Item $pdfJs (Join-Path $lib "pdf.min.js") -Force
Copy-Item $pdfWorker (Join-Path $lib "pdf.worker.min.js") -Force

Write-Host "OK: lib/pdf.min.js e lib/pdf.worker.min.js instalados."
