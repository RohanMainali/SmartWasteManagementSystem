const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient Information
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  recipientType: {
    type: String,
    enum: ['customer', 'driver', 'admin'],
    required: true,
    index: true
  },
  
  // Notification Content
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Notification Type and Category
  type: {
    type: String,
    required: true,
    enum: [
      'pickup-scheduled',
      'pickup-reminder',
      'pickup-cancelled',
      'pickup-rescheduled',
      'pickup-completed',
      'driver-assigned',
      'driver-nearby',
      'payment-due',
      'payment-received',
      'issue-update',
      'system-maintenance',
      'promotional',
      'environmental-tip',
      'reward-earned',
      'subscription-expiry',
      'new-request',
      'general'
    ],
    index: true
  },
  
  category: {
    type: String,
    enum: ['info', 'warning', 'success', 'error', 'promotional'],
    default: 'info',
    index: true
  },
  
  // Priority and Urgency
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  
  // Related References
  relatedCollectionRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollectionRequest'
  },
  
  relatedIssue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IssueReport'
  },
  
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  relatedVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  
  // Status and Delivery
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending',
    index: true
  },
  
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  
  readAt: Date,
  
  // Delivery Channels
  channels: {
    push: {
      enabled: { type: Boolean, default: true },
      sent: { type: Boolean, default: false },
      sentAt: Date,
      messageId: String,
      error: String
    },
    email: {
      enabled: { type: Boolean, default: false },
      sent: { type: Boolean, default: false },
      sentAt: Date,
      messageId: String,
      error: String
    },
    sms: {
      enabled: { type: Boolean, default: false },
      sent: { type: Boolean, default: false },
      sentAt: Date,
      messageId: String,
      error: String
    }
  },
  
  // Scheduling
  scheduledFor: Date, // For delayed notifications
  
  expiresAt: Date, // For time-sensitive notifications
  
  // Action and Navigation
  actionRequired: {
    type: Boolean,
    default: false
  },
  
  actionUrl: String, // Deep link or navigation route
  
  actionLabel: String, // Button text (e.g., "View Details", "Reschedule")
  
  // Data payload for the app
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Personalization
  icon: String, // Icon name or URL
  
  image: String, // Image URL for rich notifications
  
  color: String, // Brand color or category color
  
  // Analytics and Tracking
  clickCount: {
    type: Number,
    default: 0
  },
  
  clickedAt: [Date], // Track multiple clicks
  
  // Bulk Notification Info
  batchId: String, // For grouping bulk notifications
  
  campaign: String, // Marketing campaign identifier
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  sentAt: Date,
  
  deliveredAt: Date,
  
  // Soft Delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, type: 1 });
notificationSchema.index({ status: 1, scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ batchId: 1 });
notificationSchema.index({ createdAt: -1 });

// Virtual for notification age
notificationSchema.virtual('age').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffMs = now - created;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  } else {
    return 'Just now';
  }
});

// Virtual for delivery status
notificationSchema.virtual('deliveryStatus').get(function() {
  const push = this.channels.push;
  const email = this.channels.email;
  const sms = this.channels.sms;
  
  let delivered = 0;
  let total = 0;
  
  if (push.enabled) {
    total++;
    if (push.sent) delivered++;
  }
  if (email.enabled) {
    total++;
    if (email.sent) delivered++;
  }
  if (sms.enabled) {
    total++;
    if (sms.sent) delivered++;
  }
  
  return { delivered, total, percentage: total > 0 ? (delivered / total) * 100 : 0 };
});

// Virtual for is expired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set sentAt timestamp when status changes to sent
  if (this.isModified('status') && this.status === 'sent' && !this.sentAt) {
    this.sentAt = new Date();
  }
  
  // Set deliveredAt timestamp when status changes to delivered
  if (this.isModified('status') && this.status === 'delivered' && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }
  
  // Set readAt timestamp when marked as read
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  
  next();
});

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsClicked = function() {
  this.clickCount += 1;
  this.clickedAt.push(new Date());
  return this.save();
};

notificationSchema.methods.markChannelSent = function(channel, messageId = null, error = null) {
  if (this.channels[channel]) {
    this.channels[channel].sent = !error;
    this.channels[channel].sentAt = new Date();
    if (messageId) this.channels[channel].messageId = messageId;
    if (error) this.channels[channel].error = error;
    
    // Update overall status
    const allChannels = ['push', 'email', 'sms'];
    const enabledChannels = allChannels.filter(ch => this.channels[ch].enabled);
    const sentChannels = enabledChannels.filter(ch => this.channels[ch].sent);
    
    if (sentChannels.length === enabledChannels.length) {
      this.status = 'sent';
    } else if (sentChannels.length > 0) {
      this.status = 'sent'; // Partial success still counts as sent
    } else {
      this.status = 'failed';
    }
  }
  
  return this.save();
};

notificationSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

notificationSchema.methods.canBeDelivered = function() {
  const now = new Date();
  
  // Check if expired
  if (this.expiresAt && now > this.expiresAt) {
    return false;
  }
  
  // Check if scheduled for future
  if (this.scheduledFor && now < this.scheduledFor) {
    return false;
  }
  
  // Check if already sent successfully
  if (this.status === 'sent' || this.status === 'delivered') {
    return false;
  }
  
  return true;
};

// Static methods
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    unreadOnly = false,
    type,
    limit = 20,
    page = 1,
    sortBy = '-createdAt'
  } = options;
  
  const query = {
    recipient: userId,
    isDeleted: false
  };
  
  if (unreadOnly) query.isRead = false;
  if (type) query.type = type;
  
  return this.find(query)
    .populate('relatedCollectionRequest', 'requestId requestedDate')
    .populate('relatedIssue', 'issueId title')
    .populate('relatedUser', 'name')
    .sort(sortBy)
    .limit(limit)
    .skip((page - 1) * limit);
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false
  });
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      recipient: userId,
      isRead: false,
      isDeleted: false
    },
    {
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date()
    }
  );
};

notificationSchema.statics.getPendingNotifications = function() {
  const now = new Date();
  
  return this.find({
    status: 'pending',
    isDeleted: false,
    $or: [
      { scheduledFor: { $exists: false } },
      { scheduledFor: { $lte: now } }
    ],
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } }
    ]
  }).populate('recipient', 'name email profile.phone deviceTokens');
};

notificationSchema.statics.createBulkNotifications = async function(notifications) {
  const batchId = new Date().getTime().toString();
  
  const notificationsWithBatch = notifications.map(notification => ({
    ...notification,
    batchId,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
  
  return this.insertMany(notificationsWithBatch);
};

notificationSchema.statics.getNotificationStats = async function(userId = null) {
  const matchStage = { isDeleted: false };
  if (userId) matchStage.recipient = mongoose.Types.ObjectId(userId);
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalNotifications: { $sum: 1 },
        unreadNotifications: {
          $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
        },
        sentNotifications: {
          $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
        },
        clickedNotifications: {
          $sum: { $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] }
        },
        avgClickCount: { $avg: '$clickCount' }
      }
    }
  ]);
  
  return stats[0] || {
    totalNotifications: 0,
    unreadNotifications: 0,
    sentNotifications: 0,
    clickedNotifications: 0,
    avgClickCount: 0
  };
};

notificationSchema.statics.getTypeStats = async function() {
  return this.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        readCount: {
          $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] }
        },
        clickCount: { $sum: '$clickCount' }
      }
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        readCount: 1,
        clickCount: 1,
        readRate: { $divide: ['$readCount', '$count'] },
        clickRate: { $divide: ['$clickCount', '$count'] }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// TTL index for expired notifications (optional - removes after 30 days)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
