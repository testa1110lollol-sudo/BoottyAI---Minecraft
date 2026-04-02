@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "BAT_LANG=en"
if exist "%~dp0Settings.txt" (
  for /f "usebackq tokens=1,* delims==" %%A in (`findstr /i /b /c:"Launglage=" /c:"Language=" "%~dp0Settings.txt" 2^>nul`) do (
    if /i "%%A"=="Launglage" set "BAT_LANG=%%B"
    if /i "%%A"=="Language" set "BAT_LANG=%%B"
  )
)
if /i not "%BAT_LANG%"=="ru" if /i not "%BAT_LANG%"=="en" set "BAT_LANG=en"

for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "TITLE_TXT"`) do set "TITLE_TXT=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "BANNER_TXT"`) do set "BANNER_TXT=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "ERR_NODE"`) do set "ERR_NODE=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "ERR_PROC"`) do set "ERR_PROC=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "OPEN_MC"`) do set "OPEN_MC=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "ERR_VER1"`) do set "ERR_VER1=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "ERR_VER2"`) do set "ERR_VER2=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "OK_FOUND"`) do set "OK_FOUND=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "OPEN_LAN"`) do set "OPEN_LAN=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "LAN_STEP"`) do set "LAN_STEP=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "LAN_AUTO"`) do set "LAN_AUTO=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "ASK_PORT"`) do set "ASK_PORT=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "WARN_NUM"`) do set "WARN_NUM=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "WARN_RANGE"`) do set "WARN_RANGE=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "WARN_CONN1"`) do set "WARN_CONN1=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "WARN_CONN2"`) do set "WARN_CONN2=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "BOT_NAME_TXT"`) do set "BOT_NAME_TXT=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "INSTALLING"`) do set "INSTALLING=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "ERR_INSTALL"`) do set "ERR_INSTALL=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "STARTING"`) do set "STARTING=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "ENDED"`) do set "ENDED=%%I"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" text -Lang "%BAT_LANG%" -Key "DISCONNECT_HINT"`) do set "DISCONNECT_HINT=%%I"

title %TITLE_TXT%

echo ==========================================
echo   %BANNER_TXT%
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo %ERR_NODE%
  pause
  exit /b 1
)

set "MC_PID="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" get-minecraft-pid`) do set "MC_PID=%%I"

if not defined MC_PID (
  echo %ERR_PROC%
  echo %OPEN_MC%
  pause
  exit /b 1
)

set "MC_CMD="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" get-cmdline -TargetPid "%MC_PID%"`) do set "MC_CMD=%%I"

set "MC_TITLE="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" get-title -TargetPid "%MC_PID%"`) do set "MC_TITLE=%%I"

set "MC_OK="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" confirm-version-pid -TargetPid "%MC_PID%"`) do set "MC_OK=%%I"

if /i not "%MC_OK%"=="YES" (
  echo %ERR_VER1%
  echo %ERR_VER2%
  if defined MC_TITLE echo Window title: %MC_TITLE%
  if defined MC_CMD echo Process cmd: %MC_CMD%
  pause
  exit /b 1
)

echo %OK_FOUND%
echo.
echo %OPEN_LAN%
echo   %LAN_STEP%
echo.

set "MC_PORT="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0detect_lan_port.ps1"`) do if not defined MC_PORT set "MC_PORT=%%I"
if defined MC_PORT echo %LAN_AUTO% %MC_PORT%

:ask_port
if not defined MC_PORT set /p MC_PORT="%ASK_PORT%"

echo %MC_PORT%| findstr /r "^[0-9][0-9]*$" >nul
if errorlevel 1 (
  echo %WARN_NUM%
  set "MC_PORT="
  goto ask_port
)

set "PORT_RANGE_OK="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" port-range-ok -Port "%MC_PORT%"`) do set "PORT_RANGE_OK=%%I"
if /i not "%PORT_RANGE_OK%"=="YES" (
  echo %WARN_RANGE%
  set "MC_PORT="
  goto ask_port
)

set "MC_PORT_OPEN="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher_helper.ps1" port-open -Port "%MC_PORT%"`) do set "MC_PORT_OPEN=%%I"
if /i not "%MC_PORT_OPEN%"=="YES" (
  echo %WARN_CONN1%%MC_PORT%.
  echo %WARN_CONN2%
  set "MC_PORT="
  goto ask_port
)

set "BOT_NAME=BottyAI"
echo %BOT_NAME_TXT% %BOT_NAME%

if not exist "memory" mkdir "memory"
if not exist "node_modules" (
  echo %INSTALLING%
  call npm install
  if errorlevel 1 (
    echo %ERR_INSTALL%
    pause
    exit /b 1
  )
)

echo.
echo %STARTING%
set "MC_HOST=127.0.0.1"
set "MC_VERSION=1.13.2"
set "BOT_USERNAME=%BOT_NAME%"
node bot.js
set "BOT_EXIT=%ERRORLEVEL%"

echo.
echo %ENDED% %BOT_EXIT%
if not "%BOT_EXIT%"=="0" echo %DISCONNECT_HINT%
pause
exit /b 0
