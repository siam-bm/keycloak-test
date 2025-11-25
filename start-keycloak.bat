@echo off
echo Starting Keycloak in Development Mode...
echo.
echo Admin Console will be available at: http://localhost:8080
echo.

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0

REM Change to the Keycloak bin directory
cd /d "%SCRIPT_DIR%keycloak-26.4.5\bin"

REM Check if we're in the right directory
if not exist kc.bat (
    echo ERROR: kc.bat not found!
    echo Current directory: %CD%
    echo Please ensure Keycloak is extracted to: %SCRIPT_DIR%keycloak-26.4.5
    pause
    exit /b 1
)

echo Starting from: %CD%
echo.

REM Start Keycloak
call kc.bat start-dev

pause