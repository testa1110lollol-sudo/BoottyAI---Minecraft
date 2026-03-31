@echo off
setlocal EnableExtensions
title Minecraft 1.13 LAN Dumb AI Bot Launcher

chcp 65001 >nul

echo ==========================================
echo   Minecraft 1.13 Dumb AI Bot Launcher
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed. Please install Node.js 18+ and try again.
  pause
  exit /b 1
)

set "MC_PID="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(javaw?\\.exe|Minecraft.*\\.exe)$' } | Where-Object { ($_.CommandLine -match 'net\\.minecraft\\.client\\.main\\.Main|--gameDir|\\.minecraft') -or ($_.Name -match '^Minecraft') } | Select-Object -First 1 -ExpandProperty ProcessId; if($p){$p}"`) do (
  set "MC_PID=%%I"
)

if not defined MC_PID (
  for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-Process -Name java,javaw -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match '^Minecraft' -and $_.MainWindowTitle -notmatch 'Launcher' } | Select-Object -First 1 -ExpandProperty Id; if($p){$p}"`) do (
    set "MC_PID=%%I"
  )
)

if not defined MC_PID (
  echo [ERROR] Minecraft Java process was not found.
  echo Open Minecraft Java 1.13.x first, then run this BAT again.
  pause
  exit /b 1
)

set "MC_CMD="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq [int]$env:MC_PID } | Select-Object -First 1 -ExpandProperty CommandLine; if($p){$p}"`) do (
  set "MC_CMD=%%I"
)

set "MC_TITLE="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$t = (Get-Process -Id $env:MC_PID -ErrorAction SilentlyContinue).MainWindowTitle; if($t){$t}"`) do (
  set "MC_TITLE=%%I"
)

set "MC_OK="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; $cmd=$env:MC_CMD; $title=$env:MC_TITLE; if($cmd -like '*1.13*'){ $ok=$true }; if(-not $ok -and $title -like '*1.13*'){ $ok=$true }; if(-not $ok){ $log=$env:MC_LOG; if(-not $log){ $log=Join-Path $env:APPDATA '.minecraft\\logs\\latest.log' }; if(Test-Path $log){ $txt=(Get-Content $log -Tail 400 -ErrorAction SilentlyContinue | Out-String); if($txt -like '*Minecraft*1.13*'){ $ok=$true } } }; if($ok){ 'YES' }"`) do (
  set "MC_OK=%%I"
)

if /I not "%MC_OK%"=="YES" (
  echo [ERROR] Could not confirm Minecraft version 1.13.x.
  echo This bot supports Minecraft 1.13.x only.
  if defined MC_TITLE echo Window title: %MC_TITLE%
  if defined MC_CMD echo Process cmd: %MC_CMD%
  pause
  exit /b 1
)

echo [OK] Minecraft process found (PID %MC_PID%) and version 1.13.x confirmed.
echo.
echo Open your world to LAN now:
echo   ESC ^> Open to LAN ^> Start LAN World
echo.

set "MC_PORT="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0detect_lan_port.ps1"`) do (
  if not defined MC_PORT set "MC_PORT=%%I"
)

if defined MC_PORT (
  echo [OK] Auto-detected LAN port from log: %MC_PORT%
)

:ASK_PORT
if not defined MC_PORT (
  set /p MC_PORT="Enter LAN port from Minecraft chat: "
)

echo %MC_PORT%| findstr /r "^[0-9][0-9]*$" >nul
if errorlevel 1 (
  echo [WARN] Port must be numbers only.
  set "MC_PORT="
  goto ASK_PORT
)

set "PORT_RANGE_OK="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok = ([int]$env:MC_PORT -ge 1 -and [int]$env:MC_PORT -le 65535); if($ok){ 'YES' }"`) do (
  set "PORT_RANGE_OK=%%I"
)

if /I not "%PORT_RANGE_OK%"=="YES" (
  echo [WARN] Port must be in range 1..65535.
  set "MC_PORT="
  goto ASK_PORT
)

set "MC_PORT_OPEN="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; try { $client=New-Object Net.Sockets.TcpClient; $iar=$client.BeginConnect('127.0.0.1',[int]$env:MC_PORT,$null,$null); if($iar.AsyncWaitHandle.WaitOne(1500)){ $client.EndConnect($iar); $ok=$true }; $client.Close() } catch {}; if($ok){ 'YES' }"`) do (
  set "MC_PORT_OPEN=%%I"
)

if /I not "%MC_PORT_OPEN%"=="YES" (
  echo [WARN] Cannot connect to 127.0.0.1:%MC_PORT%.
  echo        Check that world is open to LAN and the port is correct.
  set "MC_PORT="
  goto ASK_PORT
)

set "BOT_NAME=player"
echo Bot username fixed to: %BOT_NAME%

if not exist "memory" mkdir "memory"
if not exist "node_modules" (
  echo Installing dependencies first run...
  call npm install
  if errorlevel 1 (
    echo [ERROR] Failed to install npm dependencies.
    pause
    exit /b 1
  )
)

echo.
echo Starting bot...
set "MC_HOST=127.0.0.1"
set "MC_VERSION=1.13.2"
set "BOT_USERNAME=%BOT_NAME%"
node bot.js
set "BOT_EXIT=%ERRORLEVEL%"

echo.
echo Bot session ended. Exit code: %BOT_EXIT%
if not "%BOT_EXIT%"=="0" (
  echo If disconnected immediately, read Kicked/Error/Disconnected reason above.
)
pause
endlocal

