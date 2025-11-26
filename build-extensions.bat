@echo off
echo Building Keycloak Extensions...

cd keycloak-extensions

REM Check if Maven wrapper exists
if exist mvnw.cmd (
    call mvnw.cmd clean package
) else if exist "%MAVEN_HOME%\bin\mvn.cmd" (
    call "%MAVEN_HOME%\bin\mvn.cmd" clean package
) else (
    echo ERROR: Maven not found!
    echo Please install Maven or set MAVEN_HOME environment variable
    echo Download from: https://maven.apache.org/download.cgi
    pause
    exit /b 1
)

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Copying JAR to Keycloak providers...

REM Find Keycloak directory
for /d %%i in ("..\keycloak*") do set KEYCLOAK_DIR=%%i

if not defined KEYCLOAK_DIR (
    echo ERROR: Keycloak directory not found!
    echo Please download and extract Keycloak first
    pause
    exit /b 1
)

copy /Y target\keycloak-hpe-extensions-*.jar "%KEYCLOAK_DIR%\providers\"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Build successful!
    echo ✓ JAR deployed to %KEYCLOAK_DIR%\providers\
    echo.
    echo Next steps:
    echo 1. Restart Keycloak
    echo 2. Go to Authentication → Flows
    echo 3. Add "Domain-Based Routing" to browser flow
) else (
    echo Failed to copy JAR file
    pause
    exit /b 1
)

pause
