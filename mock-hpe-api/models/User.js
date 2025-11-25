const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  idp: {
    type: String,
    default: 'local',
    enum: ['local', 'google', 'azuread', 'okta', 'github']
  },
  idp_sub: {
    type: String,
    default: null
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  company_id: {
    type: String,
    default: null
  },
  status: {
    type: String,
    default: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED']
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_login_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ company_id: 1 });

module.exports = mongoose.model('User', userSchema);
