const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Import models
const Domain = require('./models/Domain');
const User = require('./models/User');
const Company = require('./models/Company');
const CompanyRole = require('./models/CompanyRole');

const app = express();
const PORT = 3001;

// MongoDB connection
const MONGODB_URI = 'mongodb://127.0.0.1:27017/hykmah-hpe';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;

  let color = '\x1b[0m'; // Default
  if (method === 'GET') color = '\x1b[32m'; // Green
  if (method === 'POST') color = '\x1b[34m'; // Blue
  if (method === 'PUT' || method === 'PATCH') color = '\x1b[33m'; // Yellow
  if (method === 'DELETE') color = '\x1b[31m'; // Red

  console.log(`${color}[${timestamp}] ${method} ${url}\x1b[0m`);
  next();
});

// ==================== DATABASE CONNECTION ====================

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('\n✅ Connected to MongoDB');
    console.log(`📊 Database: ${MONGODB_URI}`);

    // Seed initial data
    await seedInitialData();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// ==================== SEED INITIAL DATA ====================

async function seedInitialData() {
  try {
    // Check if data already exists
    const domainCount = await Domain.countDocuments();

    if (domainCount === 0) {
      console.log('\n🌱 Seeding initial data...');

      // Seed domains
      await Domain.insertMany([
        {
          domain: 'testcorp.com',
          company_id: 'TC123456',
          company_name: 'Test Corporation',
          sso_enforced: true,
          idp_alias: 'google'
        },
        {
          domain: 'flexible.com',
          company_id: 'FL789012',
          company_name: 'Flexible Inc',
          sso_enforced: false,
          idp_alias: 'google'
        },
        {
          domain: 'webalive.com.au',
          company_id: 'CA341B',
          company_name: 'WebAlive',
          sso_enforced: true,
          idp_alias: 'azuread-webalive'
        },
        {
          domain: 'gmail.com',
          company_id: 'GMAIL001',
          company_name: 'Gmail Users Company',
          sso_enforced: false,
          idp_alias: 'google'
        }
      ]);

      // Seed companies
      await Company.insertMany([
        {
          company_id: 'TC123456',
          name: 'Test Corporation',
          owner_id: null,
          billing_status: 'active',
          billing_plan: 'enterprise'
        },
        {
          company_id: 'FL789012',
          name: 'Flexible Inc',
          owner_id: null,
          billing_status: 'active',
          billing_plan: 'professional'
        },
        {
          company_id: 'CA341B',
          name: 'WebAlive',
          owner_id: null,
          billing_status: 'active',
          billing_plan: 'enterprise'
        },
        {
          company_id: 'GMAIL001',
          name: 'Gmail Users Company',
          owner_id: null,
          billing_status: 'active',
          billing_plan: 'free'
        }
      ]);

      console.log('  ✅ Domains seeded');
      console.log('  ✅ Companies seeded');
    } else {
      console.log('  ℹ️  Database already contains data, skipping seed');
    }
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ==================== DOMAIN ROUTES ====================

// GET /api/domains/:domain - Lookup domain configuration
app.get('/api/domains/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const config = await Domain.findOne({ domain: domain.toLowerCase() });

    if (!config) {
      console.log(`  ⚠️  Domain not found: ${domain}`);
      return res.status(404).json({
        error: 'Domain not found',
        message: `No configuration found for domain: ${domain}`
      });
    }

    console.log(`  ✅ Domain found: ${domain} → SSO Enforced: ${config.sso_enforced}, IdP: ${config.idp_alias || 'None'}`);
    res.json({
      domain: config.domain,
      company_id: config.company_id,
      company_name: config.company_name,
      sso_enforced: config.sso_enforced,
      idp_alias: config.idp_alias
    });
  } catch (error) {
    console.error('  ❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/domains - Create domain configuration
app.post('/api/domains', async (req, res) => {
  try {
    const newDomain = new Domain({
      domain: req.body.domain.toLowerCase(),
      company_id: req.body.company_id || null,
      company_name: req.body.company_name || null,
      sso_enforced: req.body.sso_enforced || false,
      idp_alias: req.body.idp_alias || null
    });

    await newDomain.save();

    console.log(`  ✅ Domain created: ${newDomain.domain}`);
    res.status(201).json(newDomain);
  } catch (error) {
    console.error('  ❌ Error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Domain already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== USER ROUTES ====================

// GET /api/users - Query users by email or list all
app.get('/api/users', async (req, res) => {
  try {
    const { email } = req.query;

    if (email) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        console.log(`  ⚠️  User not found: ${email}`);
        return res.status(404).json({
          error: 'User not found',
          message: `No user found with email: ${email}`
        });
      }
      console.log(`  ✅ User found: ${email} → IdP: ${user.idp}, Company: ${user.company_id}`);
      return res.json({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        idp: user.idp,
        idp_sub: user.idp_sub,
        email_verified: user.email_verified,
        company_id: user.company_id,
        status: user.status,
        created_at: user.created_at,
        last_login_at: user.last_login_at
      });
    }

    const users = await User.find().limit(100);
    console.log(`  📋 Returning ${users.length} users`);
    res.json(users.map(u => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      idp: u.idp,
      company_id: u.company_id,
      status: u.status
    })));
  } catch (error) {
    console.error('  ❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:userId - Get user by ID
app.get('/api/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`  ✅ User found by ID: ${user.email}`);
    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      idp: user.idp,
      company_id: user.company_id,
      status: user.status
    });
  } catch (error) {
    console.error('  ❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users - Create new user (JIT provisioning)
app.post('/api/users', async (req, res) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });
    if (existingUser) {
      console.log(`  ⚠️  User already exists: ${req.body.email}`);
      return res.status(409).json({
        error: 'User already exists',
        user: {
          id: existingUser._id.toString(),
          email: existingUser.email,
          name: existingUser.name
        }
      });
    }

    const newUser = new User({
      email: req.body.email.toLowerCase(),
      name: req.body.name || req.body.email.split('@')[0],
      idp: req.body.idp || 'local',
      idp_sub: req.body.idp_sub || null,
      email_verified: req.body.email_verified || false,
      company_id: req.body.company_id || null,
      status: req.body.status || 'ACTIVE'
    });

    await newUser.save();

    console.log(`  ✅ User created: ${newUser.email} (${newUser.idp}) → Company: ${newUser.company_id}`);
    res.status(201).json({
      id: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
      idp: newUser.idp,
      company_id: newUser.company_id,
      status: newUser.status,
      created_at: newUser.created_at
    });
  } catch (error) {
    console.error('  ❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/users/:userId - Update user
app.patch('/api/users/:userId', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: req.body },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`  ✅ User updated: ${user.email}`);
    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      company_id: user.company_id
    });
  } catch (error) {
    console.error('  ❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== COMPANY ROUTES ====================

// GET /api/companies/:companyId - Get company details
app.get('/api/companies/:companyId', async (req, res) => {
  try {
    const company = await Company.findOne({ company_id: req.params.companyId.toUpperCase() });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    console.log(`  ✅ Company found: ${company.name}`);
    res.json({
      id: company.company_id,
      name: company.name,
      owner_id: company.owner_id,
      billing_status: company.billing_status,
      billing_plan: company.billing_plan
    });
  } catch (error) {
    console.error('  ❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies - Create company
app.post('/api/companies', async (req, res) => {
  try {
    const newCompany = new Company({
      company_id: (req.body.id || uuidv4().substring(0, 8)).toUpperCase(),
      name: req.body.name,
      owner_id: req.body.owner_id || null,
      billing_status: req.body.billing_status || 'active',
      billing_plan: req.body.billing_plan || 'free'
    });

    await newCompany.save();

    console.log(`  ✅ Company created: ${newCompany.name} (${newCompany.company_id})`);
    res.status(201).json({
      id: newCompany.company_id,
      name: newCompany.name,
      owner_id: newCompany.owner_id,
      billing_status: newCompany.billing_status,
      billing_plan: newCompany.billing_plan
    });
  } catch (error) {
    console.error('  ❌ Error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Company already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ROLES ROUTES ====================

// GET /api/users/:userId/roles - Get user roles
app.get('/api/users/:userId/roles', async (req, res) => {
  try {
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

    // Format role data
    const roleData = {
      company_id: user.company_id,
      company_name: companyName,
      company_owner: companyOwner,
      company_roles: companyRoles.map(cr => ({
        role: cr.role,
        product_id: cr.product_id,
        products: ['WC', 'EX']  // Mock product codes
      })),
      product_roles: [
        { product: 'WC', groups: ['Engineering', 'QA'] },
        { product: 'EX', groups: ['Sales'] }
      ]
    };

    console.log(`  ✅ Roles retrieved for: ${user.email}`);
    res.json(roleData);
  } catch (error) {
    console.error('  ❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/company-roles - Assign user to company with role
app.post('/api/company-roles', async (req, res) => {
  try {
    const { user_id, company_id, product_id, role } = req.body;

    const companyRole = new CompanyRole({
      user_id,
      company_id,
      product_id: product_id || 1,
      role: role || 'User'
    });

    await companyRole.save();

    console.log(`  ✅ Company role assigned: User ${user_id} → Company ${company_id} as ${role}`);
    res.status(201).json({
      user_id,
      company_id,
      product_id,
      role,
      assigned_at: companyRole.assigned_at
    });
  } catch (error) {
    console.error('  ❌ Error:', error);
    if (error.code === 11000) {
      return res.status(200).json({ message: 'Role already assigned' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== START SERVER ====================

async function startServer() {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Mock HPE API Server Started (MongoDB)');
    console.log('='.repeat(60));
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/health`);
    console.log('\n📝 Available Endpoints:');
    console.log('  GET    /api/domains/:domain          - Lookup domain config');
    console.log('  POST   /api/domains                  - Create domain config');
    console.log('  GET    /api/users?email=<email>      - Query user by email');
    console.log('  GET    /api/users/:userId            - Get user by ID');
    console.log('  POST   /api/users                    - Create user (JIT)');
    console.log('  PATCH  /api/users/:userId            - Update user');
    console.log('  GET    /api/users/:userId/roles      - Get user roles');
    console.log('  GET    /api/companies/:companyId     - Get company details');
    console.log('  POST   /api/companies                - Create company');
    console.log('  POST   /api/company-roles            - Assign company role');
    console.log('='.repeat(60) + '\n');
  });
}

startServer();
