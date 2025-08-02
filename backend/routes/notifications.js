const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth, authorize } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      unreadOnly = false,
      type,
      page = 1,
      limit = 20,
      sortBy = '-createdAt'
    } = req.query;

    const options = {
      unreadOnly: unreadOnly === 'true',
      type,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy
    };

    const notifications = await Notification.getUserNotifications(req.user._id, options);
    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          currentPage: parseInt(page),
          hasNext: notifications.length === parseInt(limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notifications count
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
      isDeleted: false
    });

    res.json({
      success: true,
      data: { count: unreadCount }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/notifications/stats
// @desc    Get notification statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.role === 'customer' ? req.user._id : null;
    const stats = await Notification.getNotificationStats(userId);

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/notifications/type-stats
// @desc    Get notification type statistics (Admin only)
// @access  Private (Admin)
router.get('/type-stats', [auth, authorize('admin')], async (req, res) => {
  try {
    const typeStats = await Notification.getTypeStats();

    res.json({
      success: true,
      data: { typeStats }
    });

  } catch (error) {
    console.error('Get type stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching type statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/notifications/:id
// @desc    Get single notification
// @access  Private
router.get('/:id', [
  auth,
  param('id').isMongoId().withMessage('Valid notification ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID',
        errors: errors.array()
      });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
      isDeleted: false
    })
      .populate('relatedCollectionRequest', 'requestId requestedDate')
      .populate('relatedIssue', 'issueId title')
      .populate('relatedUser', 'name');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Mark as read if not already read
    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.json({
      success: true,
      data: { notification }
    });

  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', [
  auth,
  param('id').isMongoId().withMessage('Valid notification ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID',
        errors: errors.array()
      });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
      isDeleted: false
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/notifications/:id/click
// @desc    Track notification click
// @access  Private
router.put('/:id/click', [
  auth,
  param('id').isMongoId().withMessage('Valid notification ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID',
        errors: errors.array()
      });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
      isDeleted: false
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.markAsClicked();

    res.json({
      success: true,
      message: 'Notification click tracked',
      data: { 
        notification: {
          _id: notification._id,
          clickCount: notification.clickCount,
          actionUrl: notification.actionUrl
        }
      }
    });

  } catch (error) {
    console.error('Track notification click error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking notification click',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user._id);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { 
        modifiedCount: result.modifiedCount 
      }
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification (soft delete)
// @access  Private
router.delete('/:id', [
  auth,
  param('id').isMongoId().withMessage('Valid notification ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID',
        errors: errors.array()
      });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
      isDeleted: false
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.softDelete();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/notifications/bulk
// @desc    Create bulk notifications (Admin only)
// @access  Private (Admin)
router.post('/bulk', [
  auth,
  authorize('admin'),
  body('notifications')
    .isArray({ min: 1 })
    .withMessage('Notifications array is required'),
  body('notifications.*.recipient')
    .isMongoId()
    .withMessage('Valid recipient ID is required'),
  body('notifications.*.title')
    .notEmpty()
    .withMessage('Notification title is required'),
  body('notifications.*.message')
    .notEmpty()
    .withMessage('Notification message is required'),
  body('notifications.*.type')
    .isIn([
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
      'general'
    ])
    .withMessage('Invalid notification type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { notifications } = req.body;

    // Add default values to each notification
    const processedNotifications = notifications.map(notification => ({
      ...notification,
      recipientType: notification.recipientType || 'customer',
      category: notification.category || 'info',
      priority: notification.priority || 'normal'
    }));

    const createdNotifications = await Notification.createBulkNotifications(processedNotifications);

    res.status(201).json({
      success: true,
      message: `${createdNotifications.length} notifications created successfully`,
      data: { 
        count: createdNotifications.length,
        batchId: createdNotifications[0].batchId
      }
    });

  } catch (error) {
    console.error('Create bulk notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating bulk notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/notifications/send-reminder
// @desc    Send pickup reminder notifications (Admin only)
// @access  Private (Admin)
router.post('/send-reminder', [
  auth,
  authorize('admin'),
  body('reminderType')
    .isIn(['pickup-tomorrow', 'pickup-today', 'pickup-overdue'])
    .withMessage('Invalid reminder type'),
  body('customerIds')
    .optional()
    .isArray()
    .withMessage('Customer IDs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { reminderType, customerIds } = req.body;

    // This would typically integrate with a job queue system
    // For now, we'll create a simple reminder notification

    let title, message, type;
    
    switch (reminderType) {
      case 'pickup-tomorrow':
        title = 'Pickup Reminder';
        message = 'Your waste collection is scheduled for tomorrow. Please prepare your waste for pickup.';
        type = 'pickup-reminder';
        break;
      case 'pickup-today':
        title = 'Pickup Today';
        message = 'Your waste collection is scheduled for today. Please ensure your waste is ready for pickup.';
        type = 'pickup-reminder';
        break;
      case 'pickup-overdue':
        title = 'Overdue Pickup';
        message = 'Your scheduled pickup was missed. Please contact support to reschedule.';
        type = 'pickup-reminder';
        break;
    }

    // Create notifications for specified customers or all customers
    const notifications = [];
    
    if (customerIds && customerIds.length > 0) {
      customerIds.forEach(customerId => {
        notifications.push({
          recipient: customerId,
          recipientType: 'customer',
          title,
          message,
          type,
          category: 'info',
          priority: reminderType === 'pickup-overdue' ? 'high' : 'normal'
        });
      });
    } else {
      // This would require querying all customers with upcoming pickups
      // Implementation would depend on your business logic
      return res.status(400).json({
        success: false,
        message: 'Customer IDs must be specified for reminder notifications'
      });
    }

    const createdNotifications = await Notification.createBulkNotifications(notifications);

    res.json({
      success: true,
      message: `${createdNotifications.length} reminder notifications sent successfully`,
      data: { 
        count: createdNotifications.length,
        reminderType
      }
    });

  } catch (error) {
    console.error('Send reminder notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reminder notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/notifications/pending
// @desc    Get pending notifications for delivery (Admin only)
// @access  Private (Admin)
router.get('/pending', [auth, authorize('admin')], async (req, res) => {
  try {
    const pendingNotifications = await Notification.getPendingNotifications();

    res.json({
      success: true,
      data: { 
        notifications: pendingNotifications,
        count: pendingNotifications.length
      }
    });

  } catch (error) {
    console.error('Get pending notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/notifications/:id/delivery-status
// @desc    Update notification delivery status (Admin only)
// @access  Private (Admin)
router.put('/:id/delivery-status', [
  auth,
  authorize('admin'),
  param('id').isMongoId().withMessage('Valid notification ID is required'),
  body('channel')
    .isIn(['push', 'email', 'sms'])
    .withMessage('Invalid delivery channel'),
  body('success')
    .isBoolean()
    .withMessage('Success status is required'),
  body('messageId')
    .optional()
    .isString(),
  body('error')
    .optional()
    .isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const { channel, success, messageId, error } = req.body;

    await notification.markChannelSent(
      channel,
      success ? messageId : null,
      success ? null : error
    );

    res.json({
      success: true,
      message: 'Delivery status updated successfully',
      data: { 
        notification: {
          _id: notification._id,
          status: notification.status,
          channels: notification.channels
        }
      }
    });

  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating delivery status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
