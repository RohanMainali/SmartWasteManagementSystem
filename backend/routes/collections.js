const express = require('express');
const router = express.Router();
const { validationResult, body, param, query } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const CollectionRequest = require('../models/CollectionRequest');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Notification = require('../models/Notification');
const CustomerAnalytics = require('../models/CustomerAnalytics');

// Validation middleware for collection requests
const validateCollectionRequest = [
  body('address.street').notEmpty().withMessage('Street address is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('wasteTypes').isArray({ min: 1 }).withMessage('At least one waste type is required'),
  body('requestedDate').isISO8601().withMessage('Valid requested date is required'),
  body('requestedTime').isIn(['morning', 'afternoon', 'evening']).withMessage('Valid requested time is required'),
  body('specialInstructions').optional().isString().withMessage('Special instructions must be a string')
];

// @route   POST /api/collections
// @desc    Create new collection request
// @access  Private (Customer only)
router.post('/', [auth, authorize('customer'), ...validateCollectionRequest], async (req, res) => {
  try {
    console.log('🔍 Collection request received:', {
      user: req.user?.name,
      role: req.user?.role,
      body: req.body
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const collectionData = {
      ...req.body,
      customer: req.user._id
    };

    const collection = new CollectionRequest(collectionData);
    await collection.save();

    // TODO: Fix notification enum validation issue with 'new-request' type
    // Create notification for admin
    try {
      await Notification.create({
        recipient: await User.findOne({ role: 'admin' }).select('_id'),
        recipientType: 'admin',
        title: 'New Collection Request',
        message: `New collection request from ${req.user.name}`,
        type: 'pickup-scheduled',  // Using existing enum value instead of 'new-request'
        category: 'info',
        relatedCollectionRequest: collection._id,
        relatedUser: req.user._id,
        actionUrl: `/admin/collections/${collection._id}`,
        actionLabel: 'View Request'
      });
    } catch (notificationError) {
      console.warn('Failed to create notification:', notificationError.message);
      // Continue without notification - collection was still created successfully
    }

    res.status(201).json({
      success: true,
      message: 'Collection request created successfully',
      data: { collectionRequest: collection }
    });

  } catch (error) {
    console.error('Create collection request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating collection request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/collections
// @desc    Get collection requests (filtered by user role)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    
    let filter = {};
    
    // Role-based filtering
    if (req.user.role === 'customer') {
      filter.customer = req.user._id;
    } else if (req.user.role === 'driver') {
      filter.assignedDriver = req.user._id;
    }
    // Admin can see all collections (no additional filter)

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Date range filter
    if (startDate && endDate) {
      filter.requestedDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const collections = await CollectionRequest.find(filter)
      .populate('customer', 'name email profile.phone profile.address')
      .populate('assignedDriver', 'name email profile.phone')
      .populate('assignedVehicle', 'plateNumber type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await CollectionRequest.countDocuments(filter);

    res.json({
      success: true,
      data: {
        collections,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching collection requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/collections/upcoming
// @desc    Get upcoming collections for customer
// @access  Private (Customer only)
router.get('/upcoming', [auth, authorize('customer')], async (req, res) => {
  try {
    const upcomingCollections = await CollectionRequest.find({
      customer: req.user._id,
      status: { $in: ['pending', 'confirmed'] },
      requestedDate: { $gte: new Date() }
    })
    .populate('assignedDriver', 'name profile.phone')
    .sort({ requestedDate: 1 })
    .limit(5)
    .lean();

    // Transform data to match frontend expectations
    const collections = upcomingCollections.map(collection => ({
      id: collection._id,
      requestId: collection.requestId,
      date: collection.requestedDate,
      time: collection.requestedTime,
      status: collection.status,
      wasteTypes: collection.wasteTypes,
      address: collection.address,
      driver: collection.assignedDriver ? {
        name: collection.assignedDriver.name,
        phone: collection.assignedDriver.profile?.phone
      } : null,
      specialInstructions: collection.specialInstructions,
      createdAt: collection.createdAt
    }));

    res.json({
      success: true,
      data: { collections }
    });

  } catch (error) {
    console.error('Get upcoming collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming collections',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/collections/stats
// @desc    Get collection statistics for customer
// @access  Private (Customer only)
router.get('/stats', [auth, authorize('customer')], async (req, res) => {
  try {
    const stats = await CollectionRequest.aggregate([
      { $match: { customer: req.user._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      total: 0,
      completed: 0,
      pending: 0,
      cancelled: 0
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get collection stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching collection statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/collections/:id
// @desc    Get single collection request
// @access  Private
router.get('/:id', [
  auth,
  param('id').isMongoId().withMessage('Valid collection request ID is required')
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

    const collection = await CollectionRequest.findById(req.params.id)
      .populate('customer', 'name email profile.phone profile.address')
      .populate('assignedDriver', 'name email profile.phone')
      .populate('assignedVehicle', 'plateNumber type')
      .lean();

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection request not found'
      });
    }

    // Check permissions
    if (req.user.role === 'customer' && collection.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'driver' && 
        (!collection.assignedDriver || collection.assignedDriver._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { collection }
    });

  } catch (error) {
    console.error('Get collection request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching collection request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/collections/:id/reschedule
// @desc    Reschedule collection request
// @access  Private (Customer: own requests, Admin: all)
router.put('/:id/reschedule', [
  auth,
  param('id').isMongoId().withMessage('Valid collection request ID is required'),
  body('requestedDate').isISO8601().withMessage('Valid new date is required'),
  body('requestedTime').isIn(['morning', 'afternoon', 'evening']).withMessage('Valid new time is required')
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

    const collection = await CollectionRequest.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection request not found'
      });
    }

    // Check permissions
    if (req.user.role === 'customer' && collection.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only reschedule your own collection requests.'
      });
    }

    if (!collection.canBeRescheduled()) {
      return res.status(400).json({
        success: false,
        message: 'Collection request cannot be rescheduled in current status'
      });
    }

    const { requestedDate, requestedTime } = req.body;
    
    // Store original date for notification
    const originalDate = collection.requestedDate;
    
    // Update the collection request
    collection.requestedDate = new Date(requestedDate);
    collection.requestedTime = requestedTime;
    
    await collection.save();

    // Create notification for admin
    await Notification.create({
      recipient: await User.findOne({ role: 'admin' }).select('_id'),
      recipientType: 'admin',
      title: 'Collection Rescheduled',
      message: `Collection ${collection.requestId} has been rescheduled from ${originalDate.toDateString()} to ${new Date(requestedDate).toDateString()}`,
      type: 'pickup-rescheduled',
      category: 'info',
      relatedCollectionRequest: collection._id,
      relatedUser: req.user._id
    });

    res.json({
      success: true,
      message: 'Collection request rescheduled successfully',
      data: { collection }
    });

  } catch (error) {
    console.error('Reschedule collection request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error rescheduling collection request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/collections/:id/cancel
// @desc    Cancel collection request
// @access  Private (Customer: own requests, Admin: all)
router.put('/:id/cancel', [
  auth,
  param('id').isMongoId().withMessage('Valid collection request ID is required'),
  body('reason').optional().isString().withMessage('Cancellation reason must be a string')
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

    const collection = await CollectionRequest.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection request not found'
      });
    }

    // Check permissions
    if (req.user.role === 'customer' && collection.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only cancel your own collection requests.'
      });
    }

    if (!collection.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Collection request cannot be cancelled in current status'
      });
    }

    const { reason } = req.body;
    
    // Update the collection request
    collection.status = 'cancelled';
    collection.cancellationReason = reason || 'No reason provided';
    collection.cancelledAt = new Date();
    collection.cancelledBy = req.user._id;
    
    await collection.save();

    // Create notification for admin if cancelled by customer
    if (req.user.role === 'customer') {
      await Notification.create({
        recipient: await User.findOne({ role: 'admin' }).select('_id'),
        recipientType: 'admin',
        title: 'Collection Cancelled',
        message: `Collection ${collection.requestId} has been cancelled by customer. Reason: ${reason || 'No reason provided'}`,
        type: 'pickup-cancelled',
        category: 'warning',
        relatedCollectionRequest: collection._id,
        relatedUser: req.user._id
      });
    }

    // Create notification for customer if cancelled by admin
    if (req.user.role === 'admin') {
      await Notification.create({
        recipient: collection.customer,
        recipientType: 'customer',
        title: 'Collection Cancelled',
        message: `Your collection ${collection.requestId} has been cancelled. Reason: ${reason || 'No reason provided'}`,
        type: 'pickup-cancelled',
        category: 'warning',
        relatedCollectionRequest: collection._id
      });
    }

    res.json({
      success: true,
      message: 'Collection request cancelled successfully',
      data: { collection }
    });

  } catch (error) {
    console.error('Cancel collection request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling collection request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;