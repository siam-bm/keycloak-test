# ✅ Keycloak Testing Checklist

Use this checklist to systematically test all features of the Hykmah Identity Platform flow.

## Pre-Testing Setup

- [ ] Keycloak running on http://localhost:8080
- [ ] Mock HPE API running on http://localhost:3001
- [ ] Test client app running on http://localhost:3000
- [ ] Custom SPIs built and deployed
- [ ] Event Listener `hpe-provisioning` enabled in Keycloak
- [ ] Protocol Mapper `HPE Roles` configured in client scope

## Test Suite 1: Basic Authentication Flow

### Test 1.1: Email Entry & Redirect
- [ ] Open http://localhost:3000
- [ ] Enter email: `test@example.com`
- [ ] Click "Continue to Login"
- [ ] **Expected:** Redirected to Keycloak login page
- [ ] **Expected:** Email pre-filled in login form (login_hint parameter)

### Test 1.2: Local User Registration
- [ ] On Keycloak login page, click "Register"
- [ ] Fill in registration form:
  - Email: `newuser@example.com`
  - First name: `New`
  - Last name: `User`
  - Password: `password123`
- [ ] Submit registration
- [ ] **Expected:** Redirected back to test app
- [ ] **Expected:** User info displayed with token

### Test 1.3: Local User Login (Existing User)
- [ ] Logout from test app
- [ ] Enter email: `newuser@example.com`
- [ ] Click "Continue to Login"
- [ ] Enter credentials and login
- [ ] **Expected:** Successful login with token

### Test 1.4: Token Structure Validation
- [ ] After login, click "🔍 Decode at JWT.io"
- [ ] Verify token contains standard claims:
  - [ ] `sub` (user ID)
  - [ ] `email`
  - [ ] `email_verified`
  - [ ] `name`
  - [ ] `iss` (issuer = Keycloak)
  - [ ] `aud` (audience = client ID)
  - [ ] `exp` (expiration)

## Test Suite 2: JIT User Provisioning

### Test 2.1: User Created in HPE Database (Registration)
- [ ] After registration, check Mock API logs
- [ ] **Expected:** See log: `✅ User created in HPE: newuser@example.com`
- [ ] Verify in API:
  ```cmd
  curl http://localhost:3001/api/users?email=newuser@example.com
  ```
- [ ] **Expected:** User record returned with:
  - [ ] `idp: "local"`
  - [ ] `email_verified: true/false`
  - [ ] `status: "ACTIVE"`
  - [ ] `company_id: null` (or personal company ID)

### Test 2.2: Company Assignment (Unknown Domain)
- [ ] Register user with unknown domain: `user@unknowndomain.com`
- [ ] Check Mock API logs
- [ ] **Expected:** Personal company created
- [ ] Verify:
  ```cmd
  curl http://localhost:3001/api/users?email=user@unknowndomain.com
  ```
- [ ] **Expected:** User has `company_id` assigned

### Test 2.3: Company Assignment (Known Domain)
- [ ] Register user: `employee@testcorp.com`
- [ ] Check Mock API logs
- [ ] **Expected:** User assigned to existing company `TC123456`
- [ ] Verify:
  ```cmd
  curl http://localhost:3001/api/users?email=employee@testcorp.com
  ```
- [ ] **Expected:** `company_id: "TC123456"`

### Test 2.4: Last Login Update (Returning User)
- [ ] Login again with existing user
- [ ] Check Mock API logs
- [ ] **Expected:** See: `⚠️ User already exists in HPE`
- [ ] **Expected:** `last_login_at` updated

## Test Suite 3: Token Enrichment

### Test 3.1: Custom Claims in Token
- [ ] Login successfully
- [ ] Decode access token at JWT.io
- [ ] Verify custom claims present:
  - [ ] `company_id`
  - [ ] `company_name`
  - [ ] `company_owner` (boolean)
  - [ ] `company_roles` (array)
  - [ ] `product_roles` (array)

### Test 3.2: Protocol Mapper Execution
- [ ] Check Keycloak logs during login
- [ ] **Expected:** See: `🔐 [HPE Protocol Mapper] Enriching token for user: ...`
- [ ] **Expected:** See: `✅ Token enriched with company: ...`

### Test 3.3: Role Data Accuracy
- [ ] Verify `company_roles` array structure:
  ```json
  [
    {"role": "User", "products": ["WC", "EX"]}
  ]
  ```
- [ ] Verify `product_roles` array structure:
  ```json
  [
    {"product": "WC", "groups": ["Engineering", "QA"]},
    {"product": "EX", "groups": ["Sales"]}
  ]
  ```

## Test Suite 4: Domain-Based Routing

### Test 4.1: SSO-Enforced Domain Lookup
- [ ] Add test domain to Mock API:
  ```cmd
  curl -X POST http://localhost:3001/api/domains -H "Content-Type: application/json" -d "{\"domain\":\"ssotest.com\",\"company_id\":\"SSO123\",\"company_name\":\"SSO Test Co\",\"sso_enforced\":true,\"idp_alias\":\"google\"}"
  ```
- [ ] In test app, enter email: `user@ssotest.com`
- [ ] Check Mock API logs
- [ ] **Expected:** See domain lookup: `✅ Domain found: ssotest.com → SSO Enforced: true, IdP: google`

### Test 4.2: Flexible Domain Lookup
- [ ] Add flexible domain:
  ```cmd
  curl -X POST http://localhost:3001/api/domains -H "Content-Type: application/json" -d "{\"domain\":\"flexible.com\",\"company_id\":\"FL789\",\"company_name\":\"Flexible Inc\",\"sso_enforced\":false,\"idp_alias\":\"google\"}"
  ```
- [ ] Enter email: `user@flexible.com`
- [ ] **Expected:** Domain lookup succeeds with `sso_enforced: false`

### Test 4.3: Unknown Domain Handling
- [ ] Enter email: `user@randomdomain.xyz`
- [ ] Check Mock API logs
- [ ] **Expected:** See: `⚠️ Domain not found: randomdomain.xyz`
- [ ] **Expected:** User can still register/login (no SSO enforcement)

## Test Suite 5: Token Operations

### Test 5.1: Token Refresh
- [ ] Login successfully
- [ ] Wait 30 seconds
- [ ] Click "🔄 Refresh Token" button
- [ ] **Expected:** See success message
- [ ] **Expected:** Token updated with new `exp` timestamp
- [ ] Verify new token at JWT.io

### Test 5.2: Token Copy
- [ ] Click "📋 Copy Token" button
- [ ] Paste in notepad
- [ ] **Expected:** Full JWT token copied to clipboard

### Test 5.3: Logout
- [ ] Click "🚪 Logout" button
- [ ] **Expected:** Redirected to login page
- [ ] **Expected:** Session cleared (check browser DevTools → Application → Session Storage)
- [ ] Try accessing protected resource
- [ ] **Expected:** Must login again

## Test Suite 6: Error Handling

### Test 6.1: Invalid Email Format
- [ ] Enter email: `notanemail`
- [ ] **Expected:** Browser validation error (HTML5)

### Test 6.2: Empty Email
- [ ] Leave email blank, click Continue
- [ ] **Expected:** Validation error

### Test 6.3: Wrong Password (Local Login)
- [ ] Enter valid email with wrong password
- [ ] **Expected:** Keycloak error message: "Invalid username or password"

### Test 6.4: Expired Token
- [ ] Manually set `exp` to past timestamp (edit in sessionStorage)
- [ ] Try to refresh token
- [ ] **Expected:** Refresh succeeds OR requires re-login

### Test 6.5: Mock API Down
- [ ] Stop Mock API (Ctrl+C in terminal)
- [ ] Try to register new user
- [ ] Check Keycloak logs
- [ ] **Expected:** See error: `❌ Error creating user in HPE`
- [ ] **Note:** User still created in Keycloak, but not in HPE
- [ ] Restart Mock API

## Test Suite 7: SPI Verification

### Test 7.1: Event Listener Loaded
- [ ] Check Keycloak startup logs:
  ```cmd
  type keycloak-26.4.5\data\log\keycloak.log | findstr "HPE Event Listener"
  ```
- [ ] **Expected:** See: `🔧 [HPE Event Listener] Initialized with API URL: http://localhost:3001`

### Test 7.2: Protocol Mapper Loaded
- [ ] Go to Keycloak Admin → Clients → hykmah-test-app → Client Scopes
- [ ] Click dedicated scope
- [ ] **Expected:** See "HPE Roles" mapper in list
- [ ] Click to edit
- [ ] **Expected:** HPE API URL configured

### Test 7.3: Event Listener Active
- [ ] Go to Realm Settings → Events → Event Listeners
- [ ] **Expected:** `hpe-provisioning` selected

### Test 7.4: Event Listener Logs (Registration)
- [ ] Register new user
- [ ] Check Keycloak logs immediately
- [ ] **Expected:** See sequence:
  ```
  🔔 [HPE Event Listener] Event: REGISTER
  📧 Processing registration for: user@example.com
  ✅ User created in HPE: user@example.com
  ✅ Role assigned: User
  ✅ User provisioned successfully
  ```

### Test 7.5: Protocol Mapper Logs (Login)
- [ ] Login as user
- [ ] Check Keycloak logs
- [ ] **Expected:** See:
  ```
  🔐 [HPE Protocol Mapper] Enriching token for user: user@example.com
  ✅ Token enriched with company: ...
  ```

## Test Suite 8: Mock API Verification

### Test 8.1: Health Check
```cmd
curl http://localhost:3001/health
```
- [ ] **Expected:** `{"status":"ok","timestamp":"..."}`

### Test 8.2: Domain Lookup
```cmd
curl http://localhost:3001/api/domains/testcorp.com
```
- [ ] **Expected:** Returns domain config

### Test 8.3: User Query
```cmd
curl http://localhost:3001/api/users?email=test@example.com
```
- [ ] **Expected:** Returns user data OR 404 if not found

### Test 8.4: User List
```cmd
curl http://localhost:3001/api/users
```
- [ ] **Expected:** Returns array of all users

### Test 8.5: Company Lookup
```cmd
curl http://localhost:3001/api/companies/TC123456
```
- [ ] **Expected:** Returns company data

## Test Suite 9: End-to-End Scenarios

### Scenario A: New Employee Joins SSO Company
1. [ ] Company admin adds domain to Mock API (SSO enforced)
2. [ ] Employee receives invite email with link
3. [ ] Employee clicks link, enters email: `employee@company.com`
4. [ ] System detects domain, auto-redirects to company SSO (e.g., Azure AD)
5. [ ] Employee logs in with corporate credentials
6. [ ] JIT provisioning creates user in HPE database
7. [ ] User assigned to company with default "User" role
8. [ ] Token issued with company + role claims
9. [ ] Employee sees dashboard with appropriate access

**Verify:**
- [ ] User created in Mock API with correct `idp` and `company_id`
- [ ] Token contains correct `company_roles`

### Scenario B: Freelancer Signs Up (Unknown Domain)
1. [ ] User enters email: `freelancer@gmail.com`
2. [ ] Domain not found in Mock API (no SSO)
3. [ ] User chooses "Register" option
4. [ ] Creates account with local password
5. [ ] JIT provisioning creates personal company
6. [ ] User becomes company owner
7. [ ] Token includes `company_owner: true`

**Verify:**
- [ ] Personal company created
- [ ] User is owner: `company_owner: true`

### Scenario C: User Switches Companies (Future Feature)
This requires additional implementation (company selection UI).
For now, verify data structure supports it:
- [ ] User can belong to multiple companies (check database schema)
- [ ] Token claims can represent current company context

## Summary Statistics

Total Tests: **60+**

| Category | Tests | Status |
|----------|-------|--------|
| Basic Auth | 8 | ☐ |
| JIT Provisioning | 8 | ☐ |
| Token Enrichment | 6 | ☐ |
| Domain Routing | 6 | ☐ |
| Token Operations | 6 | ☐ |
| Error Handling | 10 | ☐ |
| SPI Verification | 10 | ☐ |
| Mock API | 10 | ☐ |
| E2E Scenarios | 6 | ☐ |

## Success Criteria

✅ **MVP Ready** if:
- [ ] All Basic Auth tests pass
- [ ] JIT Provisioning works (users auto-created)
- [ ] Token Enrichment works (custom claims present)
- [ ] Domain Routing works (lookup succeeds)
- [ ] Token operations work (refresh, logout)
- [ ] SPIs loaded correctly

🎯 **Production Ready** if:
- [ ] All tests pass
- [ ] Error handling robust
- [ ] Performance acceptable (<2s for full flow)
- [ ] Security validated (no XSS, CSRF, etc.)
- [ ] Monitoring/logging in place

## Notes

- Save test results with timestamps
- Document any failures with screenshots
- Test on different browsers (Chrome, Firefox, Edge)
- Test with different network conditions
- Test concurrent logins (multiple users)

---

**Happy Testing!** 🧪🎉
