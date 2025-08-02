const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateRoute = [
  body('name')
    .notEmpty()
    .withMessage('Route name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Route name must be between 2 and 100 characters'),
  
  body('schedule.frequency')
    .optional()
    .isIn(['daily', 'weekly', 'bi_weekly', 'monthly'])
    .withMessage('Frequency must be daily, weekly, bi_weekly, or monthly'),
  
  body('schedule.days')
    .optional()
    .isArray()
    .withMessage('Days must be an array'),
  
  body('schedule.days.*')
    .optional()
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid day of week'),
  
  body('locations')
    .optional()
    .isArray()
    .withMessage('Locations must be an array'),
  
  body('locations.*.address.street')
    .optional()
    .notEmpty()
    .withMessage('Street address is required'),
  
  body('locations.*.address.area')
    .optional()
    .notEmpty()
    .withMessage('Area is required'),
  
  body('locations.*.coordinates.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [longitude, latitude]')
];

// @route   GET /api/routes
// @desc    Get all routes
// @access  Private (Admin/Driver)
router.get('/', auth, async (req, res) => {
  try {
    // Check authorization
    if (req.user.role !== 'admin' && req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Driver role required.'
      });
    }

    let filter = { isDeleted: false };
    
    // For drivers, only show their assigned routes
    if (req.user.role === 'driver') {
      filter.assignedDriver = req.user._id;
    }

    // Apply filters
    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.frequency) {
      filter['schedule.frequency'] = req.query.frequency;
    }

    const routes = await Route.find(filter)
      .populate('assignedDriver', 'name email profile.phone')
      .populate('locations.customerInfo.customerId', 'name email profile.phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { routes }
    });

  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching routes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/routes/:id
// @desc    Get route by ID
// @access  Private (Admin/Driver - own route only)
router.get('/:id', auth, async (req, res) => {
  try {
    const route = await Route.findOne({
      _id: req.params.id,
      isDeleted: false
    })
    .populate('assignedDriver', 'name email profile.phone driverInfo.licenseNumber')
    .populate('locations.customerInfo.customerId', 'name email profile.phone');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization
    if (req.user.role === 'driver' && route.assignedDriver?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your assigned routes.'
      });
    }

    res.json({
      success: true,
      data: { route }
    });

  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/routes
// @desc    Create new route
// @access  Private (Admin only)
router.post('/', [auth, ...validateRoute], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check authorization
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const route = new Route(req.body);

    // Calculate initial metrics if locations are provided
    if (route.locations && route.locations.length > 0) {
      await route.calculateMetrics();
    }

    await route.save();

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: { route }
    });

  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/routes/:id
// @desc    Update route
// @access  Private (Admin only)
router.put('/:id', [auth, ...validateRoute], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check authorization
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const route = await Route.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Update route
    Object.keys(req.body).forEach(key => {
      route[key] = req.body[key];
    });

    // Recalculate metrics if locations were updated
    if (req.body.locations) {
      await route.calculateMetrics();
    }

    await route.save();

    res.json({
      success: true,
      message: 'Route updated successfully',
      data: { route }
    });

  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/routes/:id/assign
// @desc    Assign route to driver
// @access  Private (Admin only)
router.post('/:id/assign', [
  auth,
  body('driverId').isMongoId().withMessage('Valid driver ID is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check authorization
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const route = await Route.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    await route.assignToDriver(req.body.driverId);

    const updatedRoute = await Route.findById(route._id)
      .populate('assignedDriver', 'name email profile.phone');

    res.json({
      success: true,
      message: 'Route assigned to driver successfully',
      data: { route: updatedRoute }
    });

  } catch (error) {
    console.error('Assign route error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error assigning route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/routes/:id/optimize
// @desc    Optimize route order
// @access  Private (Admin only)
router.post('/:id/optimize', auth, async (req, res) => {
  try {
    // Check authorization
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const route = await Route.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    await route.optimizeRoute();
    await route.calculateMetrics();

    res.json({
      success: true,
      message: 'Route optimized successfully',
      data: { route }
    });

  } catch (error) {
    console.error('Optimize route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error optimizing route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/routes/:id/start
// @desc    Start route collection
// @access  Private (Driver - own route only)
router.post('/:id/start', auth, async (req, res) => {
  try {
    const route = await Route.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization
    if (req.user.role === 'driver' && route.assignedDriver?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only start your assigned routes.'
      });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Driver role required.'
      });
    }

    await route.startRoute();

    res.json({
      success: true,
      message: 'Route started successfully',
      data: { route }
    });

  } catch (error) {
    console.error('Start route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/routes/:id/complete
// @desc    Complete route collection
// @access  Private (Driver - own route only)
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const route = await Route.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check authorization
    if (req.user.role === 'driver' && route.assignedDriver?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only complete your assigned routes.'
      });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Driver role required.'
      });
    }

    await route.completeRoute();

    res.json({
      success: true,
      message: 'Route completed successfully',
      data: { route }
    });

  } catch (error) {
    console.error('Complete route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/routes/scheduled/today
// @desc    Get routes scheduled for today
// @access  Private (Admin/Driver)
router.get('/scheduled/today', auth, async (req, res) => {
  try {
    // Check authorization
    if (req.user.role !== 'admin' && req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Driver role required.'
      });
    }

    let routes = await Route.findScheduledForToday()
      .populate('assignedDriver', 'name email profile.phone');

    // For drivers, filter to only their routes
    if (req.user.role === 'driver') {
      routes = routes.filter(route => 
        route.assignedDriver && route.assignedDriver._id.toString() === req.user._id.toString()
      );
    }

    res.json({
      success: true,
      data: { routes }
    });

  } catch (error) {
    console.error('Get scheduled routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scheduled routes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/routes/driver
// @desc    Get driver's active route and route list
// @access  Private (Driver)
router.get('/driver', [auth, authorize('driver')], async (req, res) => {
  try {
    const routes = await Route.find({ 
      assignedDriver: req.user._id,
      isDeleted: false 
    })
    .populate('assignedDriver', 'name email profile.phone')
    .sort({ status: 1, createdAt: -1 });

    // Find active route
    const activeRoute = routes.find(route => route.status === 'in_progress') || null;

    res.json({
      success: true,
      data: {
        activeRoute,
        routes: routes.map(route => ({
          id: route._id,
          name: route.name,
          status: route.status,
          totalStops: route.locations.length,
          completedStops: route.locations.filter(loc => loc.status === 'completed').length,
          estimatedTime: route.schedule.estimatedDuration + ' minutes',
          remainingTime: 'Calculating...',
          priority: route.priority || 'medium'
        }))
      }
    });

  } catch (error) {
    console.error('Get driver routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching driver routes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/routes/:routeId/stops/:stopId
// @desc    Update stop status (complete, skip, etc.)
// @access  Private (Driver)
router.put('/:routeId/stops/:stopId', [auth, authorize('driver')], async (req, res) => {
  try {
    const { routeId, stopId } = req.params;
    const { status, notes, timestamp } = req.body;

    const route = await Route.findOne({
      _id: routeId,
      assignedDriver: req.user._id,
      isDeleted: false
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found or not assigned to you'
      });
    }

    // Find and update the specific stop
    const stopIndex = route.locations.findIndex(loc => loc._id.toString() === stopId);
    if (stopIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found in route'
      });
    }

    // Update stop status
    route.locations[stopIndex].status = status;
    if (notes) route.locations[stopIndex].notes = notes;
    if (timestamp) route.locations[stopIndex].completedAt = new Date(timestamp);

    // Update route completion status
    const completedStops = route.locations.filter(loc => loc.status === 'completed').length;
    const totalStops = route.locations.length;
    
    if (completedStops === totalStops) {
      route.status = 'completed';
    } else if (completedStops > 0 && route.status === 'active') {
      route.status = 'in_progress';
    }

    await route.save();

    res.json({
      success: true,
      message: `Stop ${status} successfully`,
      data: { 
        stopId, 
        newStatus: status,
        routeStatus: route.status,
        completedStops,
        totalStops
      }
    });

  } catch (error) {
    console.error('Update stop status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating stop status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/routes/:routeId/optimize
// @desc    Optimize route order
// @access  Private (Driver)
router.post('/:routeId/optimize', [auth, authorize('driver')], async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findOne({
      _id: routeId,
      assignedDriver: req.user._id,
      isDeleted: false
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found or not assigned to you'
      });
    }

    // Simple optimization simulation
    // In a real implementation, you would use Google Maps API or similar
    const estimatedTimeSaved = Math.floor(Math.random() * 20) + 5; // 5-25 minutes

    res.json({
      success: true,
      message: 'Route optimized successfully',
      data: { 
        estimatedTimeSaved: `${estimatedTimeSaved} minutes`,
        fuelSavings: '2.3 liters',
        optimizationScore: 85
      }
    });

  } catch (error) {
    console.error('Optimize route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error optimizing route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/routes/:routeId/start
// @desc    Start a route
// @access  Private (Driver)
router.post('/:routeId/start', [auth, authorize('driver')], async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findOne({
      _id: routeId,
      assignedDriver: req.user._id,
      isDeleted: false
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found or not assigned to you'
      });
    }

    route.status = 'in_progress';
    route.actualStartTime = new Date();
    await route.save();

    res.json({
      success: true,
      message: 'Route started successfully',
      data: { routeId, status: route.status }
    });

  } catch (error) {
    console.error('Start route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/routes/:routeId/pause
// @desc    Pause a route
// @access  Private (Driver)
router.post('/:routeId/pause', [auth, authorize('driver')], async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findOne({
      _id: routeId,
      assignedDriver: req.user._id,
      isDeleted: false
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found or not assigned to you'
      });
    }

    route.status = 'paused';
    await route.save();

    res.json({
      success: true,
      message: 'Route paused successfully',
      data: { routeId, status: route.status }
    });

  } catch (error) {
    console.error('Pause route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error pausing route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/routes/:routeId/complete
// @desc    Complete a route
// @access  Private (Driver)
router.post('/:routeId/complete', [auth, authorize('driver')], async (req, res) => {
  try {
    const { routeId } = req.params;
    const { summary } = req.body;

    const route = await Route.findOne({
      _id: routeId,
      assignedDriver: req.user._id,
      isDeleted: false
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found or not assigned to you'
      });
    }

    route.status = 'completed';
    route.actualEndTime = new Date();
    if (summary) route.completionSummary = summary;
    await route.save();

    res.json({
      success: true,
      message: 'Route completed successfully',
      data: { routeId, status: route.status, completedAt: route.actualEndTime }
    });

  } catch (error) {
    console.error('Complete route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/routes/directions
// @desc    Get directions between points
// @access  Private (Driver)
router.post('/directions', [auth, authorize('driver')], async (req, res) => {
  try {
    const { origin, destination, waypoints } = req.body;

    // In a real implementation, you would use Google Maps Directions API
    // For now, returning mock data
    const mockDirections = {
      distance: '12.5 km',
      duration: '28 minutes',
      polyline: 'mock_polyline_data_here',
      steps: [
        'Head north on Current Street',
        'Turn right onto Main Road',
        'Continue for 5.2 km',
        'Turn left onto Destination Avenue',
        'Arrive at destination'
      ]
    };

    res.json({
      success: true,
      message: 'Directions calculated successfully',
      data: mockDirections
    });

  } catch (error) {
    console.error('Get directions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating directions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
