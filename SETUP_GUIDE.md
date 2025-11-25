# Keycloak Local Setup Guide - Windows

## ✅ Prerequisites (Already Done)
- Java 17 installed: ✓

---

## 📦 Step 1: Download Keycloak ✅ COMPLETED

**Current Version Installed:** Keycloak 26.4.5

### If you need to download again:

### Option A: Manual Download (Easiest)
1. Go to: https://www.keycloak.org/downloads
2. Download: **Keycloak 26.4.5** (Server - ZIP)
3. Extract the ZIP file to this folder: `C:\Users\siam\Desktop\keycloak-test`
4. You should have: `C:\Users\siam\Desktop\keycloak-test\keycloak-26.4.5`

### Option B: PowerShell Command
```powershell
cd C:\Users\siam\Desktop\keycloak-test
Invoke-WebRequest -Uri "https://github.com/keycloak/keycloak/releases/download/26.4.5/keycloak-26.4.5.zip" -OutFile "keycloak-26.4.5.zip"
Expand-Archive -Path "keycloak-26.4.5.zip" -DestinationPath "."
```

---

## 🚀 Step 2: Start Keycloak

### Easy Way (Using the batch file):
1. Double-click: `start-keycloak.bat`
2. Wait 30-60 seconds for startup
3. Look for message: "Listening on: http://0.0.0.0:8080"

### Manual Way:
1. Open Command Prompt
2. Run:
   ```cmd
   cd C:\Users\siam\Desktop\keycloak-test\keycloak-26.4.5\bin
   kc.bat start-dev
   ```

### First Time Setup:
- Keycloak will create an H2 database automatically
- Takes about 30-60 seconds to start
- You'll see lots of logs - that's normal!

---

## 🔐 Step 3: Access Admin Console

1. **Open browser:** http://localhost:8080
2. **First time only:** Create admin user
   - Click "Administration Console"
   - You'll see "Create first admin user" form
   - Username: `admin`
   - Password: `admin` (or choose your own)
   - Click "Create"

3. **Login:**
   - Username: `admin`
   - Password: `admin`
   - Click "Sign In"

---

## 🏗️ Step 4: Create Test Realm

1. **In Admin Console:**
   - Top left, hover over "master" realm dropdown
   - Click "Create Realm"

2. **Fill in:**
   - Realm name: `hykmah`
   - Enabled: ON
   - Click "Create"

---

## 🔧 Step 5: Create Client (Your App)

1. **Go to:** Clients → Create Client

2. **General Settings:**
   - Client type: `OpenID Connect`
   - Client ID: `hykmah_dashboard`
   - Click "Next"

3. **Capability config:**
   - Client authentication: ON
   - Authorization: OFF
   - Authentication flow:
     - ✓ Standard flow
     - ✓ Direct access grants
   - Click "Next"

4. **Login settings:**
   - Root URL: `http://localhost:3000`
   - Home URL: `http://localhost:3000`
   - Valid redirect URIs: `http://localhost:3000/*`
   - Valid post logout redirect URIs: `http://localhost:3000`
   - Web origins: `http://localhost:3000`
   - Click "Save"

5. **Get Client Secret:**
   - Go to "Credentials" tab
   - Copy the "Client secret" (you'll need this later)

---

## 👤 Step 6: Create Test User

1. **Go to:** Users → Create new user

2. **Fill in:**
   - Username: `testuser`
   - Email: `test@example.com`
   - First name: `Test`
   - Last name: `User`
   - Email verified: ON
   - Click "Create"

3. **Set Password:**
   - Go to "Credentials" tab
   - Click "Set password"
   - Password: `password123`
   - Temporary: OFF
   - Click "Save"
   - Confirm "Yes"

---

## ✅ Step 7: Enable User Registration

1. **Go to:** Realm settings → Login

2. **Enable:**
   - ✓ User registration
   - ✓ Forgot password
   - ✓ Remember me
   - ✓ Email as username (optional)

3. **Click "Save"**

---

## 🧪 Step 8: Test Login Flow

### Test 1: Direct Login (Account Console)
1. **Open new browser tab:** http://localhost:8080/realms/hykmah/account
2. **Login with:**
   - Username: `testuser`
   - Password: `password123`
3. **Success!** You should see user account page

### Test 2: User Registration
1. **Go to:** http://localhost:8080/realms/hykmah/account
2. **Click:** "Register"
3. **Fill in form:**
   - Username: `newuser`
   - Email: `newuser@example.com`
   - First name: `New`
   - Last name: `User`
   - Password: `password123`
   - Password confirmation: `password123`
4. **Click "Register"**
5. **Success!** You're logged in

### Test 3: OIDC Flow (Using OAuth Playground)
1. **Go to:** https://www.oauth.com/playground/authorization-code.html
2. **Configure:**
   - Authorization Endpoint: `http://localhost:8080/realms/hykmah/protocol/openid-connect/auth`
   - Token Endpoint: `http://localhost:8080/realms/hykmah/protocol/openid-connect/token`
   - Client ID: `hykmah_dashboard`
   - Client Secret: (paste from Step 5)
   - Redirect URI: `https://www.oauth.com/playground/authorization-code-callback.html`
   - Scope: `openid profile email`
3. **Click "Begin"**
4. **Login** with your test user
5. **Success!** You'll get an access token

---

## 🔍 Step 9: Inspect JWT Token

1. **After login, copy the access token**
2. **Go to:** https://jwt.io
3. **Paste token** in the left box
4. **Inspect claims:**
   - `sub` - User ID
   - `email` - User email
   - `preferred_username` - Username
   - `iss` - Issuer (http://localhost:8080/realms/hykmah)
   - `exp` - Expiration time

---

## 🎯 Step 10: Test Google Login (Optional)

### Setup Google OAuth:
1. **Go to:** https://console.cloud.google.com
2. **Create OAuth credentials:**
   - Authorized redirect URIs: `http://localhost:8080/realms/hykmah/broker/google/endpoint`
3. **Get Client ID and Secret**

### Configure in Keycloak:
1. **Go to:** Identity providers → Add provider → Google
2. **Fill in:**
   - Client ID: (from Google)
   - Client Secret: (from Google)
   - Click "Save"

3. **Test:**
   - Go to: http://localhost:8080/realms/hykmah/account
   - You'll see "Google" button
   - Click and login with Google

---

## 🛑 Stop Keycloak

- **In Command Prompt:** Press `Ctrl + C`
- **Or:** Close the window

---

## 📁 Important Folders

```
C:\Users\siam\Desktop\keycloak-test\
├── keycloak-26.4.5\
│   ├── bin\               ← Startup scripts
│   ├── conf\              ← Configuration files
│   ├── data\              ← Database (H2)
│   ├── lib\               ← Libraries
│   ├── providers\         ← Custom SPIs (future)
│   └── themes\            ← Custom themes
├── start-keycloak.bat     ← Quick start script
└── SETUP_GUIDE.md         ← This file
```

---

## 🔧 Configuration Files

### Development Mode (Current)
- Uses H2 database (file-based)
- HTTP only (no SSL)
- Port: 8080
- Location: `keycloak-26.4.5\data\h2\keycloakdb.mv.db`

### For Production (Later)
- Use PostgreSQL
- Enable HTTPS
- Configure in: `keycloak-26.4.5\conf\keycloak.conf`

---

## 🐛 Troubleshooting

### Port 8080 already in use:
```cmd
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID)
taskkill /PID <pid> /F
```

### Keycloak won't start:
- Check Java version: `java -version` (needs 17+)
- Check logs: `keycloak-26.4.5\data\log\keycloak.log`
- Try: Delete `keycloak-26.4.5\data` folder and restart

### Admin user creation doesn't work:
- Delete: `keycloak-26.4.5\data` folder
- Restart Keycloak
- Recreate admin user

### Browser shows "Connection refused":
- Wait 60 seconds for full startup
- Check console for "Listening on: http://0.0.0.0:8080"

---

## 📚 Next Steps

1. ✅ **Basic setup done** - You can now login/register
2. 🔧 **Add custom SPI** - Test domain-based routing
3. 🎨 **Custom theme** - Brand the login page
4. 🔗 **Add Azure AD** - Test enterprise SSO
5. 🧪 **Test with frontend** - Connect React app

---

## 🔗 Useful URLs

- **Admin Console:** http://localhost:8080
- **Account Console:** http://localhost:8080/realms/hykmah/account
- **OIDC Discovery:** http://localhost:8080/realms/hykmah/.well-known/openid-configuration
- **JWKS Keys:** http://localhost:8080/realms/hykmah/protocol/openid-connect/certs
- **Documentation:** https://www.keycloak.org/documentation

---

## 💡 Tips for Demonstrating to Sir

1. **Show user registration flow:**
   - Open http://localhost:8080/realms/hykmah/account
   - Click "Register"
   - Create new user
   - Show successful login

2. **Show token structure:**
   - Login
   - Copy access token from browser DevTools
   - Paste in jwt.io
   - Show claims (sub, email, etc.)

3. **Show admin console:**
   - Login as admin
   - Show realm configuration
   - Show users list
   - Show client settings

4. **Explain:**
   - "This is the base - all built-in"
   - "Next step: Add our 3 custom SPIs"
   - "SPIs will handle: domain routing, user provisioning, role enrichment"

---

Good luck with your demo! 🚀