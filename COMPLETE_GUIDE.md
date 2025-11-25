# 🎓 Complete Guide: Understanding Your Keycloak + HPE Integration

## 📚 Table of Contents
1. [What You Built](#what-you-built)
2. [Key Concepts Explained](#key-concepts-explained)
3. [Architecture Overview](#architecture-overview)
4. [Codebase Deep Dive](#codebase-deep-dive)
5. [Configuration You Did](#configuration-you-did)
6. [Testing Different Scenarios](#testing-different-scenarios)
7. [How to Modify & Extend](#how-to-modify--extend)
8. [Troubleshooting Guide](#troubleshooting-guide)

---

## 1. What You Built

You successfully created a **complete Keycloak authentication system** with custom extensions for your Hykmah Identity Platform. Here's what's working:

### ✅ What's Working Now

1. **User Registration & Login**
   - Users can register with email/password
   - Login page shows at: http://localhost:8080/realms/hykmah/...

2. **JIT (Just-In-Time) Provisioning** ✨
   - When user registers in Keycloak → Automatically creates user in your HPE database
   - Assigns them to company based on email domain
   - Example: `siam.bitmascot@gmail.com` → Company "GMAIL001"

3. **JWT Token Issuance**
   - After login, user gets a JWT token
   - Token contains standard OIDC claims (email, name, etc.)

### ⚠️ Not Yet Configured

4. **Token Enrichment** (Protocol Mapper)
   - This would add custom claims like `company_id`, `company_roles` to the JWT
   - Needs Protocol Mapper configuration (I'll show you how)

---

## 2. Key Concepts Explained

### 🏰 What is a Realm?

Think of a **Realm** like a **tenant** or **isolated environment** in Keycloak.

**Analogy**:
- Keycloak = Apartment Building
- Realm = Individual Apartment
- Each apartment has its own: users, clients (apps), settings, themes

**Your Realm: "hykmah"**
- All users register here
- All your applications (clients) connect to this realm
- Settings are isolated from other realms

**Why use realms?**
- Multi-tenancy: You could have `hykmah-dev`, `hykmah-staging`, `hykmah-prod`
- Isolation: Users in one realm can't access another
- Different branding per realm

---

### 🔑 What is a Client?

A **Client** is an **application** that uses Keycloak for authentication.

**Your Client: "hykmah-test-app"**
- This represents your frontend application (the test app at localhost:3000)
- It's a "public client" (no client secret needed)
- Uses "Authorization Code Flow" (standard OIDC flow)

**Client Types:**
1. **Public Client** (your case)
   - Frontend apps (React, Vue, Angular)
   - Mobile apps
   - Can't keep secrets secure

2. **Confidential Client**
   - Backend services
   - Has a client secret
   - Example: Node.js API server

---

### 🎯 What is an SPI (Service Provider Interface)?

**SPI** = A way to **extend Keycloak's functionality** with custom Java code.

Think of it like:
- Keycloak = WordPress
- SPI = WordPress Plugin

**Your Custom SPIs:**

1. **Event Listener SPI** (`HpeEventListener`)
   - **Purpose**: Listen to Keycloak events (REGISTER, LOGIN, etc.)
   - **Your Use**: When user registers → Call your HPE API to create user
   - **File**: `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeEventListener.java`

2. **Protocol Mapper SPI** (`HpeProtocolMapper`)
   - **Purpose**: Add custom data to JWT tokens
   - **Your Use**: Fetch user's company/roles from HPE API → Add to token
   - **File**: `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeProtocolMapper.java`

---

### 🎫 What is a JWT Token?

**JWT** = JSON Web Token = A secure way to transmit user information

**Structure:**
```
header.payload.signature
```

**Your Token Example:**
```json
{
  "sub": "cccfd7a5-e895-49bc-abbe-5168ef282c0f",  // User ID
  "email": "siam.bitmascot@gmail.com",
  "name": "Siam BM",
  "iss": "http://localhost:8080/realms/hykmah",  // Issuer (Keycloak)
  "exp": 1764055320,                             // Expiration time
  // Custom claims (would be added by Protocol Mapper):
  "company_id": "GMAIL001",          // Not present yet
  "company_name": "Gmail Users",     // Not present yet
  "company_roles": [...]             // Not present yet
}
```

---

## 3. Architecture Overview

### 🏗️ Components

```
┌─────────────────┐
│  Test Client    │  http://localhost:3000
│  (Frontend App) │  - Email entry form
└────────┬────────┘  - Displays JWT token
         │
         │ 1. Redirect to Keycloak
         ▼
┌─────────────────────────────────────────┐
│          Keycloak Server                │  http://localhost:8080
│  ┌───────────────────────────────────┐  │
│  │  Realm: hykmah                    │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Client: hykmah-test-app     │  │  │
│  │  │ - OpenID Connect            │  │  │
│  │  │ - Public client             │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Custom SPIs (Your Code)     │  │  │
│  │  │ ┌─────────────────────────┐ │  │  │
│  │  │ │ Event Listener          │ │  │  │ 2. On REGISTER event
│  │  │ │ - Listens to events     │ │────────────┐
│  │  │ │ - Calls HPE API         │ │  │  │      │
│  │  │ └─────────────────────────┘ │  │  │      │
│  │  │ ┌─────────────────────────┐ │  │  │      │
│  │  │ │ Protocol Mapper         │ │  │  │      │
│  │  │ │ - Enriches JWT token    │ │  │  │      │
│  │  │ │ - Adds custom claims    │ │────────────┼──┐
│  │  │ └─────────────────────────┘ │  │  │      │  │
│  │  └─────────────────────────────┘  │  │      │  │
│  └───────────────────────────────────┘  │      │  │
└──────────────────────────────────────────┘      │  │
                                                   │  │
                                                   │  │ 3. Create user
                                                   ▼  │ 4. Get roles
                                          ┌──────────────────┐
                                          │  Mock HPE API    │
                                          │  localhost:3001  │
                                          │  ┌────────────┐  │
                                          │  │ Domains    │  │
                                          │  │ Users      │  │
                                          │  │ Companies  │  │
                                          │  │ Roles      │  │
                                          │  └────────────┘  │
                                          └──────────────────┘
```

### 🔄 Authentication Flow

**Step-by-Step: What Happens When You Login**

1. **User Opens Test App** (http://localhost:3000)
   ```javascript
   User enters: siam.bitmascot@gmail.com
   ```

2. **App Redirects to Keycloak**
   ```
   GET http://localhost:8080/realms/hykmah/protocol/openid-connect/auth
       ?client_id=hykmah-test-app
       &redirect_uri=http://localhost:3000
       &response_type=code
       &login_hint=siam.bitmascot@gmail.com
   ```

3. **Keycloak Shows Login/Register Page**
   - User clicks "Register"
   - Fills: Email, Password, First Name, Last Name
   - Clicks "Register"

4. **Keycloak Creates User** (Internal database)
   ```sql
   INSERT INTO user_entity (id, email, first_name, last_name, ...)
   VALUES ('cccfd7a5...', 'siam.bitmascot@gmail.com', 'Siam', 'BM', ...);
   ```

5. **Event Listener Fires** (Your Custom Code!)
   ```java
   // In HpeEventListener.java
   @Override
   public void onEvent(Event event) {
       if (event.getType() == EventType.REGISTER) {
           String email = event.getDetails().get("email");

           // Extract domain
           String domain = email.split("@")[1]; // "gmail.com"

           // Call HPE API
           createUserInHPE(email, domain);
       }
   }
   ```

6. **HPE API Call** (Creates user in your database)
   ```
   POST http://localhost:3001/api/users
   {
     "email": "siam.bitmascot@gmail.com",
     "name": "Siam BM",
     "idp": "local",
     "company_id": "GMAIL001"
   }
   ```

7. **Keycloak Issues JWT Token**
   ```
   POST /realms/hykmah/protocol/openid-connect/token
   → Returns access_token, refresh_token, id_token
   ```

8. **Protocol Mapper Enriches Token** (If configured)
   ```java
   // In HpeProtocolMapper.java
   @Override
   protected void setClaim(IDToken token, ...) {
       String userId = userSession.getUser().getId();

       // Call HPE API
       RolesData roles = fetchUserRoles(userId);

       // Add to token
       token.getOtherClaims().put("company_id", roles.companyId);
       token.getOtherClaims().put("company_roles", roles.roles);
   }
   ```

9. **App Receives Token**
   ```javascript
   // Test client app receives:
   {
     access_token: "eyJhbGciOiJSUzI1NiIsInR...",
     refresh_token: "eyJhbGciOiJIUzI1NiIs...",
     expires_in: 300
   }
   ```

10. **User Logged In!** ✅

---

## 4. Codebase Deep Dive

### 📂 Project Structure

```
keycloak-test/
├── keycloak-26.4.5/              # Keycloak server
│   ├── bin/kc.bat                # Start script
│   └── providers/                # Custom SPIs go here
│       └── keycloak-hpe-extensions.jar  ← Your compiled code
│
├── mock-hpe-api/                 # Mock backend (simulates your real API)
│   ├── server.js                 # Express.js server
│   ├── data/
│   │   ├── domains.json          # Domain configurations
│   │   ├── users.json            # Created users (auto-updated)
│   │   └── companies.json        # Company data
│   └── package.json
│
├── keycloak-extensions/          # Custom Java SPIs
│   ├── pom.xml                   # Maven build config
│   └── src/main/java/com/hykmah/keycloak/
│       ├── HpeEventListener.java           # JIT provisioning logic
│       ├── HpeEventListenerFactory.java
│       ├── HpeProtocolMapper.java          # Token enrichment logic
│       └── META-INF/services/              # SPI registration
│
├── test-client-app/              # Test frontend
│   ├── index.html                # Simple OIDC client
│   ├── server.js                 # Static file server
│   └── package.json
│
├── start-keycloak.bat            # Start Keycloak
├── build-and-deploy-spis.bat     # Build & deploy SPIs
│
└── COMPLETE_GUIDE.md             # This file!
```

---

### 🔍 Event Listener Code Explained

**File**: `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeEventListener.java`

```java
package com.hykmah.keycloak;

import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventType;

public class HpeEventListener implements EventListenerProvider {

    private final String hpeApiUrl;  // http://localhost:3001

    @Override
    public void onEvent(Event event) {
        // This method is called for EVERY event in Keycloak

        // We only care about REGISTER and LOGIN events
        if (event.getType() == EventType.REGISTER) {
            handleRegistration(event);
        } else if (event.getType() == EventType.LOGIN) {
            handleLogin(event);
        }
    }

    private void handleRegistration(Event event) {
        // Extract user data from event
        String email = event.getDetails().get("email");
        String firstName = event.getDetails().get("first_name");
        String lastName = event.getDetails().get("last_name");
        String name = firstName + " " + lastName;

        // Extract domain from email
        String domain = email.split("@")[1];  // "gmail.com"

        // 1. Query domain configuration
        DomainConfig domainConfig = queryDomainConfig(domain);

        // 2. Create user in HPE API
        String userId = createUserInHPE(email, name, domainConfig);

        // 3. Assign user to company
        if (domainConfig != null && domainConfig.getCompanyId() != null) {
            assignUserToCompany(userId, domainConfig.getCompanyId());
        } else {
            // Create personal company
            String companyId = createPersonalCompany(userId, name);
            assignUserToCompany(userId, companyId);
        }
    }

    private DomainConfig queryDomainConfig(String domain) {
        // HTTP GET to: http://localhost:3001/api/domains/{domain}
        try {
            String url = hpeApiUrl + "/api/domains/" + domain;
            HttpResponse response = httpClient.execute(new HttpGet(url));

            if (response.getStatusLine().getStatusCode() == 200) {
                String json = EntityUtils.toString(response.getEntity());
                return objectMapper.readValue(json, DomainConfig.class);
            } else {
                // Domain not found - will create personal company
                return null;
            }
        } catch (Exception e) {
            logger.error("Error querying domain: " + domain, e);
            return null;
        }
    }

    private String createUserInHPE(String email, String name, DomainConfig config) {
        // HTTP POST to: http://localhost:3001/api/users
        try {
            String url = hpeApiUrl + "/api/users";

            // Build JSON payload
            Map<String, Object> payload = new HashMap<>();
            payload.put("email", email);
            payload.put("name", name);
            payload.put("idp", "local");
            payload.put("email_verified", false);

            if (config != null) {
                payload.put("company_id", config.getCompanyId());
            }

            // Send HTTP POST
            HttpPost post = new HttpPost(url);
            post.setHeader("Content-Type", "application/json");
            post.setEntity(new StringEntity(objectMapper.writeValueAsString(payload)));

            HttpResponse response = httpClient.execute(post);
            String json = EntityUtils.toString(response.getEntity());

            // Parse response to get user ID
            Map<String, Object> result = objectMapper.readValue(json, Map.class);
            return (String) result.get("id");

        } catch (Exception e) {
            logger.error("Error creating user in HPE: " + email, e);
            throw new RuntimeException("Failed to create user in HPE", e);
        }
    }

    private void assignUserToCompany(String userId, String companyId) {
        // HTTP POST to: http://localhost:3001/api/company-roles
        try {
            String url = hpeApiUrl + "/api/company-roles";

            Map<String, Object> payload = new HashMap<>();
            payload.put("user_id", userId);
            payload.put("company_id", companyId);
            payload.put("product_id", 1);
            payload.put("role", "User");  // Default role

            HttpPost post = new HttpPost(url);
            post.setHeader("Content-Type", "application/json");
            post.setEntity(new StringEntity(objectMapper.writeValueAsString(payload)));

            httpClient.execute(post);

        } catch (Exception e) {
            logger.error("Error assigning user to company", e);
        }
    }
}
```

**Key Points:**
- ✅ **Event-driven**: Runs automatically when Keycloak fires events
- ✅ **Synchronous**: Blocks user registration until HPE API responds
- ✅ **Error handling**: If HPE API fails, user registration fails too
- ⚠️ **Network calls**: Makes 2-3 HTTP requests per registration (can be slow)

---

### 🎨 Protocol Mapper Code Explained

**File**: `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeProtocolMapper.java`

```java
package com.hykmah.keycloak;

import org.keycloak.models.ProtocolMapperModel;
import org.keycloak.models.UserSessionModel;
import org.keycloak.protocol.oidc.mappers.*;
import org.keycloak.provider.ProviderConfigProperty;
import org.keycloak.representations.IDToken;

public class HpeProtocolMapper extends AbstractOIDCProtocolMapper
    implements OIDCAccessTokenMapper, OIDCIDTokenMapper, UserInfoTokenMapper {

    public static final String PROVIDER_ID = "hpe-roles-mapper";

    @Override
    protected void setClaim(IDToken token,
                          ProtocolMapperModel mappingModel,
                          UserSessionModel userSession,
                          KeycloakSession keycloakSession,
                          ClientSessionContext clientSessionCtx) {

        // This method is called when creating JWT token

        // Get configuration from mapper
        String hpeApiUrl = mappingModel.getConfig().get("hpeApiUrl");
        String hpeApiKey = mappingModel.getConfig().get("hpeApiKey");

        // Get user ID
        String userId = userSession.getUser().getId();
        String email = userSession.getUser().getEmail();

        // Query user from HPE API
        HpeUser user = getUserFromHPE(email, hpeApiUrl);

        if (user != null) {
            // Query roles from HPE API
            HpeRolesResponse roles = getUserRoles(user.getId(), hpeApiUrl);

            // Add custom claims to token
            token.getOtherClaims().put("company_id", roles.getCompanyId());
            token.getOtherClaims().put("company_name", roles.getCompanyName());
            token.getOtherClaims().put("company_owner", roles.isCompanyOwner());
            token.getOtherClaims().put("company_roles", roles.getCompanyRoles());
            token.getOtherClaims().put("product_roles", roles.getProductRoles());
        }
    }

    private HpeUser getUserFromHPE(String email, String apiUrl) {
        // HTTP GET to: http://localhost:3001/api/users?email={email}
        try {
            String url = apiUrl + "/api/users?email=" + email;
            HttpResponse response = httpClient.execute(new HttpGet(url));

            if (response.getStatusLine().getStatusCode() == 200) {
                String json = EntityUtils.toString(response.getEntity());
                return objectMapper.readValue(json, HpeUser.class);
            }
            return null;
        } catch (Exception e) {
            logger.error("Error fetching user from HPE", e);
            return null;
        }
    }

    private HpeRolesResponse getUserRoles(String userId, String apiUrl) {
        // HTTP GET to: http://localhost:3001/api/users/{userId}/roles
        try {
            String url = apiUrl + "/api/users/" + userId + "/roles";
            HttpResponse response = httpClient.execute(new HttpGet(url));

            String json = EntityUtils.toString(response.getEntity());
            return objectMapper.readValue(json, HpeRolesResponse.class);

        } catch (Exception e) {
            logger.error("Error fetching roles from HPE", e);
            return new HpeRolesResponse();  // Return empty
        }
    }

    @Override
    public String getDisplayType() {
        return "HPE Roles Mapper";  // Shows in Keycloak admin UI
    }

    @Override
    public String getId() {
        return PROVIDER_ID;  // "hpe-roles-mapper"
    }
}
```

**Key Points:**
- ✅ **Token enrichment**: Adds custom data to JWT
- ✅ **Cached**: Keycloak caches user sessions (not called every time)
- ⚠️ **Performance**: Makes 2 HTTP calls per token issuance
- 💡 **Better approach**: Store roles in Keycloak database, sync periodically

---

### 📡 Mock HPE API Explained

**File**: `mock-hpe-api/server.js`

This is a simple Express.js server that simulates your real HPE backend.

```javascript
const express = require('express');
const app = express();

// In-memory database (JSON files)
const domains = require('./data/domains.json');
const users = require('./data/users.json');
const companies = require('./data/companies.json');

// ==================== DOMAIN ROUTES ====================

// GET /api/domains/:domain
app.get('/api/domains/:domain', (req, res) => {
  const { domain } = req.params;
  const config = domains.find(d => d.domain === domain);

  if (!config) {
    return res.status(404).json({
      error: 'Domain not found'
    });
  }

  res.json(config);
});

// ==================== USER ROUTES ====================

// POST /api/users - Create user (JIT provisioning)
app.post('/api/users', (req, res) => {
  const newUser = {
    id: uuidv4(),
    email: req.body.email,
    name: req.body.name,
    idp: req.body.idp || 'local',
    company_id: req.body.company_id || null,
    status: 'ACTIVE',
    created_at: new Date().toISOString()
  };

  users.push(newUser);
  writeJSONFile(USERS_FILE, users);  // Save to disk

  console.log(`  ✅ User created: ${newUser.email}`);
  res.status(201).json(newUser);
});

// GET /api/users?email=xxx - Query user
app.get('/api/users', (req, res) => {
  const { email } = req.query;
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

// GET /api/users/:userId/roles - Get user roles
app.get('/api/users/:userId/roles', (req, res) => {
  const { userId } = req.params;
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Mock role data
  const roleData = {
    company_id: user.company_id,
    company_name: "Test Corporation",
    company_owner: false,
    company_roles: [
      { role: "User", products: ["WC", "EX"] }
    ],
    product_roles: [
      { product: "WC", groups: ["Engineering"] }
    ]
  };

  res.json(roleData);
});

// ==================== COMPANY ROUTES ====================

// POST /api/company-roles - Assign user to company
app.post('/api/company-roles', (req, res) => {
  const { user_id, company_id, role } = req.body;

  console.log(`  ✅ Company role assigned: User ${user_id} → Company ${company_id}`);

  res.status(201).json({
    user_id,
    company_id,
    role,
    assigned_at: new Date().toISOString()
  });
});
```

**What It Does:**
- ✅ Stores data in JSON files (`data/*.json`)
- ✅ Simulates your real backend endpoints
- ✅ Logs all requests with colors (easy debugging)
- ⚠️ No authentication (it's for testing only!)
- ⚠️ Data resets when you restart the server

---

## 5. Configuration You Did

Let me explain what you configured and why:

### 1️⃣ Created Realm "hykmah"

**What**: A realm is like a tenant/namespace in Keycloak

**Why**: Isolates your application's users, clients, and settings

**Configuration:**
```
Realm Settings:
  - Realm name: hykmah
  - Enabled: ON
  - Login settings:
      ✅ User registration
      ✅ Email as username
      ✅ Login with email
```

**Effect:**
- Users can self-register
- Email is used for login (not username)
- Realm accessible at: `http://localhost:8080/realms/hykmah`

---

### 2️⃣ Created Client "hykmah-test-app"

**What**: Represents your frontend application

**Configuration:**
```
Client ID: hykmah-test-app
Client Type: OpenID Connect (OIDC)
Client Authentication: OFF (public client)

Redirect URIs: http://localhost:3000/*
Web Origins: http://localhost:3000
```

**Why:**
- **Public client**: Frontend can't securely store secrets
- **Redirect URIs**: Where Keycloak sends user after login
- **Web Origins**: Enables CORS for localhost:3000

**Effect:**
- Your test app can authenticate users via Keycloak
- Uses Authorization Code Flow with PKCE
- Token endpoint: `/realms/hykmah/protocol/openid-connect/token`

---

### 3️⃣ Enabled Event Listener "hpe-provisioning"

**What**: Activates your custom Event Listener SPI

**Configuration:**
```
Realm Settings → Events → Event Listeners
Selected: hpe-provisioning
```

**Why:**
- Tells Keycloak to call your `HpeEventListener` code
- Without this, your SPI wouldn't run!

**Effect:**
- When user registers → `onEvent()` method called
- Creates user in Mock HPE API automatically

---

### 4️⃣ (Not Done Yet) Configure Protocol Mapper

**What**: Would activate your custom Protocol Mapper SPI

**Configuration Needed:**
```
Clients → hykmah-test-app → Client Scopes
→ hykmah-test-app-dedicated → Add Mapper
→ By Configuration → Select "HPE Roles Mapper"

Settings:
  Name: hpe-roles
  HPE API URL: http://localhost:3001
  HPE API Key: (empty for now)
```

**Why:**
- Adds custom claims to JWT tokens
- Fetches roles from HPE API during token creation

**Effect (when configured):**
- JWT would include:
  ```json
  {
    "email": "siam.bitmascot@gmail.com",
    "company_id": "GMAIL001",          // ← Added
    "company_name": "Gmail Users",     // ← Added
    "company_roles": [...]             // ← Added
  }
  ```

---

## 6. Testing Different Scenarios

Here are scenarios you can test right now:

### Scenario A: Unknown Domain (Personal Company)

**Test Email**: `random.user@unknowndomain.com`

**Expected Flow:**
1. Domain lookup fails (404)
2. User created with `company_id: null`
3. Personal company created: "Random User's Company"
4. User assigned as owner

**How to Test:**
```bash
# 1. Register user at http://localhost:3000
Email: random.user@unknowndomain.com
Password: test123

# 2. Check if user created
curl http://localhost:3001/api/users?email=random.user@unknowndomain.com

# Expected: company_id might be null or personal company ID
```

---

### Scenario B: Known Domain (SSO Flexible)

**Test Email**: `another.user@gmail.com`

**Expected Flow:**
1. Domain lookup succeeds: `gmail.com` (sso_enforced: false)
2. User shown multiple login options (password, Google, etc.)
3. User chooses password
4. User created with `company_id: "GMAIL001"`

**How to Test:**
```bash
# 1. Register at http://localhost:3000
Email: another.user@gmail.com

# 2. Verify domain lookup
curl http://localhost:3001/api/domains/gmail.com

# 3. Check user
curl "http://localhost:3001/api/users?email=another.user@gmail.com"
```

---

### Scenario C: Add New Domain (SSO Enforced)

**Test Email**: `employee@mycompany.com`

**Setup:**
```bash
# Add domain configuration
curl -X POST http://localhost:3001/api/domains \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "mycompany.com",
    "company_id": "COMP001",
    "company_name": "My Company Inc",
    "sso_enforced": true,
    "idp_alias": "azuread"
  }'

# Add company
curl -X POST http://localhost:3001/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "id": "COMP001",
    "name": "My Company Inc",
    "billing_status": "active"
  }'
```

**Expected:**
1. Domain lookup succeeds
2. User MUST use Azure AD (SSO enforced)
3. No password option shown
4. User assigned to COMP001

---

### Scenario D: Test Token Refresh

**Test:**
```javascript
// In browser console at http://localhost:3000 (after login)
async function testRefresh() {
  const refreshToken = sessionStorage.getItem('refresh_token');

  const response = await fetch('http://localhost:8080/realms/hykmah/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'hykmah-test-app'
    })
  });

  const data = await response.json();
  console.log('New token:', data.access_token);
}

testRefresh();
```

**Expected:**
- Returns new `access_token` with extended expiry
- Old token still valid until expiry
- Refresh token rotates (new one issued)

---

### Scenario E: Test Logout

**Test:**
1. Login at http://localhost:3000
2. Click "Logout" button
3. Check session cleared

**Verify:**
```javascript
// Should be null
console.log(sessionStorage.getItem('access_token'));

// Try to access protected resource
// Should fail with 401 Unauthorized
```

---

## 7. How to Modify & Extend

### 🔧 Add New Domain

**Steps:**
1. Call Mock API:
```bash
curl -X POST http://localhost:3001/api/domains \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "newdomain.com",
    "company_id": "NEW001",
    "sso_enforced": false
  }'
```

2. Test with email: `user@newdomain.com`

---

### 🔧 Modify Event Listener (Add More Logic)

**Example: Send Welcome Email After Registration**

Edit: `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeEventListener.java`

```java
private void handleRegistration(Event event) {
    String email = event.getDetails().get("email");

    // Existing logic...
    createUserInHPE(email, ...);

    // NEW: Send welcome email
    sendWelcomeEmail(email);
}

private void sendWelcomeEmail(String email) {
    try {
        String url = hpeApiUrl + "/api/emails/welcome";

        Map<String, Object> payload = new HashMap<>();
        payload.put("to", email);
        payload.put("subject", "Welcome to Hykmah!");

        HttpPost post = new HttpPost(url);
        post.setEntity(new StringEntity(objectMapper.writeValueAsString(payload)));

        httpClient.execute(post);
    } catch (Exception e) {
        logger.error("Failed to send welcome email", e);
        // Don't fail registration if email fails
    }
}
```

**Rebuild:**
```bash
cd keycloak-extensions
mvn clean package
cp target/keycloak-hpe-extensions.jar ../keycloak-26.4.5/providers/
# Restart Keycloak
```

---

### 🔧 Change Token Claims (Protocol Mapper)

**Example: Add User Avatar URL to Token**

Edit: `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeProtocolMapper.java`

```java
@Override
protected void setClaim(IDToken token, ...) {
    // Existing claims...
    token.getOtherClaims().put("company_id", ...);

    // NEW: Add avatar URL
    String email = userSession.getUser().getEmail();
    String avatarUrl = getAvatarUrl(email);
    token.getOtherClaims().put("avatar_url", avatarUrl);
}

private String getAvatarUrl(String email) {
    // Generate Gravatar URL
    String hash = md5(email.toLowerCase().trim());
    return "https://www.gravatar.com/avatar/" + hash;
}
```

---

### 🔧 Add New Mock API Endpoint

**Example: Get User's Company Details**

Edit: `mock-hpe-api/server.js`

```javascript
// GET /api/companies/:companyId/details
app.get('/api/companies/:companyId/details', (req, res) => {
  const { companyId } = req.params;

  const company = companies.find(c => c.id === companyId);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Get all users in this company
  const companyUsers = users.filter(u => u.company_id === companyId);

  res.json({
    ...company,
    user_count: companyUsers.length,
    users: companyUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name
    }))
  });
});
```

**Test:**
```bash
curl http://localhost:3001/api/companies/GMAIL001/details
```

---

## 8. Troubleshooting Guide

### ❌ Problem: "Realm does not exist"

**Symptoms:**
```
GET http://localhost:8080/realms/hykmah
→ {"error":"Realm does not exist"}
```

**Solution:**
1. Go to Keycloak admin: http://localhost:8080
2. Login
3. Top-left dropdown → Create Realm
4. Enter "hykmah" → Create

---

### ❌ Problem: User Not Created in Mock API

**Symptoms:**
- Registration succeeds in Keycloak
- But `curl http://localhost:3001/api/users?email=...` returns 404

**Debug:**
1. Check Event Listener enabled:
   ```
   Realm Settings → Events → Event Listeners
   Should include: hpe-provisioning
   ```

2. Check Keycloak logs:
   ```bash
   # Look for errors
   tail -f keycloak-26.4.5/logs/keycloak.log
   ```

3. Check Mock API logs (in terminal where it's running)

4. Verify SPI loaded:
   ```bash
   # Should see "HPE Event Listener Initialized"
   grep "HPE Event Listener" keycloak-26.4.5/logs/keycloak.log
   ```

---

### ❌ Problem: Custom Claims Not in Token

**Symptoms:**
- Token doesn't have `company_id`, `company_roles`

**Solutions:**

1. **Check Protocol Mapper configured:**
   ```
   Clients → hykmah-test-app → Client Scopes
   → hykmah-test-app-dedicated → Mappers
   Should see: "hpe-roles" or similar
   ```

2. **Check mapper settings:**
   - HPE API URL should be: `http://localhost:3001`
   - HPE API Key can be empty

3. **Test mapper directly:**
   ```bash
   # Get user ID from token (sub claim)
   USER_ID="cccfd7a5-e895-49bc-abbe-5168ef282c0f"

   # Check if roles endpoint works
   curl http://localhost:3001/api/users?email=siam.bitmascot@gmail.com
   # Get user.id from response

   curl http://localhost:3001/api/users/{USER_ID}/roles
   ```

4. **Force new token:**
   - Logout
   - Clear browser cache
   - Login again
   - Check new token

---

### ❌ Problem: Mock API Not Responding

**Symptoms:**
```bash
curl http://localhost:3001/health
→ Connection refused
```

**Solutions:**

1. **Check if running:**
   ```bash
   # Windows
   netstat -ano | findstr :3001

   # Should show LISTENING
   ```

2. **Restart Mock API:**
   ```bash
   cd mock-hpe-api
   npm start
   ```

3. **Check port conflict:**
   - Port 3001 might be used by another app
   - Change port in `mock-hpe-api/server.js`:
     ```javascript
     const PORT = 3002;  // Change this
     ```
   - Update SPI configuration to use new port

---

### ❌ Problem: Keycloak Won't Start

**Symptoms:**
```
ERROR: Address already in use: bind
```

**Solutions:**

1. **Port 8080 in use:**
   ```bash
   # Find process using port 8080
   netstat -ano | findstr :8080

   # Kill process (use PID from above)
   taskkill /PID <PID> /F
   ```

2. **Java not found:**
   ```
   ERROR: JAVA_HOME not set
   ```

   **Fix:**
   - Install Java 17+
   - Or Keycloak will use system Java

3. **Database locked:**
   ```bash
   # Delete H2 database (resets all data!)
   rm keycloak-26.4.5/data/h2/*
   ```

---

## 🎯 Next Steps

Now that you understand the system, here's what you should do:

### Phase 1: Complete Current Setup ✅
- [ ] Configure Protocol Mapper (add custom claims)
- [ ] Test with token showing company_id
- [ ] Test all scenarios in Section 6

### Phase 2: Integrate with Real HPE API 🔧
- [ ] Replace Mock API URL with real API
- [ ] Add authentication (API keys)
- [ ] Handle network errors gracefully
- [ ] Add retry logic

### Phase 3: Add Social Login 🔐
- [ ] Configure Google OAuth
- [ ] Configure Azure AD
- [ ] Test IdP flow
- [ ] Test account linking

### Phase 4: Production Readiness 🚀
- [ ] Use PostgreSQL instead of H2
- [ ] Enable HTTPS
- [ ] Configure email verification (SMTP)
- [ ] Add rate limiting
- [ ] Set up monitoring & logging
- [ ] Deploy to staging environment

### Phase 5: Advanced Features ⚡
- [ ] Implement Domain Authenticator (auto-redirect based on domain)
- [ ] Add Multi-Factor Authentication (MFA)
- [ ] Implement account linking UI
- [ ] Add role-based access control (RBAC)
- [ ] Create admin dashboard

---

## 📚 Additional Resources

### Keycloak Documentation
- Official Docs: https://www.keycloak.org/documentation
- SPI Guide: https://www.keycloak.org/docs/latest/server_development/
- OIDC Spec: https://openid.net/specs/openid-connect-core-1_0.html

### Tools
- JWT Decoder: https://jwt.io
- OIDC Debugger: https://oidcdebugger.com
- Postman Collection: (create one for your API)

### Code Examples
- Keycloak SPIs: https://github.com/keycloak/keycloak/tree/main/examples
- Event Listener: https://github.com/keycloak/keycloak/blob/main/examples/providers/event-listener-sysout
- Protocol Mapper: https://github.com/keycloak/keycloak/blob/main/examples/providers/user-attribute-mapper

---

## 🎓 Key Takeaways

1. **Keycloak = Identity Provider (IdP)**
   - Handles authentication (who you are)
   - Issues JWT tokens
   - Supports multiple auth methods (password, social login, SSO)

2. **Realm = Tenant/Environment**
   - Isolated namespace for users, clients, settings
   - You created: "hykmah"

3. **Client = Your Application**
   - Represents your frontend/backend app
   - You created: "hykmah-test-app" (public OIDC client)

4. **SPIs = Custom Extensions**
   - Event Listener: JIT provisioning (user creation)
   - Protocol Mapper: Token enrichment (add custom claims)

5. **Mock HPE API = Your Backend Simulator**
   - Stores users, companies, domains
   - Simulates real HPE API for testing

6. **JWT Token = User Information**
   - Contains claims (email, name, roles, etc.)
   - Signed by Keycloak (tamper-proof)
   - Used to authenticate API requests

---

## 📝 Summary of What You Accomplished

✅ Installed and configured Keycloak 26.4.5
✅ Created realm "hykmah" with user registration
✅ Created client "hykmah-test-app" (OIDC)
✅ Built custom Event Listener for JIT provisioning
✅ Built custom Protocol Mapper for token enrichment
✅ Set up Mock HPE API with test data
✅ Tested full authentication flow
✅ Successfully registered user: siam.bitmascot@gmail.com
✅ Verified JIT provisioning (user created in Mock API)
⏳ Need to configure Protocol Mapper (token enrichment)

---

**You now have a fully functional Keycloak authentication system with custom extensions!** 🎉

**Questions?** Check the troubleshooting guide above, or test different scenarios to learn more!

---

*Document created: 2025-11-25*
*Keycloak Version: 26.4.5*
*Test Environment: Windows 11, Java 17, Node.js 18+*
