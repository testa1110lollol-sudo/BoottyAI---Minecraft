@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Node.js Downloader

echo ==========================================
echo   Node.js Downloader
echo ==========================================
echo.

where node >nul 2>&1
if not errorlevel 1 (
  set "NODE_VER="
  for /f "delims=" %%I in ('node -v 2^>nul') do set "NODE_VER=%%I"
  echo [OK] Node.js is already installed: %NODE_VER%
  echo.
  echo If you still want, this BAT can open the official download page.
  choice /c YN /n /m "Open Node.js download page anyway? [Y/N]: "
  if errorlevel 2 exit /b 0
)

echo Opening the official Node.js download page...
start "" "https://nodejs.org/en/download/"
echo.
echo If your browser did not open, use this link manually:
echo https://nodejs.org/en/download/
echo.
pause
exit /b 0
