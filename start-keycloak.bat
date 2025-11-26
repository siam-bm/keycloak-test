@echo off
echo Starting Keycloak in Development Mode...
echo.
echo Admin Console will be available at: http://localhost:8080
echo.

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0

REM Find Keycloak directory (any version)
for /d %%i in ("%SCRIPT_DIR%keycloak*") do set KEYCLOAK_DIR=%%i

if not defined KEYCLOAK_DIR (
    echo ERROR: Keycloak directory not found!
    echo Please download and extract Keycloak to this directory
    echo Download from: https://github.com/keycloak/keycloak/releases
    pause
    exit /b 1
)

REM Change to the Keycloak bin directory
cd /d "%KEYCLOAK_DIR%\bin"

REM Check if we're in the right directory
if not exist kc.bat (
    echo ERROR: kc.bat not found!
    echo Current directory: %CD%
    echo Please ensure Keycloak is extracted properly
    pause
    exit /b 1
)

echo Starting from: %CD%
echo.

REM Start Keycloak
call kc.bat start-dev

pause