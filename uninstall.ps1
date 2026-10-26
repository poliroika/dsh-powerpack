#Requires -Version 5.1
<#
.SYNOPSIS
  Снимает пакеты и управляемые блоки, поставленные install.ps1.
.NOTES
  Память (~/.dsh/memory), сессии, скиллы и модели НЕ удаляются — это ваши данные.
#>
param(
  [string]$Profile = 'desktop',
  [switch]$Yes
)
$ErrorActionPreference = 'Stop'
$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$profileDir = Join-Path $dshHome "profiles\$Profile"

$dsh = $null
$cmd = Get-Command dsh -ErrorAction SilentlyContinue
if ($cmd) { $dsh = $cmd.Source }
if (-not $dsh) {
  $guess = Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd'
  if (Test-Path $guess) { $dsh = $guess }
}
if (-not $dsh) { Write-Host 'CLI dsh не найден.' -ForegroundColor Red; exit 1 }

if ((Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue) -and -not $Yes) {
  Write-Host 'Закройте DeepSeek Harness и нажмите Enter…' -ForegroundColor Yellow
  [void](Read-Host)
}

$packages = @(
  'dshmarket', '@goodandready/dsh-russian-lang', '@liustack/modsearch', 'dsh-context',
  'dsh-theme-cyberpunk2077', 'cc-safety-net', 'dsh-better-sidebar', 'dsh-mcp-connector',
  '@a9i5k4/dsh-auto-memory', 'dsh-local-presets'
)
& $dsh plugin --profile $Profile remove @packages

$patch = Join-Path $profileDir 'cordis.patch.yml'
if (Test-Path $patch) {
  $text = Get-Content $patch -Raw
  $pattern = '(?ms)^# >>> dsh-ru-profile managed block.*?^# <<< dsh-ru-profile managed block\r?\n?'
  $new = [regex]::Replace($text, $pattern, '')
  if ($new -ne $text) { Set-Content -Path $patch -Value $new -Encoding UTF8; Write-Host 'cordis.patch.yml: управляемый блок удалён' }
}
Write-Host 'Пакеты сняты. Память, сессии и скиллы оставлены как есть.' -ForegroundColor Green
