# 🚀 Quick Start Guide

Get up and running with the Keycloak local test environment in under 10 minutes!

## Prerequisites Check

```cmd
# Check Java (need 17+)
java -version

# Check Node.js (need 18+)
node -v

# Check Maven
mvn -version
```

If any are missing, install them first.

## Step-by-Step Setup

### 1️⃣ Start Keycloak (2 min)

```cmd
cd C:\Users\siam\Desktop\keycloak-test
start-keycloak.bat
```

Wait for: `Listening on: http://0.0.0.0:8080`

Open http://localhost:8080 and create admin user:
- Username: `admin`
- Password: `admin`

### 2️⃣ Create Hykmah Realm (3 min)

1. Login to Keycloak admin console
2. Click realm dropdown (top-left)
3. Click **"Create Realm"**
4. Enter realm name: `hykmah`
5. Click **"Create"**

### 3️⃣ Create Test Client (2 min)

1. Go to **Clients** → **Create client**
2. Fill in:
   - Client ID: `hykmah-test-app`
   - Client type: `OpenID Connect`
   - Click **Next**
3. Enable:
   - ✅ Client authentication: OFF (public client)
   - ✅ Standard flow: ON
   - ✅ Direct access grants: ON
   - Click **Next**
4. Valid redirect URIs: `http://localhost:3000/*`
5. Web origins: `http://localhost:3000`
6. Click **Save**

### 4️⃣ Start Mock HPE API (1 min)

Open **NEW terminal**:

```cmd
cd C:\Users\siam\Desktop\keycloak-test\mock-hpe-api
npm install
npm start
```

Should see: `🚀 Mock HPE API Server Started`

### 5️⃣ Build & Deploy SPIs (3 min)

Open **NEW terminal**:

```cmd
cd C:\Users\siam\Desktop\keycloak-test\keycloak-extensions
mvn clean package
```

Wait for `BUILD SUCCESS`

```cmd
copy target\keycloak-hpe-extensions.jar ..\keycloak-26.4.5\providers\
```

**Restart Keycloak** (Ctrl+C in Keycloak window, then `start-keycloak.bat` again)

### 6️⃣ Enable Event Listener (1 min)

1. Back to Keycloak admin console
2. Go to **Realm Settings** → **Events** tab
3. Scroll to **Event Listeners**
4. Click dropdown, select: `hpe-provisioning`
5. Click **Save**

### 7️⃣ Add Protocol Mapper (2 min)

1. Go to **Clients** → **hykmah-test-app**
2. Go to **Client scopes** tab
3. Click **hykmah-test-app-dedicated** (in Assigned client scopes)
4. Click **Add mapper** → **By configuration**
5. Select **HPE Roles Mapper**
6. Fill in:
   - Name: `HPE Roles`
   - HPE API URL: `http://localhost:3001`
7. Click **Save**

### 8️⃣ Start Test App (1 min)

Open **NEW terminal**:

```cmd
cd C:\Users\siam\Desktop\keycloak-test\test-client-app
npm install
npm start
```

Opens browser at: http://localhost:3000

## 🧪 Test It!

### Test 1: Local Registration

1. In test app, enter email: `test@example.com`
2. Click **Continue to Login**
3. On Keycloak page, click **Register**
4. Fill form and submit
5. Should redirect back with user info + token!

**Verify in Mock API:**
```cmd
curl http://localhost:3001/api/users?email=test@example.com
```

### Test 2: SSO-Enforced Domain

1. In test app, enter email: `john@testcorp.com`
2. Should show login page
3. Check Mock API logs - should see domain lookup

### Test 3: Token Enrichment

1. After successful login
2. Click **🔍 Decode at JWT.io**
3. Should see custom claims:
   - `company_id`
   - `company_name`
   - `company_roles`
   - `product_roles`

## 🐛 Troubleshooting

### SPI not loaded?

```cmd
# Check if JAR is in providers folder
dir C:\Users\siam\Desktop\keycloak-test\keycloak-26.4.5\providers\

# Check Keycloak logs
type C:\Users\siam\Desktop\keycloak-test\keycloak-26.4.5\data\log\keycloak.log | findstr "HPE"
```

### Mock API not responding?

```cmd
# Test health check
curl http://localhost:3001/health
```

### Can't build SPIs?

Make sure Maven is installed:
```cmd
mvn -version
```

If not, download from: https://maven.apache.org/download.cgi

## 📝 What's Running?

| Service | URL | Purpose |
|---------|-----|---------|
| Keycloak | http://localhost:8080 | Identity Provider |
| Mock HPE API | http://localhost:3001 | Backend database simulator |
| Test App | http://localhost:3000 | Client application |

## 🎯 Next Steps

1. ✅ Validate basic login works
2. ✅ Check JIT provisioning (users auto-created in Mock API)
3. ✅ Verify token enrichment (company/roles in JWT)
4. 📝 Read `LOCAL_TESTING_GUIDE.md` for advanced scenarios
5. 🔧 Test with real Google OAuth (see guide)
6. 🚀 Deploy to staging when ready

## 🆘 Need Help?

- **Keycloak not starting?** Check Java version: `java -version`
- **Port conflicts?** Use `netstat -ano | findstr :8080` to find conflicts
- **Build errors?** Ensure Maven + Java 17+ installed
- **Still stuck?** Check `LOCAL_TESTING_GUIDE.md` for detailed troubleshooting

---

**Ready?** Start with Step 1! 🎉
