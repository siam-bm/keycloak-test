const mongoose = require('mongoose');

const companyRoleSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  company_id: {
    type: String,
    required: true
  },
  product_id: {
    type: Number,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['SystemAdmin', 'UserAdmin', 'BillingAdmin', 'User']
  },
  assigned_at: {
    type: Date,
    default: Date.now
  }
});

// Composite index for unique user-company-product combination
companyRoleSchema.index({ user_id: 1, company_id: 1, product_id: 1 }, { unique: true });
companyRoleSchema.index({ user_id: 1 });
companyRoleSchema.index({ company_id: 1 });

module.exports = mongoose.model('CompanyRole', companyRoleSchema);
