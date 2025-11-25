# 🗄️ MongoDB Setup Guide

## Current Issue
MongoDB connection refused at `localhost:27017`

This means MongoDB server is not running or not accepting connections.

---

## ✅ Step 1: Check if MongoDB is Running

### Windows:

**Option A: Check Services**
```cmd
# Open Services (press Win+R, type services.msc)
# Look for "MongoDB Server" or "MongoDB"
# If not running, right-click → Start
```

**Option B: Check with Command**
```cmd
# Open CMD as Administrator
sc query MongoDB
```

---

## 🚀 Step 2: Start MongoDB Server

### If MongoDB is installed but not running:

```cmd
# Option 1: Start as Windows Service
net start MongoDB

# Option 2: Start manually (if not installed as service)
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath="C:\data\db"
```

### If MongoDB is NOT installed:

#### Download and Install MongoDB:

1. **Download**: https://www.mongodb.com/try/download/community
   - Version: 7.0 (latest stable)
   - Platform: Windows x64
   - Package: MSI

2. **Run installer:**
   - Click "Complete" installation
   - ✅ Check "Install MongoDB as a Service"
   - ✅ Check "Run service as Network Service user"
   - ✅ Check "Install MongoDB Compass" (GUI tool)

3. **Verify installation:**
   ```cmd
   "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --version
   ```

---

## 🧪 Step 3: Test MongoDB Connection

After starting MongoDB:

```cmd
# Test with mongo shell
"C:\Program Files\MongoDB\Server\7.0\bin\mongosh.exe"

# You should see:
# Current Mongosh Log ID: ...
# Connecting to: mongodb://127.0.0.1:27017
# Using MongoDB: 7.0.x
# test>
```

Or use **MongoDB Compass** (GUI):
1. Open MongoDB Compass
2. Connection string: `mongodb://localhost:27017`
3. Click "Connect"

---

## 🔧 Step 4: Restart Mock HPE API

Once MongoDB is running:

```cmd
cd C:\Users\siam\Desktop\keycloak-test\mock-hpe-api
npm start
```

You should see:
```
✅ Connected to MongoDB
📊 Database: mongodb://localhost:27017/hykmah-hpe
🌱 Seeding initial data...
  ✅ Domains seeded
  ✅ Companies seeded
```

---

## 🗄️ View Data in MongoDB Compass

1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Select database: `hykmah-hpe`
4. You'll see collections:
   - `domains` - Domain configurations
   - `users` - User accounts
   - `companies` - Company data
   - `companyroles` - User-company role assignments

---

## 🐛 Troubleshooting

### Problem: "MongoDB service doesn't exist"

**Solution**: Install MongoDB as a service

```cmd
# Run as Administrator
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --install --serviceName MongoDB --serviceDisplayName "MongoDB Server" --dbpath "C:\data\db"

# Start service
net start MongoDB
```

---

### Problem: Port 27017 in use

**Solution**: Check what's using the port

```cmd
netstat -ano | findstr :27017

# If another process is using it, either:
# 1. Kill that process
# 2. Change MongoDB port (not recommended)
```

---

### Problem: "data directory not found"

**Solution**: Create data directory

```cmd
mkdir C:\data\db
```

---

## 📊 MongoDB Collections Schema

Once running, these collections will be created automatically:

### `domains` Collection:
```json
{
  "_id": ObjectId,
  "domain": "gmail.com",
  "company_id": "GMAIL001",
  "company_name": "Gmail Users Company",
  "sso_enforced": false,
  "idp_alias": "google",
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### `users` Collection:
```json
{
  "_id": ObjectId,
  "email": "siam.bitmascot@gmail.com",
  "name": "Siam BM",
  "idp": "local",
  "idp_sub": null,
  "email_verified": false,
  "company_id": "GMAIL001",
  "status": "ACTIVE",
  "created_at": ISODate,
  "last_login_at": ISODate,
  "updated_at": ISODate
}
```

### `companies` Collection:
```json
{
  "_id": ObjectId,
  "company_id": "GMAIL001",
  "name": "Gmail Users Company",
  "owner_id": null,
  "billing_status": "active",
  "billing_plan": "free",
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### `companyroles` Collection:
```json
{
  "_id": ObjectId,
  "user_id": "507f1f77bcf86cd799439011",
  "company_id": "GMAIL001",
  "product_id": 1,
  "role": "User",
  "assigned_at": ISODate
}
```

---

## ✅ Success Checklist

- [ ] MongoDB service is running
- [ ] Can connect via `mongosh` or MongoDB Compass
- [ ] Mock HPE API starts without errors
- [ ] Can see `hykmah-hpe` database in Compass
- [ ] Initial data seeded (domains, companies)

---

## 🔄 Switching Between JSON and MongoDB

If you want to go back to JSON files temporarily:

```cmd
# Use old JSON-based server
npm run start:old
```

If you want to use MongoDB (current setup):

```cmd
# Use MongoDB-based server
npm start
```

---

## 🎯 Next Steps After MongoDB is Running

1. Test user registration at http://localhost:3000
2. Check MongoDB Compass to see new users being created
3. Query users via API: `curl http://localhost:3001/api/users`
4. View data in real-time in Compass

---

## 📞 Need Help?

If you're still having issues:

1. **Check MongoDB logs:**
   ```
   C:\Program Files\MongoDB\Server\7.0\log\mongod.log
   ```

2. **Check Windows Event Viewer:**
   - Win+R → `eventvwr`
   - Windows Logs → Application
   - Filter by "MongoDB"

3. **Test connection directly:**
   ```javascript
   const mongoose = require('mongoose');
   mongoose.connect('mongodb://localhost:27017/test')
     .then(() => console.log('✅ Connected!'))
     .catch(err => console.error('❌ Error:', err));
   ```

---

*Once MongoDB is running, come back to test the full flow!*
