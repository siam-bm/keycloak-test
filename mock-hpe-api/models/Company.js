const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  company_id: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  owner_id: {
    type: String,
    default: null
  },
  billing_status: {
    type: String,
    default: 'active',
    enum: ['active', 'suspended', 'cancelled']
  },
  billing_plan: {
    type: String,
    default: 'free',
    enum: ['free', 'professional', 'enterprise']
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Indexes
companySchema.index({ company_id: 1 });
companySchema.index({ owner_id: 1 });

module.exports = mongoose.model('Company', companySchema);
