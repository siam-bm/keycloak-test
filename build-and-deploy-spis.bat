@echo off
echo ============================================================
echo Building and Deploying Keycloak Custom SPIs
echo ============================================================
echo.

cd keycloak-extensions

echo [1/4] Cleaning previous builds...
call mvn clean
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Maven clean failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Building SPIs with Maven...
call mvn package
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Maven build failed!
    pause
    exit /b 1
)

echo.
echo [3/4] Copying JAR to Keycloak providers folder...
copy /Y target\keycloak-hpe-extensions.jar ..\keycloak-26.4.5\providers\
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to copy JAR file!
    pause
    exit /b 1
)

echo.
echo [4/4] Verifying deployment...
dir ..\keycloak-26.4.5\providers\keycloak-hpe-extensions.jar
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: JAR file not found in providers folder!
    pause
    exit /b 1
)

cd ..

echo.
echo ============================================================
echo SUCCESS! Custom SPIs deployed successfully.
echo ============================================================
echo.
echo IMPORTANT: You MUST restart Keycloak for changes to take effect!
echo.
echo Steps to restart:
echo   1. Go to the Keycloak terminal window
echo   2. Press Ctrl+C to stop Keycloak
echo   3. Run start-keycloak.bat again
echo.
echo After restart, verify SPIs are loaded:
echo   - Check Keycloak logs for "HPE Event Listener" and "HPE Protocol Mapper"
echo   - Go to Realm Settings ^> Events ^> Event Listeners
echo   - You should see "hpe-provisioning" in the dropdown
echo.
pause