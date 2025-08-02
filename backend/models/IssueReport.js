const mongoose = require('mongoose');

const issueReportSchema = new mongoose.Schema({
  // Reporter Information
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Issue Identification
  issueId: {
    type: String,
    unique: true,
    required: false // Let pre-save middleware generate it
  },
  
  // Issue Details
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  category: {
    type: String,
    required: true,
    enum: [
      'missed-pickup',
      'vehicle-issue',
      'driver-behavior',
      'billing',
      'service-quality',
      'environmental-concern',
      'scheduling',
      'app-technical',
      'waste-sorting',
      'other'
    ],
    index: true
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  
  // Location Information (optional)
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere',
      validate: {
        validator: function(coords) {
          return !coords || (Array.isArray(coords) && coords.length === 2);
        },
        message: 'Coordinates must be an array of exactly 2 numbers [longitude, latitude]'
      }
    }
  },
  
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Nepal' },
    landmark: String
  },
  
  // Related References
  relatedCollectionRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollectionRequest'
  },
  
  relatedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  relatedVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  
  // Evidence and Documentation
  photos: [String], // Photo URLs
  
  videoUrl: String,
  
  attachments: [{
    filename: String,
    url: String,
    fileType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Status and Resolution
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed', 'rejected'],
    default: 'open',
    index: true
  },
  
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Assignment and Handling
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Admin or support staff
  },
  
  department: {
    type: String,
    enum: ['customer-service', 'operations', 'technical', 'billing', 'management'],
    default: 'customer-service'
  },
  
  // Resolution Details
  resolution: {
    summary: String,
    details: String,
    actionsTaken: [String],
    preventiveMeasures: [String],
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  },
  
  // Communication History
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    isInternal: {
      type: Boolean,
      default: false
    },
    attachments: [String],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Customer Communication
  customerNotified: {
    type: Boolean,
    default: false
  },
  
  lastCustomerUpdate: Date,
  
  customerResponse: {
    satisfied: Boolean,
    feedback: String,
    additionalConcerns: String,
    responseAt: Date
  },
  
  // Follow-up
  followUpRequired: {
    type: Boolean,
    default: false
  },
  
  followUpDate: Date,
  
  followUpNotes: String,
  
  // Escalation
  escalated: {
    type: Boolean,
    default: false
  },
  
  escalationLevel: {
    type: Number,
    min: 0,
    max: 3,
    default: 0
  },
  
  escalationHistory: [{
    level: Number,
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    escalatedAt: { type: Date, default: Date.now },
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Timestamps
  reportedAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  closedAt: Date,
  
  // Analytics and Metrics
  responseTime: Number, // in minutes
  resolutionTime: Number, // in minutes
  
  tags: [String], // For categorization and filtering
  
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
issueReportSchema.index({ reporter: 1, status: 1 });
issueReportSchema.index({ category: 1, severity: 1 });
issueReportSchema.index({ assignedTo: 1, status: 1 });
issueReportSchema.index({ reportedAt: -1 });
issueReportSchema.index({ 'location': '2dsphere' });
issueReportSchema.index({ tags: 1 });

// Virtual for full address
issueReportSchema.virtual('fullAddress').get(function() {
  if (!this.address) return null;
  const addr = this.address;
  let addressParts = [];
  if (addr.street) addressParts.push(addr.street);
  if (addr.city) addressParts.push(addr.city);
  if (addr.state) addressParts.push(addr.state);
  if (addr.zipCode) addressParts.push(addr.zipCode);
  if (addr.country && addr.country !== 'Nepal') addressParts.push(addr.country);
  return addressParts.join(', ');
});

// Virtual for age of the issue
issueReportSchema.virtual('issueAge').get(function() {
  const now = new Date();
  const reported = new Date(this.reportedAt);
  const diffMs = now - reported;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }
});

// Virtual for status description
issueReportSchema.virtual('statusDescription').get(function() {
  const descriptions = {
    'open': 'Reported and waiting for assignment',
    'in-progress': 'Being investigated and resolved',
    'resolved': 'Issue has been resolved',
    'closed': 'Issue is closed and complete',
    'rejected': 'Issue was rejected or invalid'
  };
  return descriptions[this.status] || this.status;
});

// Pre-save middleware
issueReportSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate issue ID if not exists
  if (!this.issueId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.issueId = `ISS-${timestamp}-${random}`.toUpperCase();
  }
  
  // Calculate response time when first assigned
  if (this.isModified('assignedTo') && this.assignedTo && !this.responseTime) {
    const now = new Date();
    const reported = new Date(this.reportedAt);
    this.responseTime = Math.floor((now - reported) / (1000 * 60)); // in minutes
  }
  
  // Calculate resolution time when resolved
  if (this.isModified('status') && this.status === 'resolved' && !this.resolutionTime) {
    const now = new Date();
    const reported = new Date(this.reportedAt);
    this.resolutionTime = Math.floor((now - reported) / (1000 * 60)); // in minutes
    
    if (!this.resolution.resolvedAt) {
      this.resolution.resolvedAt = now;
    }
  }
  
  // Set closed timestamp
  if (this.isModified('status') && this.status === 'closed' && !this.closedAt) {
    this.closedAt = new Date();
  }
  
  // Clean up incomplete location data to prevent geospatial index errors
  if (this.location) {
    // If location exists but has no coordinates or invalid coordinates, remove it
    if (!this.location.coordinates || 
        !Array.isArray(this.location.coordinates) || 
        this.location.coordinates.length !== 2 ||
        this.location.coordinates.some(coord => typeof coord !== 'number')) {
      this.location = undefined;
    }
  }
  
  next();
});

// Instance methods
issueReportSchema.methods.addComment = function(userId, message, isInternal = false, attachments = []) {
  this.comments.push({
    user: userId,
    message,
    isInternal,
    attachments
  });
  
  if (!isInternal) {
    this.lastCustomerUpdate = new Date();
  }
  
  return this.save();
};

issueReportSchema.methods.assignTo = function(userId, department = 'customer-service') {
  this.assignedTo = userId;
  this.department = department;
  this.status = 'in-progress';
  
  return this.save();
};

issueReportSchema.methods.escalate = function(toUserId, reason, escalatedById) {
  this.escalated = true;
  this.escalationLevel += 1;
  
  this.escalationHistory.push({
    level: this.escalationLevel,
    escalatedTo: toUserId,
    reason,
    escalatedBy: escalatedById
  });
  
  this.assignedTo = toUserId;
  
  return this.save();
};

issueReportSchema.methods.resolve = function(resolutionData, resolvedById) {
  this.status = 'resolved';
  this.resolution = {
    ...resolutionData,
    resolvedBy: resolvedById,
    resolvedAt: new Date()
  };
  
  return this.save();
};

issueReportSchema.methods.close = function(customerFeedback = null) {
  this.status = 'closed';
  this.closedAt = new Date();
  
  if (customerFeedback) {
    this.customerResponse = {
      ...customerFeedback,
      responseAt: new Date()
    };
  }
  
  return this.save();
};

issueReportSchema.methods.canBeModified = function() {
  return ['open', 'in-progress'].includes(this.status);
};

issueReportSchema.methods.requiresFollowUp = function() {
  return this.followUpRequired && this.followUpDate && new Date() >= this.followUpDate;
};

// Static methods
issueReportSchema.statics.getCustomerIssues = function(customerId, options = {}) {
  const {
    status,
    category,
    limit = 10,
    page = 1,
    sortBy = '-reportedAt'
  } = options;
  
  const query = { 
    reporter: customerId,
    isDeleted: false
  };
  
  if (status) query.status = status;
  if (category) query.category = category;
  
  return this.find(query)
    .populate('assignedTo', 'name email')
    .populate('relatedCollectionRequest', 'requestId requestedDate')
    .populate('relatedDriver', 'name')
    .populate('comments.user', 'name')
    .sort(sortBy)
    .limit(limit)
    .skip((page - 1) * limit);
};

issueReportSchema.statics.getOpenIssues = function(assignedTo = null) {
  const query = {
    status: { $in: ['open', 'in-progress'] },
    isDeleted: false
  };
  
  if (assignedTo) query.assignedTo = assignedTo;
  
  return this.find(query)
    .populate('reporter', 'name email profile.phone')
    .populate('assignedTo', 'name email')
    .sort('-severity -reportedAt');
};

issueReportSchema.statics.getIssueStats = async function(customerId = null) {
  const matchStage = { isDeleted: false };
  if (customerId) matchStage.reporter = mongoose.Types.ObjectId(customerId);
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalIssues: { $sum: 1 },
        openIssues: {
          $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
        },
        inProgressIssues: {
          $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
        },
        resolvedIssues: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        closedIssues: {
          $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
        },
        avgResponseTime: { $avg: '$responseTime' },
        avgResolutionTime: { $avg: '$resolutionTime' }
      }
    }
  ]);
  
  return stats[0] || {
    totalIssues: 0,
    openIssues: 0,
    inProgressIssues: 0,
    resolvedIssues: 0,
    closedIssues: 0,
    avgResponseTime: 0,
    avgResolutionTime: 0
  };
};

issueReportSchema.statics.getCategoryStats = async function() {
  return this.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgResolutionTime: { $avg: '$resolutionTime' },
        openCount: {
          $sum: { $cond: [{ $in: ['$status', ['open', 'in-progress']] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('IssueReport', issueReportSchema);
