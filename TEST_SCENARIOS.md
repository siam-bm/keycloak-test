# 🧪 Test Scenarios Guide

Complete guide to testing the Keycloak integration with detailed verification steps and code references.

---

## 📋 Table of Contents

1. [Test Scenario 1: Domain Discovery](#test-scenario-1-domain-discovery)
2. [Test Scenario 2: New User Registration (JIT Provisioning)](#test-scenario-2-new-user-registration-jit-provisioning)
3. [Test Scenario 3: Existing User Login](#test-scenario-3-existing-user-login)
4. [Test Scenario 4: SSO Enforced Domain](#test-scenario-4-sso-enforced-domain)
5. [Test Scenario 5: SSO Optional Domain](#test-scenario-5-sso-optional-domain)
6. [Test Scenario 6: Unknown Domain](#test-scenario-6-unknown-domain)
7. [Test Scenario 7: Token Structure Validation](#test-scenario-7-token-structure-validation)
8. [Test Scenario 8: MongoDB Data Persistence](#test-scenario-8-mongodb-data-persistence)

---

# Test Scenario 1: Domain Discovery

## 🎯 What We're Testing
When a user enters their email, the system extracts the domain and checks if it's configured in the HPE API.

## 📝 Test Steps

### Step 1: Open Test Client
```
http://localhost:3000
```

### Step 2: Enter Email
```
test@webalive.com.au
```

### Step 3: Click "Continue"

## ✅ Expected Behavior

**What Should Happen:**
1. Email is submitted to Keycloak
2. Keycloak redirects to login page with `login_hint` parameter
3. User sees Keycloak login page

**Behind the Scenes (Not Visible to User):**
- Keycloak hasn't called HPE API yet
- Domain discovery happens AFTER authentication (in Event Listener)

## 🔍 How to Verify

### Check 1: URL Parameters
After clicking "Continue", check browser URL:
```
http://localhost:8080/realms/hykmah/protocol/openid-connect/auth?
  client_id=hykmah-test-app
  &login_hint=test@webalive.com.au  ← Email is passed
```

**✓ Correct if:** `login_hint` contains the email you entered

### Check 2: Keycloak Logs
Look at Keycloak terminal output:
```bash
# No HPE API calls yet - domain discovery happens AFTER login
```

## 📍 Code Location

**Where This Happens:**

1. **Test Client App** (`test-client-app/index.html:52-60`)
```javascript
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = emailInput.value;
  // Construct authorization URL with login_hint
  const authUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth?` +
    `client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&` +
    `scope=openid profile email&login_hint=${encodeURIComponent(email)}`;
  window.location.href = authUrl;  // Redirect to Keycloak
});
```

**Why This is Correct:**
- Email is passed to Keycloak via `login_hint` parameter
- Domain discovery happens server-side after authentication (not at this stage)

---

# Test Scenario 2: New User Registration (JIT Provisioning)

## 🎯 What We're Testing
When a new user registers in Keycloak, they should be automatically created in the HPE backend (MongoDB).

## 📝 Test Steps

### Step 1: Clear Existing User (if testing again)

Open MongoDB Compass:
- Connect to `mongodb://127.0.0.1:27017`
- Database: `hykmah-hpe`
- Collection: `users`
- Delete user with email `newuser@gmail.com` (if exists)

### Step 2: Open Test Client
```
http://localhost:3000
```

### Step 3: Enter New Email
```
newuser@gmail.com
```

### Step 4: Click "Register"
- Fill in: First Name, Last Name, Password
- Click "Register"

### Step 5: Verify Registration Success
- You should be redirected back to test client
- You should see a JWT token displayed

## ✅ Expected Behavior

**What Should Happen:**
1. User registers in Keycloak → Keycloak creates local account
2. Keycloak fires `REGISTER` event → HpeEventListener catches it
3. Event Listener extracts domain from email (`gmail.com`)
4. Event Listener calls HPE API `/api/domains/gmail.com`
5. HPE API returns company info (company_id: `GMAIL001`)
6. Event Listener calls HPE API `/api/users` to create user
7. User is stored in MongoDB with company_id
8. Keycloak redirects back to app with tokens

## 🔍 How to Verify

### Check 1: Keycloak Logs
Look at Keycloak terminal output:
```
[HPE Event Listener] Event: REGISTER, User ID: abc123, Email: newuser@gmail.com
[HPE Event Listener] Domain lookup: gmail.com
[HPE Event Listener] → Domain found: gmail.com, Company: GMAIL001 (Gmail Users Company)
[HPE Event Listener] → Creating user in HPE backend...
[HPE Event Listener] ✓ User created successfully in HPE backend
```

**✓ Correct if:** You see all these log messages

### Check 2: Mock HPE API Logs
Look at Mock HPE API terminal output:
```
[2025-11-25T10:00:00.000Z] GET /api/domains/gmail.com
  ✅ Domain found: gmail.com → SSO Enforced: false, IdP: google

[2025-11-25T10:00:00.100Z] POST /api/users
  ✅ User created: newuser@gmail.com (local) → Company: GMAIL001
```

**✓ Correct if:** You see domain lookup followed by user creation

### Check 3: MongoDB Compass
Open MongoDB Compass and check:

**Database:** `hykmah-hpe`
**Collection:** `users`

Find document with email `newuser@gmail.com`:
```json
{
  "_id": ObjectId("..."),
  "email": "newuser@gmail.com",
  "name": "New User",
  "idp": "local",
  "idp_sub": null,
  "email_verified": false,
  "company_id": "GMAIL001",  ← Should match domain's company
  "status": "ACTIVE",
  "created_at": ISODate("2025-11-25T10:00:00.000Z"),
  "last_login_at": ISODate("2025-11-25T10:00:00.000Z"),
  "updated_at": ISODate("2025-11-25T10:00:00.000Z")
}
```

**✓ Correct if:**
- `email` matches what you registered
- `company_id` is `GMAIL001` (from domain lookup)
- `idp` is `local` (not SSO)
- `status` is `ACTIVE`

### Check 4: API Query
You can also query via API:
```bash
curl http://localhost:3001/api/users?email=newuser@gmail.com
```

Expected response:
```json
{
  "id": "6743e7f8a1b2c3d4e5f60001",
  "email": "newuser@gmail.com",
  "name": "New User",
  "idp": "local",
  "idp_sub": null,
  "email_verified": false,
  "company_id": "GMAIL001",
  "status": "ACTIVE",
  "created_at": "2025-11-25T10:00:00.000Z",
  "last_login_at": "2025-11-25T10:00:00.000Z"
}
```

## 📍 Code Location

**Where This Happens:**

### 1. Event Listener Catches Registration
**File:** `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeEventListener.java:38-46`

```java
@Override
public void onEvent(Event event) {
    if (event.getType() == EventType.REGISTER ||
        event.getType() == EventType.LOGIN) {

        // Get user details from Keycloak
        UserModel user = session.users().getUserById(realm, event.getUserId());
        String email = user.getEmail();

        // Extract domain from email
        String domain = extractDomain(email);
```

**Why This Works:**
- Keycloak fires `REGISTER` event after successful registration
- Event Listener intercepts it before completing the flow

### 2. Domain Lookup
**File:** `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeEventListener.java:75-95`

```java
private DomainConfig lookupDomain(String domain) {
    try {
        String url = HPE_API_BASE_URL + "/api/domains/" + domain;
        HttpGet request = new HttpGet(url);

        HttpResponse response = httpClient.execute(request);
        int statusCode = response.getStatusLine().getStatusCode();

        if (statusCode == 200) {
            // Domain found - parse JSON response
            String jsonResponse = EntityUtils.toString(response.getEntity());
            return parseDomainConfig(jsonResponse);
        } else {
            // Domain not found
            return null;
        }
    } catch (Exception e) {
        logger.error("Error looking up domain", e);
        return null;
    }
}
```

**Why This Works:**
- Makes HTTP GET call to Mock HPE API
- Returns domain configuration if found
- Returns null if domain not configured

### 3. JIT User Provisioning
**File:** `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeEventListener.java:100-135`

```java
private void provisionUserInHpe(UserModel user, DomainConfig domainConfig) {
    try {
        String url = HPE_API_BASE_URL + "/api/users";
        HttpPost request = new HttpPost(url);
        request.setHeader("Content-Type", "application/json");

        // Build JSON payload
        String jsonPayload = String.format(
            "{\"email\":\"%s\",\"name\":\"%s\",\"idp\":\"%s\",\"company_id\":\"%s\"}",
            user.getEmail(),
            user.getFirstName() + " " + user.getLastName(),
            "local",  // or domainConfig.getIdpAlias() if SSO
            domainConfig.getCompanyId()
        );

        request.setEntity(new StringEntity(jsonPayload));
        HttpResponse response = httpClient.execute(request);

        if (statusCode == 201) {
            logger.info("✓ User created successfully in HPE backend");
        } else if (statusCode == 409) {
            logger.info("User already exists in HPE backend");
        }
    } catch (Exception e) {
        logger.error("Error provisioning user", e);
    }
}
```

**Why This Works:**
- Sends POST request to `/api/users` with user details
- Includes `company_id` from domain lookup
- HPE API stores user in MongoDB
- Handles conflict (409) if user already exists

### 4. Mock HPE API - User Creation
**File:** `mock-hpe-api/server-mongodb.js:275-317`

```javascript
app.post('/api/users', async (req, res) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({
      email: req.body.email.toLowerCase()
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        user: { id: existingUser._id.toString(), ... }
      });
    }

    // Create new user in MongoDB
    const newUser = new User({
      email: req.body.email.toLowerCase(),
      name: req.body.name || req.body.email.split('@')[0],
      idp: req.body.idp || 'local',
      idp_sub: req.body.idp_sub || null,
      email_verified: req.body.email_verified || false,
      company_id: req.body.company_id || null,  ← From domain lookup
      status: req.body.status || 'ACTIVE'
    });

    await newUser.save();  // Save to MongoDB

    res.status(201).json({ ... });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Why This Works:**
- Uses Mongoose to save user to MongoDB
- Stores `company_id` received from Event Listener
- Returns 409 if user already exists (idempotent)
- Automatically adds timestamps (created_at, updated_at)

---

# Test Scenario 3: Existing User Login

## 🎯 What We're Testing
When an existing user logs in, they should NOT be re-created in HPE backend (idempotent).

## 📝 Test Steps

### Step 1: Ensure User Exists
Use user from Test Scenario 2: `newuser@gmail.com`

Or verify in MongoDB Compass:
- Database: `hykmah-hpe` → Collection: `users`
- Check user exists

### Step 2: Open Test Client (New Incognito/Private Window)
```
http://localhost:3000
```

### Step 3: Login with Existing Email
```
newuser@gmail.com
```

### Step 4: Enter Password and Login

## ✅ Expected Behavior

**What Should Happen:**
1. User logs in to Keycloak
2. Keycloak fires `LOGIN` event
3. Event Listener checks if user exists in HPE backend
4. HPE API returns existing user (409 or 200)
5. Event Listener doesn't create duplicate user
6. User gets tokens and is redirected

## 🔍 How to Verify

### Check 1: Keycloak Logs
Look at Keycloak terminal:
```
[HPE Event Listener] Event: LOGIN, User ID: abc123, Email: newuser@gmail.com
[HPE Event Listener] Domain lookup: gmail.com
[HPE Event Listener] → Domain found: gmail.com, Company: GMAIL001
[HPE Event Listener] → User already exists in HPE backend
```

**✓ Correct if:** Message says "User already exists"

### Check 2: Mock HPE API Logs
```
[2025-11-25T10:05:00.000Z] GET /api/domains/gmail.com
  ✅ Domain found: gmail.com

[2025-11-25T10:05:00.100Z] POST /api/users
  ⚠️  User already exists: newuser@gmail.com
```

**✓ Correct if:** Message says "User already exists"

### Check 3: MongoDB Compass
Check the `users` collection:
- Should still have only ONE document for `newuser@gmail.com`
- `last_login_at` should be updated to current time
- `created_at` should remain the original time

**✓ Correct if:** Only one user document, no duplicates

### Check 4: Count User Documents
```bash
# Count users with this email (should be 1)
curl -s http://localhost:3001/api/users?email=newuser@gmail.com | grep -o "\"email\"" | wc -l
```

Expected: `1` (not 2 or more)

## 📍 Code Location

**Where This Happens:**

### Event Listener - User Creation Logic
**File:** `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeEventListener.java:100-135`

```java
private void provisionUserInHpe(UserModel user, DomainConfig domainConfig) {
    // ... (POST request to /api/users)

    int statusCode = response.getStatusLine().getStatusCode();

    if (statusCode == 201) {
        logger.info("✓ User created successfully");
    } else if (statusCode == 409) {
        logger.info("User already exists in HPE backend");  ← This branch
    } else {
        logger.error("Unexpected response: " + statusCode);
    }
}
```

**Why This Works:**
- Always tries to create user (POST /api/users)
- HPE API checks if user exists and returns 409
- Event Listener handles 409 gracefully (not an error)

### Mock HPE API - Duplicate Check
**File:** `mock-hpe-api/server-mongodb.js:277-289`

```javascript
app.post('/api/users', async (req, res) => {
  // Check if user already exists
  const existingUser = await User.findOne({
    email: req.body.email.toLowerCase()
  });

  if (existingUser) {
    console.log(`  ⚠️  User already exists: ${req.body.email}`);
    return res.status(409).json({  ← HTTP 409 Conflict
      error: 'User already exists',
      user: {
        id: existingUser._id.toString(),
        email: existingUser.email,
        name: existingUser.name
      }
    });
  }

  // ... create new user
});
```

**Why This Works:**
- MongoDB `findOne()` checks for existing email
- Returns 409 Conflict status code (standard HTTP for "resource already exists")
- Returns existing user data (useful for sync)

---

# Test Scenario 4: SSO Enforced Domain

## 🎯 What We're Testing
When a user's domain requires SSO (sso_enforced: true), they should be redirected to external IdP.

## 📝 Test Steps

### Step 1: Check Domain Configuration
Verify `webalive.com.au` has SSO enforced:
```bash
curl http://localhost:3001/api/domains/webalive.com.au
```

Expected response:
```json
{
  "domain": "webalive.com.au",
  "company_id": "CA341B",
  "company_name": "WebAlive",
  "sso_enforced": true,  ← SSO is enforced
  "idp_alias": "azuread-webalive"
}
```

### Step 2: Open Test Client
```
http://localhost:3000
```

### Step 3: Enter SSO-Enforced Email
```
test@webalive.com.au
```

### Step 4: Observe Redirect Behavior

## ✅ Expected Behavior

**What Should Happen:**
1. User enters email and clicks "Continue"
2. Keycloak login page shows
3. **Password login should be disabled** (or auto-redirect to Azure AD)
4. User should see "Sign in with Azure AD" button
5. Clicking it redirects to Azure AD login

**Note:** Since Azure AD isn't configured in this test setup, you'll see an error. This is expected!

## 🔍 How to Verify

### Check 1: Domain Lookup
Mock HPE API should log:
```
[2025-11-25T10:10:00.000Z] GET /api/domains/webalive.com.au
  ✅ Domain found: webalive.com.au → SSO Enforced: true, IdP: azuread-webalive
```

**✓ Correct if:** `SSO Enforced: true`

### Check 2: MongoDB - Domain Collection
MongoDB Compass → Database: `hykmah-hpe` → Collection: `domains`

Find `webalive.com.au`:
```json
{
  "_id": ObjectId("..."),
  "domain": "webalive.com.au",
  "company_id": "CA341B",
  "company_name": "WebAlive",
  "sso_enforced": true,  ← This enforces SSO
  "idp_alias": "azuread-webalive",  ← IdP to redirect to
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

**✓ Correct if:** `sso_enforced: true` and `idp_alias` is set

### Check 3: Keycloak Behavior (Conceptual)
**Note:** In a full production setup:
- Keycloak would check `sso_enforced` flag
- Automatically redirect to Azure AD (`idp_alias: azuread-webalive`)
- Skip local password login

**In this test setup:**
- Domain lookup works ✓
- Data is in MongoDB ✓
- But automatic redirect requires additional Keycloak configuration (Authentication Flow)

## 📍 Code Location

**Where This Data is Used:**

### 1. Domain Configuration Storage
**File:** `mock-hpe-api/server-mongodb.js:66-87`

```javascript
// Seed domains
await Domain.insertMany([
  {
    domain: 'webalive.com.au',
    company_id: 'CA341B',
    company_name: 'WebAlive',
    sso_enforced: true,  ← This field controls SSO enforcement
    idp_alias: 'azuread-webalive'  ← Which IdP to use
  },
  // ... other domains
]);
```

### 2. Domain Lookup API
**File:** `mock-hpe-api/server-mongodb.js:152-177`

```javascript
app.get('/api/domains/:domain', async (req, res) => {
  const { domain } = req.params;
  const config = await Domain.findOne({ domain: domain.toLowerCase() });

  if (!config) {
    return res.status(404).json({ error: 'Domain not found' });
  }

  console.log(`  ✅ Domain found: ${domain} → SSO Enforced: ${config.sso_enforced}`);

  res.json({
    domain: config.domain,
    company_id: config.company_id,
    company_name: config.company_name,
    sso_enforced: config.sso_enforced,  ← Returned to caller
    idp_alias: config.idp_alias
  });
});
```

**Why This Works:**
- MongoDB stores domain configuration with `sso_enforced` flag
- API returns this flag to Keycloak
- In production, Keycloak Authentication Flow would use this to decide:
  - `sso_enforced: true` → Skip password form, redirect to IdP
  - `sso_enforced: false` → Show password form

### 3. MongoDB Schema
**File:** `mock-hpe-api/models/Domain.js:8-11`

```javascript
const domainSchema = new mongoose.Schema({
  domain: { type: String, required: true, unique: true, lowercase: true },
  company_id: { type: String, default: null },
  company_name: { type: String, default: null },
  sso_enforced: { type: Boolean, default: false },  ← Boolean flag
  idp_alias: { type: String, default: null },
  // ...
});
```

**Why This is Correct:**
- `sso_enforced` is a boolean (true/false)
- Defaults to `false` (password login allowed)
- `idp_alias` stores which Identity Provider to use (e.g., 'google', 'azuread-webalive')

---

# Test Scenario 5: SSO Optional Domain

## 🎯 What We're Testing
When a user's domain allows optional SSO (sso_enforced: false), they can choose password OR SSO.

## 📝 Test Steps

### Step 1: Check Domain Configuration
```bash
curl http://localhost:3001/api/domains/gmail.com
```

Expected:
```json
{
  "domain": "gmail.com",
  "company_id": "GMAIL001",
  "company_name": "Gmail Users Company",
  "sso_enforced": false,  ← SSO is optional
  "idp_alias": "google"
}
```

### Step 2: Test with Gmail Email
```
http://localhost:3000
```

Enter: `newuser@gmail.com`

### Step 3: Observe Login Options

## ✅ Expected Behavior

**What Should Happen:**
- User can see password login form ✓
- User can also see "Sign in with Google" button ✓
- User can choose either method

**In this test setup:**
- Password login works ✓
- Google SSO button visible (but Google auth not configured)

## 🔍 How to Verify

### Check 1: Domain Lookup
```
[2025-11-25T10:15:00.000Z] GET /api/domains/gmail.com
  ✅ Domain found: gmail.com → SSO Enforced: false, IdP: google
```

**✓ Correct if:** `SSO Enforced: false`

### Check 2: MongoDB Data
Collection: `domains` → Find `gmail.com`:
```json
{
  "domain": "gmail.com",
  "sso_enforced": false,  ← SSO is optional, not required
  "idp_alias": "google"
}
```

### Check 3: User Can Login with Password
- Enter email: `newuser@gmail.com`
- Enter password
- Click "Sign In"
- Should successfully login ✓

**✓ Correct if:** Password login works

## 📍 Code Location

Same as Test Scenario 4, but with `sso_enforced: false`:

**File:** `mock-hpe-api/server-mongodb.js:88-94`

```javascript
{
  domain: 'gmail.com',
  company_id: 'GMAIL001',
  company_name: 'Gmail Users Company',
  sso_enforced: false,  ← This allows password login
  idp_alias: 'google'   ← But Google SSO is also available
}
```

**Why This Works:**
- `sso_enforced: false` means password login is allowed
- `idp_alias: 'google'` means Google SSO is also available as an option
- User can choose either method

---

# Test Scenario 6: Unknown Domain

## 🎯 What We're Testing
When a user's domain is not configured in HPE backend, system should handle gracefully.

## 📝 Test Steps

### Step 1: Enter Unknown Domain Email
```
http://localhost:3000
```

Enter: `user@unknowncompany.com`

### Step 2: Complete Registration

### Step 3: Check What Happens

## ✅ Expected Behavior

**What Should Happen:**
1. User can register in Keycloak ✓
2. Event Listener looks up domain: `unknowncompany.com`
3. HPE API returns 404 (domain not found)
4. Event Listener logs error but doesn't block registration
5. User is NOT created in HPE backend
6. User still gets Keycloak account (but no company_id)

## 🔍 How to Verify

### Check 1: Keycloak Logs
```
[HPE Event Listener] Event: REGISTER, User ID: xyz789, Email: user@unknowncompany.com
[HPE Event Listener] Domain lookup: unknowncompany.com
[HPE Event Listener] ⚠️  Domain not found: unknowncompany.com
[HPE Event Listener] Skipping HPE provisioning for unknown domain
```

**✓ Correct if:** Warning logged but registration completes

### Check 2: Mock HPE API Logs
```
[2025-11-25T10:20:00.000Z] GET /api/domains/unknowncompany.com
  ⚠️  Domain not found: unknowncompany.com
```

**✓ Correct if:** 404 response

### Check 3: MongoDB - No User Created
MongoDB Compass → Collection: `users`

Search for `user@unknowncompany.com`:
- Should return NO results ✓

**✓ Correct if:** User doesn't exist in HPE backend

### Check 4: User Can Still Login to Keycloak
- User has Keycloak account
- User can login and get tokens
- But no company/role data available

## 📍 Code Location

**Where This Happens:**

### 1. Domain Lookup Returns 404
**File:** `mock-hpe-api/server-mongodb.js:157-163`

```javascript
app.get('/api/domains/:domain', async (req, res) => {
  const config = await Domain.findOne({ domain: domain.toLowerCase() });

  if (!config) {
    console.log(`  ⚠️  Domain not found: ${domain}`);
    return res.status(404).json({  ← HTTP 404 Not Found
      error: 'Domain not found',
      message: `No configuration found for domain: ${domain}`
    });
  }
  // ...
});
```

### 2. Event Listener Handles Missing Domain
**File:** `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeEventListener.java:75-95`

```java
private DomainConfig lookupDomain(String domain) {
    try {
        HttpResponse response = httpClient.execute(request);
        int statusCode = response.getStatusLine().getStatusCode();

        if (statusCode == 200) {
            return parseDomainConfig(jsonResponse);
        } else {
            logger.warn("Domain not found: " + domain);
            return null;  ← Returns null for unknown domains
        }
    } catch (Exception e) {
        logger.error("Error looking up domain", e);
        return null;
    }
}
```

### 3. Skip Provisioning if Domain Unknown
**File:** `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeEventListener.java:48-58`

```java
@Override
public void onEvent(Event event) {
    // ... get user, extract domain

    DomainConfig domainConfig = lookupDomain(domain);

    if (domainConfig == null) {
        logger.warn("Skipping HPE provisioning for unknown domain: " + domain);
        return;  ← Exit early, don't create user in HPE
    }

    // Only provision if domain is known
    provisionUserInHpe(user, domainConfig);
}
```

**Why This is Correct:**
- Unknown domains don't block Keycloak registration
- Event Listener fails gracefully (logs warning, doesn't throw exception)
- User can still use Keycloak for authentication
- But won't have access to company resources (no company_id)

---

# Test Scenario 7: Token Structure Validation

## 🎯 What We're Testing
JWT tokens should contain standard OIDC claims and (eventually) custom claims from HPE backend.

## 📝 Test Steps

### Step 1: Login and Get Token
```
http://localhost:3000
```

Login with: `newuser@gmail.com`

### Step 2: Copy Access Token
After successful login, copy the `access_token` displayed on the page.

### Step 3: Decode Token
Visit: https://jwt.io

Paste your token in the "Encoded" section.

## ✅ Expected Behavior

**Current Behavior (Protocol Mapper NOT configured):**

Token should contain:
```json
{
  "exp": 1732530000,
  "iat": 1732529700,
  "jti": "abc123-...",
  "iss": "http://localhost:8080/realms/hykmah",
  "aud": "account",
  "sub": "user-id-123",
  "typ": "Bearer",
  "azp": "hykmah-test-app",
  "session_state": "...",
  "acr": "1",
  "realm_access": {
    "roles": ["default-roles-hykmah", "offline_access"]
  },
  "scope": "openid profile email",
  "email_verified": false,
  "name": "New User",
  "preferred_username": "newuser@gmail.com",
  "given_name": "New",
  "family_name": "User",
  "email": "newuser@gmail.com"
}
```

**After Protocol Mapper is Configured:**

Token should also include:
```json
{
  // ... (all above claims) ...

  "company_id": "GMAIL001",  ← From HPE backend
  "company_name": "Gmail Users Company",
  "company_roles": [
    {
      "role": "User",
      "product_id": 1
    }
  ]
}
```

## 🔍 How to Verify

### Check 1: Standard Claims Present
**✓ Required Claims:**
- `sub` (Subject - User ID)
- `email` (User's email address)
- `name` (User's full name)
- `iss` (Issuer - Keycloak realm URL)
- `aud` (Audience - Client ID)
- `exp` (Expiration timestamp)
- `iat` (Issued at timestamp)

**✓ Correct if:** All these claims are present

### Check 2: Custom Claims (After Protocol Mapper Setup)
**✓ Expected Custom Claims:**
- `company_id`: Should match company from domain lookup
- `company_name`: Human-readable company name
- `company_roles`: Array of user's roles

**✓ Correct if:** These appear after configuring Protocol Mapper

### Check 3: Token Expiration
Check `exp` claim:
```javascript
// In browser console
const token = "eyJhbG..."; // Your token
const decoded = JSON.parse(atob(token.split('.')[1]));
const expiresAt = new Date(decoded.exp * 1000);
console.log("Token expires at:", expiresAt);
```

**✓ Correct if:** Expiration is in the future (typically 5-15 minutes)

## 📍 Code Location

**Where Token is Created:**

### 1. Keycloak Standard Token Generation
Keycloak automatically adds standard OIDC claims:
- User attributes (email, name)
- Session info (session_state)
- Realm roles (realm_access)
- Client scopes (scope)

**No custom code needed for standard claims.**

### 2. Custom Claims via Protocol Mapper
**File:** `keycloak-extensions/src/main/java/com/hykmah/keycloak/HpeProtocolMapper.java:50-95`

```java
@Override
protected void setClaim(
    IDToken token,
    ProtocolMapperModel mappingModel,
    UserSessionModel userSession,
    KeycloakSession keycloakSession,
    ClientSessionContext clientSessionCtx
) {
    // Get user email
    UserModel user = userSession.getUser();
    String email = user.getEmail();

    // Extract domain
    String domain = extractDomain(email);

    // Lookup domain in HPE API
    DomainConfig domainConfig = lookupDomain(domain);

    // Query user data from HPE API
    String userId = queryUserByEmail(email);

    // Get user roles from HPE API
    UserRoles roles = getUserRoles(userId);

    // Add custom claims to token
    token.getOtherClaims().put("company_id", roles.getCompanyId());
    token.getOtherClaims().put("company_name", roles.getCompanyName());
    token.getOtherClaims().put("company_roles", roles.getCompanyRoles());
}
```

**Why This Works:**
- Protocol Mapper runs during token generation
- Makes HTTP calls to HPE API to get user data
- Adds custom claims to `token.getOtherClaims()`
- These claims appear in the final JWT token

### 3. HPE API - User Roles Endpoint
**File:** `mock-hpe-api/server-mongodb.js:403-449`

```javascript
app.get('/api/users/:userId/roles', async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get company details
  let companyName = null;
  let companyOwner = false;

  if (user.company_id) {
    const company = await Company.findOne({ company_id: user.company_id });
    if (company) {
      companyName = company.name;
      companyOwner = company.owner_id === userId;
    }
  }

  // Get company roles
  const companyRoles = await CompanyRole.find({ user_id: userId });

  // Return role data
  res.json({
    company_id: user.company_id,
    company_name: companyName,
    company_owner: companyOwner,
    company_roles: companyRoles.map(cr => ({
      role: cr.role,
      product_id: cr.product_id
    }))
  });
});
```

**Why This Works:**
- Queries MongoDB for user by ID
- Joins with Company collection to get company name
- Joins with CompanyRole collection to get user's roles
- Returns all data in one response (efficient)

---

# Test Scenario 8: MongoDB Data Persistence

## 🎯 What We're Testing
All data should be persisted in MongoDB and survive server restarts.

## 📝 Test Steps

### Step 1: Create Test User
Register a new user: `persistence@test.com`

### Step 2: Verify User in MongoDB
Open MongoDB Compass:
- Database: `hykmah-hpe`
- Collection: `users`
- Find: `persistence@test.com`

### Step 3: Restart Mock HPE API
Kill and restart the server:
```bash
# The server will automatically restart
# Or manually: Ctrl+C and then npm start
```

### Step 4: Query User Again
```bash
curl http://localhost:3001/api/users?email=persistence@test.com
```

### Step 5: Restart MongoDB Service
```bash
# Stop MongoDB
net stop MongoDB

# Start MongoDB
net start MongoDB
```

### Step 6: Query User Again
```bash
curl http://localhost:3001/api/users?email=persistence@test.com
```

## ✅ Expected Behavior

**What Should Happen:**
- User exists after Mock API restart ✓
- User exists after MongoDB restart ✓
- All data (domains, companies, roles) persists ✓

## 🔍 How to Verify

### Check 1: After Mock API Restart
```bash
curl http://localhost:3001/api/users?email=persistence@test.com
```

Expected response:
```json
{
  "id": "...",
  "email": "persistence@test.com",
  "name": "...",
  "company_id": "...",
  "status": "ACTIVE"
}
```

**✓ Correct if:** User data is returned (not 404)

### Check 2: After MongoDB Restart
Same as Check 1.

**✓ Correct if:** Data is still there

### Check 3: MongoDB Compass
After all restarts, check MongoDB Compass:
- All collections still have data
- No data loss

### Check 4: Seed Data Not Duplicated
After restarting Mock API multiple times:
```bash
# Count domains
curl http://localhost:3001/api/domains/gmail.com
```

**✓ Correct if:** Only 4 domains exist (not duplicated on each restart)

## 📍 Code Location

**Where Persistence Happens:**

### 1. MongoDB Connection
**File:** `mock-hpe-api/server-mongodb.js:41-53`

```javascript
async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);  ← Connects to MongoDB
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${MONGODB_URI}`);

    await seedInitialData();  ← Seeds data if empty
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}
```

**Why This Works:**
- Mongoose connects to MongoDB at `127.0.0.1:27017`
- MongoDB stores data on disk (not in memory)
- Data persists across restarts

### 2. Seed Data (Idempotent)
**File:** `mock-hpe-api/server-mongodb.js:57-137`

```javascript
async function seedInitialData() {
  try {
    // Check if data already exists
    const domainCount = await Domain.countDocuments();

    if (domainCount === 0) {  ← Only seed if empty
      console.log('🌱 Seeding initial data...');

      await Domain.insertMany([...]);  ← Insert domains
      await Company.insertMany([...]);  ← Insert companies

      console.log('  ✅ Domains seeded');
      console.log('  ✅ Companies seeded');
    } else {
      console.log('  ℹ️  Database already contains data, skipping seed');
    }
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}
```

**Why This Works:**
- Checks `countDocuments()` before seeding
- Only inserts data if collection is empty
- Prevents duplicate seed data on restart

### 3. MongoDB Data Storage Location
MongoDB stores data on disk at:
```
C:\data\db\  (Windows default)
```

Files like:
- `WiredTiger`
- `collection-*.wt` (collection data)
- `index-*.wt` (index data)

**Why This Works:**
- MongoDB writes to disk (durable storage)
- Not stored in memory (would be lost on restart)
- Data survives both app and MongoDB restarts

### 4. Mongoose Schema Validation
**File:** `mock-hpe-api/models/User.js:3-21`

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,  ← Enforces uniqueness in MongoDB
    lowercase: true
  },
  // ... other fields
});

userSchema.index({ email: 1 });  ← Creates MongoDB index
```

**Why This Works:**
- `unique: true` creates unique index in MongoDB
- MongoDB enforces uniqueness at database level
- Prevents duplicate users even if app crashes during creation

---

# 🎓 Summary Table

| Scenario | What to Check | Where Code Lives | Expected Result |
|----------|---------------|------------------|-----------------|
| **1. Domain Discovery** | URL parameters, logs | `test-client-app/index.html:52-60` | `login_hint` parameter present |
| **2. JIT Provisioning** | MongoDB users collection, logs | `HpeEventListener.java:38-135`, `server-mongodb.js:275-317` | New user created with company_id |
| **3. Existing User Login** | MongoDB (no duplicates), logs | Same as #2 + duplicate check | User count stays at 1 |
| **4. SSO Enforced** | MongoDB domains, API response | `server-mongodb.js:66-87`, `models/Domain.js:8-11` | `sso_enforced: true` |
| **5. SSO Optional** | MongoDB domains, login page | Same as #4 | `sso_enforced: false`, password login works |
| **6. Unknown Domain** | Logs (warning), MongoDB (no user) | `HpeEventListener.java:48-58`, `server-mongodb.js:157-163` | 404 response, no HPE user created |
| **7. Token Structure** | jwt.io decoder, token claims | `HpeProtocolMapper.java:50-95`, `server-mongodb.js:403-449` | Standard claims + custom claims (after mapper setup) |
| **8. Data Persistence** | MongoDB Compass after restart | `server-mongodb.js:41-53`, `57-137` | All data survives restarts |

---

# 🔧 Quick Test Commands

### Health Check
```bash
curl http://localhost:3001/health
```

### Domain Lookup
```bash
curl http://localhost:3001/api/domains/gmail.com
curl http://localhost:3001/api/domains/webalive.com.au
```

### User Query
```bash
curl "http://localhost:3001/api/users?email=newuser@gmail.com"
```

### Company Lookup
```bash
curl http://localhost:3001/api/companies/GMAIL001
```

### User Roles (need user ID)
```bash
# Get user ID first
USER_ID=$(curl -s "http://localhost:3001/api/users?email=newuser@gmail.com" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

# Get roles
curl "http://localhost:3001/api/users/$USER_ID/roles"
```

---

# 📊 Monitoring All Services

Open 4 terminal windows to monitor:

**Terminal 1: Keycloak Logs**
```bash
cd C:\Users\siam\Desktop\keycloak-test\keycloak-26.4.5\bin
# Watch for: [HPE Event Listener] messages
```

**Terminal 2: Mock HPE API Logs**
```bash
cd C:\Users\siam\Desktop\keycloak-test\mock-hpe-api
# Watch for: GET/POST requests and ✅/⚠️ messages
```

**Terminal 3: MongoDB Compass**
```
Open MongoDB Compass
Connect: mongodb://127.0.0.1:27017
Database: hykmah-hpe
Refresh collections to see real-time changes
```

**Terminal 4: Test Commands**
```bash
# Run curl commands to test APIs
```

---

# 🐛 Common Issues and Solutions

### Issue: "User not created in MongoDB"
**Check:**
1. Keycloak logs - Did Event Listener fire?
2. Mock API logs - Did it receive POST /api/users?
3. MongoDB Compass - Is service running?

**Solution:** Check domain lookup succeeded first

### Issue: "Domain not found"
**Check:**
```bash
curl http://localhost:3001/api/domains/YOUR_DOMAIN
```

**Solution:** Add domain via API:
```bash
curl -X POST http://localhost:3001/api/domains \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com","company_id":"EX001","company_name":"Example Inc","sso_enforced":false}'
```

### Issue: "Token missing custom claims"
**Reason:** Protocol Mapper not configured yet

**Solution:** Follow "Step 3: Configure Protocol Mapper" in next section

---

# ✅ Test Checklist

Copy this checklist for manual testing:

- [ ] Test Scenario 1: Domain Discovery
  - [ ] URL contains `login_hint` parameter
  - [ ] Email is passed to Keycloak correctly

- [ ] Test Scenario 2: New User Registration
  - [ ] User created in MongoDB
  - [ ] `company_id` matches domain's company
  - [ ] Keycloak and API logs show success

- [ ] Test Scenario 3: Existing User Login
  - [ ] No duplicate users in MongoDB
  - [ ] Logs show "User already exists"

- [ ] Test Scenario 4: SSO Enforced Domain
  - [ ] Domain has `sso_enforced: true`
  - [ ] API returns correct IdP alias

- [ ] Test Scenario 5: SSO Optional Domain
  - [ ] Domain has `sso_enforced: false`
  - [ ] Password login works

- [ ] Test Scenario 6: Unknown Domain
  - [ ] Domain lookup returns 404
  - [ ] User NOT created in HPE backend
  - [ ] Keycloak registration still succeeds

- [ ] Test Scenario 7: Token Structure
  - [ ] Standard OIDC claims present
  - [ ] Token is valid (not expired)

- [ ] Test Scenario 8: Data Persistence
  - [ ] Data survives Mock API restart
  - [ ] Data survives MongoDB restart
  - [ ] Seed data not duplicated

---

**Next:** Configure Protocol Mapper to add custom claims to tokens (Test Scenario 7 full test)
