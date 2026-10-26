#Requires -Version 5.1
<#
.SYNOPSIS
  Устанавливает русский профиль DeepSeek Harness: плагины, пресеты, скиллы, локализация.
.DESCRIPTION
  Идемпотентно. Перед запуском закройте DeepSeek Harness.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\install.ps1
.EXAMPLE
  .\install.ps1 -Profile desktop -SkipPlugins
#>
param(
  [string]$Profile = 'desktop',
  [switch]$SkipPlugins,
  [switch]$SkipLocalize,
  [switch]$Yes
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path

function Fail($msg) { Write-Host "ОШИБКА: $msg" -ForegroundColor Red; exit 1 }

# --- профиль и CLI DSH -------------------------------------------------------
$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$profileDir = Join-Path $dshHome "profiles\$Profile"
if (-not (Test-Path (Join-Path $profileDir 'package.json'))) {
  Fail "профиль '$Profile' не найден в $profileDir. Запустите DeepSeek Harness один раз, чтобы профиль создался."
}

$dsh = $null
$cmd = Get-Command dsh -ErrorAction SilentlyContinue
if ($cmd) { $dsh = $cmd.Source }
if (-not $dsh) {
  $guess = Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd'
  if (Test-Path $guess) { $dsh = $guess }
}
if (-not $dsh) { Fail 'не найден CLI dsh. Установлен ли DeepSeek Harness Desktop?' }

$cliBin   = Split-Path -Parent $dsh
$cli      = Split-Path -Parent $cliBin
$runtime  = Split-Path -Parent $cli
$resources = Split-Path -Parent $runtime
$nodeGuess = Join-Path $resources 'runtime\primary-runtime\dependencies\node\bin\node.exe'
$node = if (Test-Path $nodeGuess) { $nodeGuess } else { (Get-Command node -ErrorAction SilentlyContinue).Source }
if (-not $node) { Fail 'не найден node.exe (ни в комплекте DSH, ни в PATH)' }

Write-Host "Профиль : $profileDir"
Write-Host "CLI dsh : $dsh"
Write-Host "Node    : $node"

if (Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue) {
  if (-not $Yes) {
    Write-Host 'DeepSeek Harness запущен. Закройте его и нажмите Enter…' -ForegroundColor Yellow
    [void](Read-Host)
  } else {
    Write-Host 'ВНИМАНИЕ: DSH запущен, установка может конфликтовать с его менеджером плагинов.' -ForegroundColor Yellow
  }
}

# --- 1. пакеты ---------------------------------------------------------------
if (-not $SkipPlugins) {
  $plugins = @(
    'dshmarket',
    '@goodandready/dsh-russian-lang',
    '@liustack/modsearch',
    'dsh-context',
    'dsh-theme-cyberpunk2077',
    'cc-safety-net',
    'dsh-better-sidebar',
    'dsh-mcp-connector',
    '@a9i5k4/dsh-auto-memory@3.3.17'
  )
  Write-Host '≈ Устанавливаю плагины (pnpm, несколько минут)…' -ForegroundColor Cyan
  & $dsh plugin --profile $Profile add @plugins
  if ($LASTEXITCODE -ne 0) { Write-Host 'Установка пакетов завершилась с ошибкой (см. вывод выше).' -ForegroundColor Yellow }

  # пресеты: локальный бандл
  $localPresets = Join-Path $profileDir 'local-presets'
  if (-not (Test-Path $localPresets)) { Copy-Item (Join-Path $repo 'profile\local-presets') $localPresets -Recurse -Force }
  $spec = 'file:' + ($localPresets -replace '\\', '/')
  & $dsh plugin --profile $Profile add $spec
  if ($LASTEXITCODE -ne 0) { Write-Host 'Не удалось подключить local-presets (см. вывод).' -ForegroundColor Yellow }
} else {
  Write-Host 'Плагины пропущены (-SkipPlugins).' -ForegroundColor DarkGray
}

# --- 2. профильные правки ----------------------------------------------------
Write-Host '≈ Применяю профильные настройки…' -ForegroundColor Cyan
& $node (Join-Path $repo 'scripts\apply-profile.mjs') --profile $profileDir
if ($LASTEXITCODE -ne 0) { Fail 'apply-profile.mjs завершился с ошибкой' }

# --- 3. локализация ----------------------------------------------------------
if (-not $SkipLocalize) {
  Write-Host '≈ Русифицирую плагин памяти…' -ForegroundColor Cyan
  & $node (Join-Path $repo 'localize\localize.mjs') --profile $profileDir
  if ($LASTEXITCODE -ne 0) { Fail 'localize.mjs завершился с ошибкой' }
}

Write-Host ''
Write-Host 'Готово. Перезапустите DeepSeek Harness:' -ForegroundColor Green
Write-Host '  • появятся пресеты «Быстрый» и «Ресёрч» (выбор при создании сессии / Настройки → Пресеты агента);'
Write-Host '  • панель «Память» и настройки будут на русском;'
Write-Host '  • модель семантической памяти (~135 МБ) скачается при первом запуске;'
Write-Host '  • MCP-серверы добавляются в панели плагина-коннектора (context7/playwright — по желанию).'
