const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

// Notification Service
class NotificationService {
  constructor() {
    this.channels = {
      PUSH: 'push',
      EMAIL: 'email',
      SMS: 'sms',
      IN_APP: 'in_app'
    };

    this.types = {
      COLLECTION_SCHEDULED: 'collection_scheduled',
      COLLECTION_REMINDER: 'collection_reminder',
      COLLECTION_STARTED: 'collection_started',
      COLLECTION_COMPLETED: 'collection_completed',
      DRIVER_ASSIGNED: 'driver_assigned',
      ROUTE_OPTIMIZED: 'route_optimized',
      SYSTEM_MAINTENANCE: 'system_maintenance',
      PAYMENT_DUE: 'payment_due',
      ISSUE_REPORTED: 'issue_reported',
      ISSUE_RESOLVED: 'issue_resolved',
      ANALYTICS_REPORT: 'analytics_report'
    };

    this.priorities = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      URGENT: 'urgent'
    };

    // Template configurations
    this.templates = {
      [this.types.COLLECTION_SCHEDULED]: {
        title: 'Collection Scheduled',
        body: 'Your waste collection has been scheduled for {date} between {timeSlot}',
        channels: [this.channels.PUSH, this.channels.EMAIL],
        priority: this.priorities.MEDIUM
      },
      [this.types.COLLECTION_REMINDER]: {
        title: 'Collection Reminder',
        body: 'Your waste collection is scheduled for tomorrow. Please prepare your waste for pickup.',
        channels: [this.channels.PUSH],
        priority: this.priorities.HIGH
      },
      [this.types.COLLECTION_STARTED]: {
        title: 'Collection in Progress',
        body: 'Your waste collection has started. Driver {driverName} is on the way.',
        channels: [this.channels.PUSH, this.channels.IN_APP],
        priority: this.priorities.HIGH
      },
      [this.types.COLLECTION_COMPLETED]: {
        title: 'Collection Completed',
        body: 'Your waste collection has been completed. Total weight: {weight}kg. Thank you!',
        channels: [this.channels.PUSH, this.channels.EMAIL],
        priority: this.priorities.MEDIUM
      },
      [this.types.DRIVER_ASSIGNED]: {
        title: 'Driver Assigned',
        body: 'Driver {driverName} has been assigned to your collection route.',
        channels: [this.channels.IN_APP],
        priority: this.priorities.LOW
      },
      [this.types.ROUTE_OPTIMIZED]: {
        title: 'Route Updated',
        body: 'Your collection route has been optimized. New ETA: {eta}',
        channels: [this.channels.IN_APP],
        priority: this.priorities.LOW
      },
      [this.types.SYSTEM_MAINTENANCE]: {
        title: 'System Maintenance',
        body: 'Scheduled system maintenance on {date} from {startTime} to {endTime}',
        channels: [this.channels.PUSH, this.channels.EMAIL],
        priority: this.priorities.MEDIUM
      },
      [this.types.PAYMENT_DUE]: {
        title: 'Payment Due',
        body: 'Payment of ${amount} is due for your waste collection service.',
        channels: [this.channels.PUSH, this.channels.EMAIL],
        priority: this.priorities.HIGH
      },
      [this.types.ISSUE_REPORTED]: {
        title: 'Issue Reported',
        body: 'Issue #{issueId} has been reported and is being investigated.',
        channels: [this.channels.IN_APP],
        priority: this.priorities.MEDIUM
      },
      [this.types.ISSUE_RESOLVED]: {
        title: 'Issue Resolved',
        body: 'Issue #{issueId} has been resolved. Thank you for your patience.',
        channels: [this.channels.PUSH, this.channels.EMAIL],
        priority: this.priorities.MEDIUM
      },
      [this.types.ANALYTICS_REPORT]: {
        title: 'Weekly Analytics Report',
        body: 'Your weekly analytics report is ready. You saved {carbonReduction}kg CO2 this week!',
        channels: [this.channels.EMAIL],
        priority: this.priorities.LOW
      }
    };
  }

  // Template variable replacement
  formatMessage(template, variables = {}) {
    let formatted = template;
    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      formatted = formatted.replace(new RegExp(placeholder, 'g'), variables[key]);
    });
    return formatted;
  }

  // Create notification with template
  async createNotification(type, userId, variables = {}, options = {}) {
    const template = this.templates[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    const notification = {
      type,
      recipient: userId,
      title: this.formatMessage(template.title, variables),
      body: this.formatMessage(template.body, variables),
      priority: options.priority || template.priority,
      channels: options.channels || template.channels,
      metadata: {
        variables,
        ...options.metadata
      },
      scheduledFor: options.scheduledFor || new Date(),
      expiresAt: options.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    return await Notification.create(notification);
  }

  // Bulk notification creation
  async createBulkNotifications(type, userIds, variables = {}, options = {}) {
    const notifications = userIds.map(userId => ({
      type,
      recipient: userId,
      ...this.prepareNotificationData(type, variables, options)
    }));

    return await Notification.insertMany(notifications);
  }

  prepareNotificationData(type, variables, options) {
    const template = this.templates[type];
    return {
      title: this.formatMessage(template.title, variables),
      body: this.formatMessage(template.body, variables),
      priority: options.priority || template.priority,
      channels: options.channels || template.channels,
      metadata: { variables, ...options.metadata },
      scheduledFor: options.scheduledFor || new Date(),
      expiresAt: options.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
  }

  // Get user preferences
  async getUserPreferences(userId) {
    const user = await User.findById(userId).select('notificationPreferences');
    return user?.notificationPreferences || {
      push: true,
      email: true,
      sms: false,
      in_app: true,
      categories: {
        collections: true,
        issues: true,
        analytics: false,
        maintenance: true
      }
    };
  }

  // Filter notifications based on user preferences
  async filterByPreferences(notifications, userId) {
    const preferences = await this.getUserPreferences(userId);
    
    return notifications.filter(notification => {
      // Check if user has enabled this notification category
      const categoryEnabled = this.getCategoryEnabled(notification.type, preferences);
      if (!categoryEnabled) return false;

      // Filter channels based on user preferences
      notification.channels = notification.channels.filter(channel => 
        preferences[channel] === true
      );

      return notification.channels.length > 0;
    });
  }

  getCategoryEnabled(type, preferences) {
    const categoryMap = {
      [this.types.COLLECTION_SCHEDULED]: 'collections',
      [this.types.COLLECTION_REMINDER]: 'collections',
      [this.types.COLLECTION_STARTED]: 'collections',
      [this.types.COLLECTION_COMPLETED]: 'collections',
      [this.types.DRIVER_ASSIGNED]: 'collections',
      [this.types.ROUTE_OPTIMIZED]: 'collections',
      [this.types.ISSUE_REPORTED]: 'issues',
      [this.types.ISSUE_RESOLVED]: 'issues',
      [this.types.ANALYTICS_REPORT]: 'analytics',
      [this.types.SYSTEM_MAINTENANCE]: 'maintenance',
      [this.types.PAYMENT_DUE]: 'collections'
    };

    const category = categoryMap[type];
    return preferences.categories?.[category] !== false;
  }
}

const notificationService = new NotificationService();

// @route   POST /api/notifications/send
// @desc    Send notification to user(s)
// @access  Admin, Driver
router.post('/send', auth, authorize(['admin', 'driver']), async (req, res) => {
  try {
    const { type, userId, userIds, variables, options } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Notification type is required'
      });
    }

    let notifications;

    if (userIds && Array.isArray(userIds)) {
      // Bulk send
      notifications = await notificationService.createBulkNotifications(
        type, userIds, variables, options
      );
    } else if (userId) {
      // Single send
      const notification = await notificationService.createNotification(
        type, userId, variables, options
      );
      notifications = [notification];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either userId or userIds array is required'
      });
    }

    // Filter by user preferences
    const filteredNotifications = [];
    for (const notification of notifications) {
      const filtered = await notificationService.filterByPreferences(
        [notification], notification.recipient
      );
      filteredNotifications.push(...filtered);
    }

    res.status(201).json({
      success: true,
      message: 'Notifications sent successfully',
      data: {
        sent: filteredNotifications.length,
        total: notifications.length,
        notifications: filteredNotifications.map(n => ({
          id: n._id,
          type: n.type,
          recipient: n.recipient,
          title: n.title,
          priority: n.priority,
          channels: n.channels,
          scheduledFor: n.scheduledFor
        }))
      }
    });

  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  All authenticated users
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority,
      type,
      channel
    } = req.query;

    const query = { recipient: req.user.userId };

    // Add filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (type) query.type = type;
    if (channel) query.channels = { $in: [channel] };

    // Add date range filter (not expired)
    query.expiresAt = { $gt: new Date() };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1, priority: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('metadata.collectionId', 'scheduledDate status')
      .populate('metadata.driverId', 'name phone');

    const total = await Notification.countDocuments(query);

    // Mark as delivered if status is sent
    await Notification.updateMany(
      { 
        _id: { $in: notifications.map(n => n._id) },
        status: 'sent'
      },
      { 
        status: 'delivered',
        deliveredAt: new Date()
      }
    );

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications: notifications.map(n => ({
          id: n._id,
          type: n.type,
          title: n.title,
          body: n.body,
          priority: n.priority,
          status: n.status,
          channels: n.channels,
          createdAt: n.createdAt,
          scheduledFor: n.scheduledFor,
          readAt: n.readAt,
          metadata: n.metadata
        })),
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: notifications.length,
          totalItems: total
        },
        summary: {
          unread: await Notification.countDocuments({
            ...query,
            readAt: { $exists: false }
          }),
          urgent: await Notification.countDocuments({
            ...query,
            priority: 'urgent'
          })
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  All authenticated users
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id, 
        recipient: req.user.userId 
      },
      { 
        readAt: new Date(),
        status: 'read'
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: {
        id: notification._id,
        readAt: notification.readAt,
        status: notification.status
      }
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  All authenticated users
router.put('/read-all', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { 
        recipient: req.user.userId,
        readAt: { $exists: false }
      },
      { 
        readAt: new Date(),
        status: 'read'
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        updatedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/notifications/preferences
// @desc    Get user notification preferences
// @access  All authenticated users
router.get('/preferences', auth, async (req, res) => {
  try {
    const preferences = await notificationService.getUserPreferences(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Notification preferences retrieved successfully',
      data: preferences
    });

  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/notifications/preferences
// @desc    Update user notification preferences
// @access  All authenticated users
router.put('/preferences', auth, async (req, res) => {
  try {
    const { push, email, sms, in_app, categories } = req.body;

    const updateData = {
      'notificationPreferences.push': push,
      'notificationPreferences.email': email,
      'notificationPreferences.sms': sms,
      'notificationPreferences.in_app': in_app
    };

    if (categories) {
      Object.keys(categories).forEach(category => {
        updateData[`notificationPreferences.categories.${category}`] = categories[category];
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateData },
      { new: true, upsert: true }
    ).select('notificationPreferences');

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: user.notificationPreferences
    });

  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/notifications/test
// @desc    Send test notification (development only)
// @access  Admin
router.post('/test', auth, authorize(['admin']), async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test notifications are not available in production'
      });
    }

    const { type = 'collection_reminder', userId } = req.body;
    const targetUserId = userId || req.user.userId;

    const testVariables = {
      date: new Date().toLocaleDateString(),
      timeSlot: '9:00 AM - 11:00 AM',
      driverName: 'John Doe',
      weight: '15.5',
      eta: '2:30 PM',
      amount: '25.00',
      issueId: '12345',
      carbonReduction: '2.3'
    };

    const notification = await notificationService.createNotification(
      type,
      targetUserId,
      testVariables,
      { priority: 'medium' }
    );

    res.status(201).json({
      success: true,
      message: 'Test notification sent successfully',
      data: {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        priority: notification.priority,
        channels: notification.channels
      }
    });

  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  All authenticated users
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Export the notification service for use in other modules
router.notificationService = notificationService;

module.exports = router;
