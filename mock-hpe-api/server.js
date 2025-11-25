const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Data files
const DATA_DIR = path.join(__dirname, 'data');
const DOMAINS_FILE = path.join(DATA_DIR, 'domains.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COMPANIES_FILE = path.join(DATA_DIR, 'companies.json');

// Initialize data files if they don't exist
function initializeDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DOMAINS_FILE)) {
    fs.writeFileSync(DOMAINS_FILE, JSON.stringify([
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
        "domain": "webalive.com.au",
        "company_id": "CA341B",
        "company_name": "WebAlive",
        "sso_enforced": true,
        "idp_alias": "azuread-webalive"
      }
    ], null, 2));
  }

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(COMPANIES_FILE)) {
    fs.writeFileSync(COMPANIES_FILE, JSON.stringify([
      {
        "id": "TC123456",
        "name": "Test Corporation",
        "owner_id": null,
        "billing_status": "active",
        "billing_plan": "enterprise"
      },
      {
        "id": "FL789012",
        "name": "Flexible Inc",
        "owner_id": null,
        "billing_status": "active",
        "billing_plan": "professional"
      },
      {
        "id": "CA341B",
        "name": "WebAlive",
        "owner_id": null,
        "billing_status": "active",
        "billing_plan": "enterprise"
      }
    ], null, 2));
  }
}

// Helper functions
function readJSONFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

function writeJSONFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

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

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== DOMAIN ROUTES ====================

// GET /api/domains/:domain - Lookup domain configuration
app.get('/api/domains/:domain', (req, res) => {
  const { domain } = req.params;
  const domains = readJSONFile(DOMAINS_FILE);

  const config = domains.find(d => d.domain === domain);

  if (!config) {
    console.log(`  ⚠️  Domain not found: ${domain}`);
    return res.status(404).json({
      error: 'Domain not found',
      message: `No configuration found for domain: ${domain}`
    });
  }

  console.log(`  ✅ Domain found: ${domain} → SSO Enforced: ${config.sso_enforced}, IdP: ${config.idp_alias || 'None'}`);
  res.json(config);
});

// POST /api/domains - Create domain configuration
app.post('/api/domains', (req, res) => {
  const domains = readJSONFile(DOMAINS_FILE);
  const newDomain = {
    domain: req.body.domain,
    company_id: req.body.company_id || null,
    company_name: req.body.company_name || null,
    sso_enforced: req.body.sso_enforced || false,
    idp_alias: req.body.idp_alias || null
  };

  domains.push(newDomain);
  writeJSONFile(DOMAINS_FILE, domains);

  console.log(`  ✅ Domain created: ${newDomain.domain}`);
  res.status(201).json(newDomain);
});

// ==================== USER ROUTES ====================

// GET /api/users - Query users by email or list all
app.get('/api/users', (req, res) => {
  const users = readJSONFile(USERS_FILE);
  const { email } = req.query;

  if (email) {
    const user = users.find(u => u.email === email);
    if (!user) {
      console.log(`  ⚠️  User not found: ${email}`);
      return res.status(404).json({
        error: 'User not found',
        message: `No user found with email: ${email}`
      });
    }
    console.log(`  ✅ User found: ${email} → IdP: ${user.idp}, Company: ${user.company_id}`);
    return res.json(user);
  }

  console.log(`  📋 Returning ${users.length} users`);
  res.json(users);
});

// GET /api/users/:userId - Get user by ID
app.get('/api/users/:userId', (req, res) => {
  const users = readJSONFile(USERS_FILE);
  const user = users.find(u => u.id === req.params.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  console.log(`  ✅ User found by ID: ${user.email}`);
  res.json(user);
});

// POST /api/users - Create new user (JIT provisioning)
app.post('/api/users', (req, res) => {
  const users = readJSONFile(USERS_FILE);

  // Check if user already exists
  const existingUser = users.find(u => u.email === req.body.email);
  if (existingUser) {
    console.log(`  ⚠️  User already exists: ${req.body.email}`);
    return res.status(409).json({
      error: 'User already exists',
      user: existingUser
    });
  }

  const newUser = {
    id: uuidv4(),
    email: req.body.email,
    name: req.body.name || req.body.email.split('@')[0],
    idp: req.body.idp || 'local',
    idp_sub: req.body.idp_sub || null,
    email_verified: req.body.email_verified || false,
    company_id: req.body.company_id || null,
    status: req.body.status || 'ACTIVE',
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString()
  };

  users.push(newUser);
  writeJSONFile(USERS_FILE, users);

  console.log(`  ✅ User created: ${newUser.email} (${newUser.idp}) → Company: ${newUser.company_id}`);
  res.status(201).json(newUser);
});

// PATCH /api/users/:userId - Update user
app.patch('/api/users/:userId', (req, res) => {
  const users = readJSONFile(USERS_FILE);
  const userIndex = users.findIndex(u => u.id === req.params.userId);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users[userIndex] = { ...users[userIndex], ...req.body };
  writeJSONFile(USERS_FILE, users);

  console.log(`  ✅ User updated: ${users[userIndex].email}`);
  res.json(users[userIndex]);
});

// ==================== COMPANY ROUTES ====================

// GET /api/companies/:companyId - Get company details
app.get('/api/companies/:companyId', (req, res) => {
  const companies = readJSONFile(COMPANIES_FILE);
  const company = companies.find(c => c.id === req.params.companyId);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  console.log(`  ✅ Company found: ${company.name}`);
  res.json(company);
});

// POST /api/companies - Create company
app.post('/api/companies', (req, res) => {
  const companies = readJSONFile(COMPANIES_FILE);

  const newCompany = {
    id: req.body.id || uuidv4().substring(0, 8).toUpperCase(),
    name: req.body.name,
    owner_id: req.body.owner_id || null,
    billing_status: req.body.billing_status || 'active',
    billing_plan: req.body.billing_plan || 'free',
    created_at: new Date().toISOString()
  };

  companies.push(newCompany);
  writeJSONFile(COMPANIES_FILE, companies);

  console.log(`  ✅ Company created: ${newCompany.name} (${newCompany.id})`);
  res.status(201).json(newCompany);
});

// ==================== ROLES ROUTES ====================

// GET /api/users/:userId/roles - Get user roles
app.get('/api/users/:userId/roles', (req, res) => {
  const { userId } = req.params;
  const users = readJSONFile(USERS_FILE);
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Mock role data based on company
  const roleData = {
    company_id: user.company_id,
    company_name: "Test Corporation",
    company_owner: false,
    company_roles: [
      { role: "User", products: ["WC", "EX"] }
    ],
    product_roles: [
      { product: "WC", groups: ["Engineering", "QA"] },
      { product: "EX", groups: ["Sales"] }
    ]
  };

  console.log(`  ✅ Roles retrieved for: ${user.email}`);
  res.json(roleData);
});

// POST /api/company-roles - Assign user to company with role
app.post('/api/company-roles', (req, res) => {
  const { user_id, company_id, product_id, role } = req.body;

  console.log(`  ✅ Company role assigned: User ${user_id} → Company ${company_id} as ${role}`);
  res.status(201).json({
    user_id,
    company_id,
    product_id,
    role,
    assigned_at: new Date().toISOString()
  });
});

// ==================== START SERVER ====================

initializeDataFiles();

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Mock HPE API Server Started');
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
  console.log('\n🗄️  Data Files:');
  console.log(`  ${DOMAINS_FILE}`);
  console.log(`  ${USERS_FILE}`);
  console.log(`  ${COMPANIES_FILE}`);
  console.log('='.repeat(60) + '\n');
});