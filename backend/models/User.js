const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['customer', 'driver', 'admin'],
    default: 'customer',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    required: true
  },
  profile: {
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Nepal' }
    },
    avatar: { type: String }, // URL to profile image
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    }
  },
  // Driver specific fields
  driverInfo: {
    licenseNumber: { 
      type: String, 
      trim: true,
      required: function() { return this.role === 'driver'; }
    },
    vehicleAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null
    },
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '17:00' }
    },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relationship: { type: String, trim: true }
    }
  },
  // Customer specific fields
  customerInfo: {
    wasteCategories: [{
      type: String,
      enum: ['organic', 'recyclable', 'hazardous', 'electronic', 'general']
    }],
    preferredPickupTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening'],
      default: 'morning'
    },
    subscriptionPlan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    specialInstructions: { type: String, trim: true }
  },
  // Authentication and security
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: { type: String },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastLogin: { type: Date },
  lastActiveIP: { type: String },
  
  // Timestamps and tracking
  joinDate: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
  if (!this.profile.address) return null;
  
  const { street, city, state, zipCode, country } = this.profile.address;
  const addressParts = [street, city, state, zipCode, country].filter(Boolean);
  return addressParts.length > 0 ? addressParts.join(', ') : null;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ lastActive: 1 });
userSchema.index({ 'profile.address.city': 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update lastActive
userSchema.pre('save', function(next) {
  if (this.isNew || this.isModified()) {
    this.lastActive = new Date();
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + (2 * 60 * 60 * 1000) }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Static method to find active users
userSchema.statics.findActiveUsers = function(role = null) {
  const query = { status: 'active', isDeleted: false };
  if (role) query.role = role;
  return this.find(query);
};

// Static method for authentication
userSchema.statics.authenticate = async function(email, password) {
  const user = await this.findOne({ 
    email: email.toLowerCase(), 
    isDeleted: false 
  }).select('+password');
  
  if (!user) {
    return { success: false, message: 'Invalid email or password' };
  }
  
  if (user.isLocked) {
    return { success: false, message: 'Account is temporarily locked due to too many failed login attempts' };
  }
  
  if (user.status !== 'active') {
    return { success: false, message: 'Account is not active' };
  }
  
  const isMatch = await user.comparePassword(password);
  
  if (isMatch) {
    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    return { success: true, user };
  } else {
    // Increment login attempts on failed login
    await user.incLoginAttempts();
    return { success: false, message: 'Invalid email or password' };
  }
};

module.exports = mongoose.model('User', userSchema);
