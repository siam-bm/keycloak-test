# Keycloak Test Environment

Local Keycloak setup for testing authentication, authorization, and SSO features.

## Quick Start

### 1. Start Keycloak
Double-click `start-keycloak.bat` or run:
```cmd
cd C:\Users\siam\Desktop\keycloak-test
start-keycloak.bat
```

Wait 30-60 seconds for startup. Look for: `Listening on: http://0.0.0.0:8080`

### 2. Access Admin Console
Open: http://localhost:8080

**First time only:** Create admin user
- Username: `admin`
- Password: `admin` (or your choice)

### 3. Login
- Go to Admin Console
- Enter credentials
- Start configuring

## Project Info

- **Keycloak Version:** 26.4.5
- **Mode:** Development (H2 database)
- **Port:** 8080
- **Java Version Required:** 17+

## Key URLs

- Admin Console: http://localhost:8080
- Account Console: http://localhost:8080/realms/{realm-name}/account
- OIDC Discovery: http://localhost:8080/realms/{realm-name}/.well-known/openid-configuration

## Project Structure

```
keycloak-test/
├── keycloak-26.4.5/          # Keycloak installation
│   ├── bin/                  # Startup scripts
│   ├── conf/                 # Configuration files
│   ├── data/                 # H2 database
│   ├── providers/            # Custom SPIs
│   └── themes/               # Custom themes
├── start-keycloak.bat        # Quick start script
├── README.md                 # This file
└── SETUP_GUIDE.md            # Detailed setup instructions

```

## Configuration

Current setup uses:
- H2 file-based database
- HTTP only (no SSL)
- Development mode optimizations

Database location: `keycloak-26.4.5\data\h2\keycloakdb.mv.db`

## Stop Keycloak

Press `Ctrl + C` in the command prompt window or simply close the window.

## Troubleshooting

### Port 8080 in use
```cmd
netstat -ano | findstr :8080
taskkill /PID <pid> /F
```

### Keycloak won't start
- Check Java version: `java -version`
- Check logs: `keycloak-26.4.5\data\log\keycloak.log`
- Try deleting `keycloak-26.4.5\data` folder and restart

### Reset everything
Delete the `keycloak-26.4.5\data` folder and restart Keycloak to start fresh.

## Documentation

- **Full Setup Guide:** See `SETUP_GUIDE.md` for detailed step-by-step instructions
- **Official Docs:** https://www.keycloak.org/documentation

## Next Steps

After starting Keycloak:
1. Create a realm (e.g., `hykmah`)
2. Configure a client application
3. Create test users
4. Test authentication flows
5. Add identity providers (Google, Azure AD, etc.)

See `SETUP_GUIDE.md` for complete walkthrough.
