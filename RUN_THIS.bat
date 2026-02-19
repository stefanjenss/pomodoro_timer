@echo off
set PORT=%1
if "%PORT%"=="" set PORT=8000

cd /d "%~dp0"
start "" "http://localhost:%PORT%/index.html"

where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  py -m http.server %PORT%
  goto :eof
)

where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  python -m http.server %PORT%
  goto :eof
)

echo Python is required to run a local web server.
echo Install Python 3, then run this file again.
pause
