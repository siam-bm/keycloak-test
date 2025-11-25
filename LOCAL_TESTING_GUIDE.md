# Keycloak Local Testing Guide

This guide will help you test the key requirements from the Hykmah Identity Platform flow locally.

## What We'll Test

1. ✅ **Email-based domain routing** - Enter email, auto-detect company domain
2. ✅ **Identity Provider selection** - Show appropriate SSO options based on domain
3. ✅ **JIT (Just-In-Time) user provisioning** - Auto-create users on first login
4. ✅ **Token enrichment** - Add company/role data to JWT tokens
5. ✅ **Multiple IdP support** - Local password + Social login (Google)

## Architecture Overview

```
User → Test App (localhost:3000)
         ↓
    Keycloak (localhost:8080/realms/hykmah)
         ↓
    Mock HPE API (localhost:3001)
         - Domain lookup
         - User provisioning
         - Role management
```

## Prerequisites

- ✅ Keycloak 26.4.5 running (you have this)
- ✅ Java 17+ (for building SPIs)
- ✅ Node.js 18+ (for Mock API and Test App)
- ✅ Maven (for building Java SPIs)

## Project Structure

```
keycloak-test/
├── keycloak-26.4.5/              # Keycloak installation
├── mock-hpe-api/                 # Mock backend API
│   ├── server.js                 # Express server
│   ├── package.json
│   └── data/
│       ├── domains.json          # Domain configurations
│       ├── users.json            # User database
│       └── companies.json        # Company database
├── keycloak-extensions/          # Custom SPIs
│   ├── pom.xml                   # Maven config
│   └── src/main/java/
│       └── com/hykmah/keycloak/
│           ├── HpeEventListener.java
│           ├── HpeProtocolMapper.java
│           └── HpeDomainAuthenticator.java
├── test-client-app/              # Simple test application
│   ├── index.html
│   ├── app.js
│   └── package.json
├── realm-export.json             # Hykmah realm configuration
└── LOCAL_TESTING_GUIDE.md        # This file
```

## Setup Steps

### Step 1: Start Keycloak

```cmd
cd C:\Users\siam\Desktop\keycloak-test
start-keycloak.bat
```

Wait for: `Listening on: http://0.0.0.0:8080`

### Step 2: Import Hykmah Realm

1. Open http://localhost:8080
2. Login as `admin` / `admin`
3. Click dropdown in top-left corner
4. Click **"Create Realm"**
5. Click **"Browse"** and select `realm-export.json`
6. Click **"Create"**

You should see "hykmah" realm created with:
- 1 client: `hykmah-test-app`
- 2 Identity Providers: `google`, `local`
- 2 test users: `admin@hykmah.com`, `user@testcorp.com`

### Step 3: Start Mock HPE API

```cmd
cd mock-hpe-api
npm install
npm start
```

Should see: `Mock HPE API running on http://localhost:3001`

**Test it:**
```cmd
curl http://localhost:3001/api/domains/testcorp.com
```

### Step 4: Build & Deploy Custom SPIs

```cmd
cd keycloak-extensions
mvn clean package

# Copy JAR to Keycloak
copy target\keycloak-hpe-extensions.jar ..\keycloak-26.4.5\providers\

# Restart Keycloak (Ctrl+C in Keycloak window, then start-keycloak.bat again)
```

### Step 5: Enable Event Listener

1. Go to Keycloak Admin → **Realm Settings** → **Events** tab
2. Click **"Event Listeners"** dropdown
3. Add: `hpe-provisioning`
4. Click **"Save"**

### Step 6: Start Test Client App

```cmd
cd test-client-app
npm install
npm start
```

Opens browser at: http://localhost:3000

## Testing Scenarios

### Scenario A: New User with SSO-Enforced Domain (testcorp.com)

**Setup in Mock API:**
```json
{
  "domain": "testcorp.com",
  "sso_enforced": true,
  "idp_alias": "google"
}
```

**Test Flow:**

1. Open http://localhost:3000
2. Enter email: `john@testcorp.com`
3. Click **"Continue"**
4. **Expected:** Auto-redirect to Google login (no password option shown)
5. Login with Google
6. **Expected:** User created in Mock API, token includes company data

**Verify:**
```cmd
curl http://localhost:3001/api/users?email=john@testcorp.com
```

Should return user with:
- `idp: "google"`
- `company_id: "TC123456"`
- `status: "ACTIVE"`

### Scenario B: New User with Flexible Domain (flexible.com)

**Setup:**
```json
{
  "domain": "flexible.com",
  "sso_enforced": false,
  "idp_alias": "google"
}
```

**Test Flow:**

1. Enter email: `jane@flexible.com`
2. **Expected:** Show ALL login options:
   - Continue with Google (primary)
   - Continue with Password
   - Other IdPs

3. Choose "Password" option
4. Register new account
5. **Expected:** User created with `idp: "local"`

### Scenario C: Existing User - Different IdP (Collision Detection)

**Setup:** User exists with `idp: "local"`

**Test Flow:**

1. Enter email: `jane@flexible.com`
2. Choose "Continue with Google"
3. **Expected:**
   - If `sso_enforced: true` → Block with error message
   - If `sso_enforced: false` → Show account linking UI

### Scenario D: Token Enrichment Validation

**Test:**

1. Login successfully
2. Copy the `access_token` from browser console
3. Decode at https://jwt.io

**Expected Claims:**
```json
{
  "sub": "550e8400-...",
  "email": "john@testcorp.com",
  "email_verified": true,
  "company_id": "TC123456",
  "company_name": "Test Corporation",
  "company_owner": false,
  "company_roles": [
    {"role": "User", "products": ["WC"]}
  ],
  "product_roles": [
    {"product": "WC", "groups": ["Engineering"]}
  ]
}
```

## Mock Data Configuration

Edit `mock-hpe-api/data/domains.json` to test different scenarios:

```json
[
  {
    "domain": "testcorp.com",
    "company_id": "TC123456",
    "company_name": "Test Corporation",
    "sso_enforced": true,
    "idp_alias": "google"
  },
  {
    "domain": "flexible.com",
    "company_id": "FL789012",
    "company_name": "Flexible Inc",
    "sso_enforced": false,
    "idp_alias": "google"
  },
  {
    "domain": "unknown.com",
    "company_id": null,
    "company_name": null,
    "sso_enforced": false,
    "idp_alias": null
  }
]
```

## Debugging

### View Keycloak Logs
```cmd
type keycloak-26.4.5\data\log\keycloak.log
```

### View Mock API Logs
All requests logged in console with color coding:
- 🟢 GET requests
- 🔵 POST requests
- 🟡 PUT/PATCH requests

### View Test App Logs
Open browser DevTools → Console tab

### Common Issues

**Issue:** SPI not loaded
- **Fix:** Check `keycloak-26.4.5\providers\` has JAR file
- Restart Keycloak: `Ctrl+C` then `start-keycloak.bat`

**Issue:** Mock API returns 404
- **Fix:** Ensure domain exists in `domains.json`

**Issue:** Token missing custom claims
- **Fix:** Check Protocol Mapper configured in Client Scopes

## Next Steps

After testing locally:

1. ✅ Validate all scenarios work
2. 📝 Document any issues found
3. 🔧 Refine SPI code based on testing
4. 🚀 Deploy to staging environment
5. 🔐 Configure real Azure AD / Google OAuth apps

## Manual Testing Checklist

- [ ] Email entry redirects to Keycloak correctly
- [ ] Domain lookup returns correct IdP configuration
- [ ] SSO-enforced domains auto-redirect (no password option)
- [ ] Flexible domains show multiple login options
- [ ] Local password registration works
- [ ] Google OAuth login works
- [ ] New users auto-created in Mock API (JIT provisioning)
- [ ] User assigned to correct company
- [ ] Token contains `company_id`, `company_roles`, `product_roles`
- [ ] Token refresh works
- [ ] Logout clears session
- [ ] IdP collision handling works (same email, different IdP)

## Support

- **Keycloak Docs:** https://www.keycloak.org/docs/latest/
- **OIDC Debugger:** https://oidcdebugger.com
- **JWT Decoder:** https://jwt.io

---

**Ready to start?** Follow Step 1 above! 🚀