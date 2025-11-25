# 🎯 START HERE - Keycloak Local Testing

Welcome! This testing environment lets you validate the **Hykmah Identity Platform** requirements locally before implementing on production.

## 📋 What You Can Test

✅ **Email-based domain routing** - Automatic IdP selection based on email domain
✅ **JIT user provisioning** - Auto-create users in HPE database on first login
✅ **Token enrichment** - Add company/role data to JWT tokens
✅ **Multiple IdPs** - Local password + Social login (Google, Azure AD)
✅ **SSO enforcement** - Force specific IdP for corporate domains
✅ **Flexible domains** - Allow multiple login methods

## 🚀 Getting Started

### Option 1: Quick Start (10 minutes)
Follow step-by-step instructions:
```cmd
# Open this file:
QUICK_START.md
```

### Option 2: Detailed Guide (30 minutes)
For comprehensive understanding:
```cmd
# Open this file:
LOCAL_TESTING_GUIDE.md
```

## 📁 Project Structure

```
keycloak-test/
├── 📘 README_START_HERE.md       ← You are here!
├── 📘 QUICK_START.md             ← 10-min setup guide
├── 📘 LOCAL_TESTING_GUIDE.md     ← Comprehensive guide
├── 📘 TESTING_CHECKLIST.md       ← 60+ test cases
│
├── 🔧 keycloak-26.4.5/           ← Keycloak server
├── 🔧 mock-hpe-api/              ← Mock backend API
├── 🔧 keycloak-extensions/       ← Custom SPIs (Java)
├── 🔧 test-client-app/           ← Test application
│
├── ⚙️ start-keycloak.bat          ← Start Keycloak
└── ⚙️ build-and-deploy-spis.bat   ← Build & deploy SPIs
```

## ⚡ Quick Commands

### Start Keycloak
```cmd
start-keycloak.bat
```
Then open: http://localhost:8080

### Start Mock HPE API
```cmd
cd mock-hpe-api
npm install
npm start
```
Runs on: http://localhost:3001

### Build & Deploy Custom SPIs
```cmd
build-and-deploy-spis.bat
```
Then restart Keycloak

### Start Test App
```cmd
cd test-client-app
npm install
npm start
```
Opens: http://localhost:3000

## 🎯 First Test (2 minutes)

1. Make sure all services are running (see above)
2. Open http://localhost:3000
3. Enter email: `test@example.com`
4. Click "Continue to Login"
5. Click "Register" and create an account
6. You should be redirected back with a JWT token!

**Verify it worked:**
```cmd
curl http://localhost:3001/api/users?email=test@example.com
```
Should return user data!

## 📚 Documentation

| Document | Purpose | Time |
|----------|---------|------|
| [QUICK_START.md](QUICK_START.md) | Step-by-step setup | 10 min |
| [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md) | Comprehensive guide with all scenarios | 30 min |
| [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) | 60+ test cases organized by category | Reference |

## 🧪 Key Testing Scenarios

### Scenario A: SSO-Enforced Domain
```
Email: john@testcorp.com
→ Auto-detect: testcorp.com
→ Domain config: sso_enforced=true, idp=google
→ Force redirect to Google login
→ JIT provision user
→ Token enriched with company data
```

### Scenario B: Flexible Domain
```
Email: jane@flexible.com
→ Auto-detect: flexible.com
→ Domain config: sso_enforced=false
→ Show all login options (Google, Password, etc.)
→ User chooses method
→ JIT provision user
```

### Scenario C: Unknown Domain
```
Email: freelancer@random.com
→ Domain not found
→ Show all login options
→ User registers/logs in
→ Create personal company
→ Assign as company owner
```

## 🔍 What Gets Tested

### 1. Custom Keycloak SPIs
- **Event Listener** (`HpeEventListener.java`)
  - Intercepts registration and login events
  - Calls HPE API to create users
  - Assigns companies and roles

- **Protocol Mapper** (`HpeProtocolMapper.java`)
  - Enriches JWT tokens with custom claims
  - Fetches role data from HPE API
  - Adds `company_id`, `company_roles`, etc.

### 2. Mock HPE API
Simulates your real backend with endpoints:
- `GET /api/domains/:domain` - Domain configuration lookup
- `GET /api/users?email=X` - User lookup
- `POST /api/users` - Create user (JIT)
- `GET /api/users/:id/roles` - Fetch user roles
- `POST /api/companies` - Create company
- `POST /api/company-roles` - Assign role

### 3. Test Client App
Simple OIDC client that:
- Initiates login with email hint
- Handles authorization code flow
- Displays user info and token
- Supports token refresh and logout

## 🐛 Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Keycloak won't start | Check Java version: `java -version` (need 17+) |
| Port 8080 in use | `netstat -ano \| findstr :8080` then kill process |
| SPIs not loading | Run `build-and-deploy-spis.bat` then restart Keycloak |
| Mock API 404 | Check if running: `curl http://localhost:3001/health` |
| Build errors | Ensure Maven installed: `mvn -version` |

## ✅ Success Checklist

- [ ] Keycloak admin console accessible (http://localhost:8080)
- [ ] Hykmah realm created
- [ ] hykmah-test-app client configured
- [ ] Mock HPE API running and responding
- [ ] Custom SPIs built and deployed
- [ ] Event listener `hpe-provisioning` enabled
- [ ] Protocol mapper configured in client scope
- [ ] Test app opens (http://localhost:3000)
- [ ] Can register new user
- [ ] User appears in Mock API
- [ ] Token contains custom claims

## 🎓 Learning Path

1. **Day 1:** Setup (follow QUICK_START.md)
2. **Day 2:** Test basic flows (registration, login, token)
3. **Day 3:** Test domain routing (SSO enforced vs flexible)
4. **Day 4:** Test JIT provisioning (verify Mock API)
5. **Day 5:** Test token enrichment (verify claims)
6. **Day 6:** Test edge cases (errors, unknowns)
7. **Day 7:** Performance & security testing

## 🚀 Next Steps After Testing

1. ✅ Validate all test cases pass
2. 📝 Document any issues or improvements
3. 🔧 Configure real Identity Providers (Google OAuth, Azure AD)
4. 🎨 Customize Keycloak theme (match Hykmah branding)
5. 🔐 Add security hardening (rate limiting, etc.)
6. 📊 Set up monitoring and logging
7. 🚢 Deploy to staging environment
8. 🎯 Test with real users (beta testing)
9. 📈 Performance testing (load testing)
10. ✨ Launch to production!

## 📞 Support

- **Keycloak Docs:** https://www.keycloak.org/docs/latest/
- **OIDC Spec:** https://openid.net/connect/
- **JWT Decoder:** https://jwt.io
- **OIDC Debugger:** https://oidcdebugger.com

## 🎉 You're Ready!

Everything you need is set up. Follow the **QUICK_START.md** to begin testing.

**Estimated time to first successful test:** 15 minutes

Good luck! 🚀

---

**Questions?** Check the troubleshooting sections in each guide.

**Found a bug?** Document it and we'll fix it together!

**Ready for production?** Complete all tests in TESTING_CHECKLIST.md first!
