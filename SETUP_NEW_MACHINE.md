# Keycloak Test Environment - New Machine Setup

Complete guide for cloning and running this project on a fresh machine.

---

## 📋 Prerequisites

### Required Software (Install Before Cloning)

1. **Git**
   - Download: https://git-scm.com/downloads
   - Verify: `git --version`

2. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

3. **MongoDB** (v6 or higher)
   - Download: https://www.mongodb.com/try/download/community
   - Windows: Install as a service (recommended)
   - Verify: `mongod --version`

4. **Java 17** (JDK or JRE)
   - Download: https://adoptium.net/
   - Set `JAVA_HOME` environment variable
   - Add to PATH: `%JAVA_HOME%\bin`
   - Verify: `java -version`

---

## 🚀 Installation Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/siam-bm/keycloak-test.git
cd keycloak-test
```

### Step 2: Download Keycloak

Keycloak binary is **NOT** in the repository (too large). Download separately:

```bash
# Windows PowerShell
curl -L -o keycloak-26.4.5.zip https://github.com/keycloak/keycloak/releases/download/26.4.5/keycloak-26.4.5.zip
tar -xf keycloak-26.4.5.zip
del keycloak-26.4.5.zip
```

Or manually:
1. Download: https://github.com/keycloak/keycloak/releases/download/26.4.5/keycloak-26.4.5.zip
2. Extract to project root → `keycloak-test/keycloak-26.4.5/`

Verify directory structure:
```
keycloak-test/
  ├── keycloak-26.4.5/       ← Must exist
  ├── keycloak-extensions/
  ├── mock-hpe-api/
  └── test-client-app/
```

### Step 3: Maven Setup

**Maven is bundled** in the repository at `apache-maven-3.9.6/` - No separate installation needed!

Verify Maven:
```bash
apache-maven-3.9.6\bin\mvn.cmd --version
```

### Step 4: Install Dependencies

**Mock HPE API:**
```bash
cd mock-hpe-api
npm install
```

**Test Client App:**
```bash
cd test-client-app
npm install
```

### Step 5: Start MongoDB

**If installed as Windows service:**
```bash
sc query MongoDB
net start MongoDB
```

**Manual start:**
```bash
mkdir C:\data\db
mongod --dbpath C:\data\db
```

Verify: `mongo --eval "db.version()"`

### Step 6: Build Keycloak Extensions

```bash
cd keycloak-extensions

# Use bundled Maven
..\apache-maven-3.9.6\bin\mvn.cmd clean package

# Copy JAR to Keycloak providers
copy target\keycloak-hpe-extensions.jar ..\keycloak-26.4.5\providers\
```

Expected output: `BUILD SUCCESS`

### Step 7: Start All Services

**Open 3 terminals:**

**Terminal 1 - Keycloak:**
```bash
.\start-keycloak.bat
# Wait for: "Keycloak 26.4.5 started"
```

**Terminal 2 - Mock API:**
```bash
cd mock-hpe-api
npm start
# Should see: ✅ Connected to MongoDB
```

**Terminal 3 - Test Client:**
```bash
cd test-client-app
npm start
# Access at: http://localhost:3000
```

---

## 🔧 Keycloak Configuration (Required)

### First Time Setup

After starting Keycloak for the first time:

#### 1. Create Admin Account

1. Go to: http://localhost:8080
2. Click: **Administration Console**
3. Create admin user:
   - Username: `admin`
   - Password: `admin`

#### 2. Create Realm

1. Login to Admin Console
2. Click: **Master** dropdown → **Create Realm**
3. Realm name: `hykmah`
4. Save

#### 3. Create Client

1. Go to: **Clients** → **Create Client**
2. Configure:
   ```
   Client ID: hykmah-test-app
   Client type: OpenID Connect
   ```
3. Next → Configure:
   ```
   Client authentication: OFF (public client)
   Standard flow: ENABLED
   Direct access grants: ENABLED
   ```
4. Next → Configure:
   ```
   Root URL: http://localhost:3000
   Home URL: http://localhost:3000
   Valid redirect URIs: http://localhost:3000/*
   Valid post logout redirect URIs: http://localhost:3000/*
   Web origins: http://localhost:3000
   ```
5. Save

#### 4. Configure Google Identity Provider

**Get Google OAuth Credentials:**
1. Go to: https://console.cloud.google.com/
2. Create project → Enable Google+ API
3. Credentials → Create OAuth 2.0 Client ID
4. Application type: Web application
5. Authorized redirect URIs:
   ```
   http://localhost:8080/realms/hykmah/broker/google/endpoint
   ```
6. Copy **Client ID** and **Client Secret**

**Add to Keycloak:**
1. Go to: **Identity Providers** → **Add provider** → **Google**
2. Configure:
   ```
   Alias: google
   Display name: Google
   Client ID: [Your Google Client ID]
   Client Secret: [Your Google Client Secret]
   Default Scopes: openid profile email
   Trust Email: ON
   ```
3. Save

#### 5. Create Custom Authentication Flow

1. Go to: **Authentication** → **Flows**
2. Click: **Browser** → **Duplicate**
3. Name: `Browser with Domain Routing`
4. In the duplicated flow:
   - Click: **Add execution**
   - Select: `Domain-Based Routing` (your custom SPI)
   - Set requirement: **ALTERNATIVE**
5. Go to: **Authentication** → **Bindings**
6. Set **Browser Flow**: `Browser with Domain Routing`
7. Save

#### 6. Enable Event Listener

1. Go to: **Realm Settings** → **Events** → **Event Listeners**
2. Add: `hpe-provisioning`
3. Save

#### 7. Configure Protocol Mapper

1. Go to: **Clients** → **hykmah-test-app** → **Client Scopes**
2. Click: `hykmah-test-app-dedicated`
3. Click: **Add mapper** → **By configuration**
4. Select: `HPE Roles Mapper`
5. Configure:
   ```
   Name: hpe-roles
   HPE API URL: http://localhost:3001
   ```
6. Save

---

## ✅ Verification Checklist

### 1. Check Services Running

- [ ] **Keycloak**: http://localhost:8080 (shows welcome page)
- [ ] **Mock API**: http://localhost:3001/api/domains (returns JSON)
- [ ] **Test Client**: http://localhost:3000 (shows login form)
- [ ] **MongoDB**: `mongo hykmah-hpe` (connects successfully)

### 2. Check Keycloak Config

Admin Console → http://localhost:8080/admin

- [ ] Realm: `hykmah` exists
- [ ] Client: `hykmah-test-app` configured
- [ ] Identity Provider: `google` configured
- [ ] Authentication Flow: `Browser with Domain Routing` active
- [ ] Event Listener: `hpe-provisioning` enabled
- [ ] Protocol Mapper: `hpe-roles` added to client

### 3. Check MongoDB Data

```bash
mongo hykmah-hpe

show collections
# Should see: companies, domains, users, companyroles

db.domains.find().pretty()
# Should see 4 domains: testcorp.com, gmail.com, webalive.com.au, flexible.com
```

### 4. Test End-to-End

1. Go to: http://localhost:3000
2. Enter email: `test@gmail.com`
3. Click: **Continue**
4. Should redirect to Keycloak
5. Should show **Google** button
6. Login with Google
7. Should redirect back with user info
8. Check MongoDB: `db.users.find({ email: "test@gmail.com" })`
   - Should have: `idp: "google"` and `idp_sub: "[google-user-id]"`

---

## 📁 Important Files & Locations

```
keycloak-test/
├── keycloak-26.4.5/              # Download separately!
│   ├── providers/                # Custom SPIs go here
│   └── bin/kc.bat
│
├── apache-maven-3.9.6/           # Bundled Maven (included)
│   └── bin/mvn.cmd
│
├── keycloak-extensions/          # Custom Java SPIs
│   ├── src/main/java/com/hykmah/keycloak/
│   │   ├── DomainBasedAuthenticator.java      # Domain routing
│   │   ├── HpeEventListener.java              # JIT provisioning
│   │   └── HpeProtocolMapper.java             # Token enrichment
│   └── pom.xml
│
├── mock-hpe-api/                 # Mock HPE REST API (Node.js)
│   ├── server-mongodb.js
│   ├── models/
│   └── package.json
│
├── test-client-app/              # OIDC test client (HTML/JS)
│   └── index.html
│
├── start-keycloak.bat            # Keycloak startup script
├── build-extensions.bat          # Build & deploy SPIs
└── SETUP_NEW_MACHINE.md          # This file
```

---

## 🐛 Common Issues

### "Maven not found"

```bash
# Use bundled Maven with full path
cd keycloak-extensions
..\apache-maven-3.9.6\bin\mvn.cmd clean package
```

### "MongoDB connection refused"

```bash
# Check if running
sc query MongoDB

# Start MongoDB
net start MongoDB
```

### "Port 8080 already in use"

```bash
# Find and kill process
netstat -ano | findstr :8080
taskkill /PID [PID] /F
```

### "Java not found"

```bash
# Set environment variable
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.x.x"
setx PATH "%PATH%;%JAVA_HOME%\bin"
```

### "Custom SPIs not appearing"

1. Rebuild: `mvn clean package`
2. Copy JAR: `copy target\keycloak-hpe-extensions.jar ..\keycloak-26.4.5\providers\`
3. **Restart Keycloak** (full stop/start)
4. Check logs for: `Added user event listener provider: hpe-provisioning`

### "Domain routing not working"

1. Verify authentication flow binding:
   - Authentication → Bindings → Browser Flow = `Browser with Domain Routing`
2. Check Keycloak logs for: `Domain-Based Authenticator` messages
3. Verify Mock API running: http://localhost:3001/api/domains/gmail.com

---

## 🔑 Default Credentials

| Service | URL | Username | Password |
|---------|-----|----------|----------|
| Keycloak Admin | http://localhost:8080/admin | `admin` | `admin` |
| MongoDB | mongodb://127.0.0.1:27017 | - | - |
| Test Client | http://localhost:3000 | - | - |
| Mock API | http://localhost:3001 | - | - |

---

## 📚 Test Scenarios

After setup, try these tests:

### 1. SSO Enforced Domain
- Email: `test@testcorp.com`
- Expected: Auto-redirect to Google (no password option)

### 2. Flexible Domain
- Email: `user@flexible.com`
- Expected: Show all login options (password + Google)

### 3. Unknown Domain
- Email: `random@unknown.com`
- Expected: Show all login options

### 4. JIT Provisioning
- Register new user: `newuser@gmail.com`
- Check MongoDB: User created with `idp: "google"`

### 5. Token Enrichment
- Login → Copy JWT → Decode at jwt.io
- Expected: Token contains `company_id`, `company_roles`, `product_roles`

### 6. Collision Detection
- Login with Google: `test@gmail.com`
- Try local signup with same email
- Expected: Blocked (flexible domain but user exists with Google)

---

## 🔗 Useful Resources

- **Keycloak Docs**: https://www.keycloak.org/documentation
- **MongoDB Compass**: https://www.mongodb.com/products/compass
- **JWT Decoder**: https://jwt.io/
- **Google Cloud Console**: https://console.cloud.google.com/
- **Repository**: https://github.com/siam-bm/keycloak-test

---

## 💡 Tips

1. **Always start MongoDB first**, then Keycloak, then Mock API, then Test Client
2. **Custom SPIs require Keycloak restart** after deployment
3. **Keep 3 terminals open** for easy monitoring of logs
4. **Use MongoDB Compass** for easier database management
5. **Check Keycloak logs** (`keycloak-26.4.5/data/log/`) for troubleshooting

---

**Last Updated**: 2025-11-26
**Keycloak Version**: 26.4.5
**Java**: 17
**Node.js**: 18+
**MongoDB**: 6+
