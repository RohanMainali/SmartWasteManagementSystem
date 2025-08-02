const express = require('express');
const router = express.Router();
const CollectionRequest = require('../models/CollectionRequest');
const User = require('../models/User');

// @route   GET /api/test-tracking/customer/active
// @desc    Get active collection tracking for testing (no auth required)
// @access  Public (development only)
router.get('/customer/active', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test tracking only allowed in development mode'
      });
    }

    // Find test customer
    const testCustomer = await User.findOne({ email: 'customer@test.com' });
    if (!testCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Test customer not found. Create test tracking data first.'
      });
    }

    // Find customer's active collection
    const activeCollection = await CollectionRequest.findOne({
      customer: testCustomer._id,
      status: { $in: ['assigned', 'in-progress'] }
    })
    .populate('assignedDriver', 'name phone profile')
    .populate('assignedVehicle', 'licensePlate model')
    .sort('-createdAt');

    if (!activeCollection) {
      return res.status(404).json({
        success: false,
        message: 'No active collection found for tracking'
      });
    }

    // Simulate tracking data
    const trackingData = {
      collection: {
        requestId: activeCollection.requestId || `WC-KTM-${activeCollection._id.toString().slice(-6)}`,
        status: activeCollection.status,
        requestedDate: activeCollection.requestedDate,
        wasteTypes: activeCollection.wasteTypes
      },
      driver: {
        name: activeCollection.assignedDriver?.name || 'Ram Bahadur Thapa',
        phone: activeCollection.assignedDriver?.phone || '+977-9851234567'
      },
      vehicle: {
        model: 'Tata Ace',
        licensePlate: 'बा १ च ५६७८'
      },
      driverLocation: {
        latitude: 27.7172,
        longitude: 85.3240,
        distance: 2.3,
        estimatedArrival: '15 minutes'
      },
      lastUpdate: new Date().toISOString()
    };

    res.json({
      success: true,
      data: trackingData
    });

  } catch (error) {
    console.error('Test tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test tracking data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/test-tracking/driver/upcoming
// @desc    Get upcoming collections for driver testing (no auth required)
// @access  Public (development only)
router.get('/driver/upcoming', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test tracking only allowed in development mode'
      });
    }

    // Simulate upcoming collections for driver
    const upcomingCollections = [
      {
        _id: 'collection1',
        customer: { name: 'Ram Shrestha' },
        address: {
          street: 'Thamel, Ward 26',
          city: 'Kathmandu',
          state: 'Bagmati'
        },
        status: 'assigned',
        requestedTime: 'morning',
        wasteTypes: [
          { category: 'organic' },
          { category: 'recyclable' }
        ],
        requestedDate: new Date().toISOString()
      },
      {
        _id: 'collection2',
        customer: { name: 'Sita Devi' },
        address: {
          street: 'Patan Durbar Square',
          city: 'Lalitpur',
          state: 'Bagmati'
        },
        status: 'confirmed',
        requestedTime: 'afternoon',
        wasteTypes: [
          { category: 'plastic' },
          { category: 'paper' }
        ],
        requestedDate: new Date().toISOString()
      },
      {
        _id: 'collection3',
        customer: { name: 'Hari Bahadur' },
        address: {
          street: 'Bhaktapur Old Town',
          city: 'Bhaktapur',
          state: 'Bagmati'
        },
        status: 'in-progress',
        requestedTime: 'evening',
        wasteTypes: [
          { category: 'electronic' },
          { category: 'hazardous' }
        ],
        requestedDate: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: upcomingCollections
    });

  } catch (error) {
    console.error('Test driver upcoming error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test driver data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/test-tracking/driver/stats
// @desc    Get driver stats for testing (no auth required)
// @access  Public (development only)
router.get('/driver/stats', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test tracking only allowed in development mode'
      });
    }

    // Simulate driver stats
    const driverStats = {
      todayTotal: 8,
      completedToday: 3,
      pendingToday: 5,
      totalDistance: "23.4 km"
    };

    res.json({
      success: true,
      data: driverStats
    });

  } catch (error) {
    console.error('Test driver stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test driver stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/test-tracking/analytics/stats
// @desc    Get analytics stats for testing (fallback for /api/analytics/stats)
// @access  Public (development only)
router.get('/analytics/stats', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test analytics only allowed in development mode'
      });
    }

    const analyticsStats = {
      totalCollections: 145,
      completedToday: 12,
      pendingCollections: 8,
      efficiency: 85.5,
      routeCompletion: 92.3,
      customerSatisfaction: 4.6,
      wasteProcessed: 2.4, // tons
      recyclingRate: 68.2,
      monthlyGrowth: 12.5,
      activeCustomers: 89,
      totalRoutes: 15,
      avgCollectionTime: 18.5 // minutes
    };

    res.json({
      success: true,
      data: analyticsStats
    });

  } catch (error) {
    console.error('Test analytics stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test analytics stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/test-tracking/routes/driver
// @desc    Get driver routes for testing
// @access  Public (development only)
router.get('/routes/driver', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test routes only allowed in development mode'
      });
    }

    const driverRoutes = {
      activeRoute: {
        id: "RT-001",
        name: "Residential Route A - Kathmandu Central",
        description: "Daily collection route covering central Kathmandu residential areas",
        status: "in_progress",
        totalStops: 15,
        completedStops: 8,
        estimatedTime: "2h 30m",
        remainingTime: "1h 15m",
        startTime: "08:00 AM",
        currentLocation: {
          latitude: 27.7172,
          longitude: 85.3240,
          address: "369 Ash Boulevard, Kathmandu"
        },
        optimizationScore: 85,
        completionPercentage: 53.3
      },
      routes: [
        {
          id: "RT-001",
          name: "Residential Route A - Kathmandu Central",
          status: "in_progress",
          totalStops: 15,
          completedStops: 8,
          estimatedTime: "2h 30m",
          remainingTime: "1h 15m",
          priority: "high"
        },
        {
          id: "RT-002", 
          name: "Commercial Route B - Business District",
          status: "pending",
          totalStops: 12,
          completedStops: 0,
          estimatedTime: "3h 00m",
          remainingTime: "3h 00m",
          priority: "medium"
        },
        {
          id: "RT-003",
          name: "Mixed Route C - Residential + Commercial",
          status: "scheduled",
          totalStops: 18,
          completedStops: 0,
          estimatedTime: "4h 15m",
          remainingTime: "4h 15m",
          priority: "low"
        }
      ]
    };

    res.json({
      success: true,
      data: driverRoutes
    });

  } catch (error) {
    console.error('Test driver routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test driver routes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/test-tracking/routes/:routeId
// @desc    Get detailed route information
// @access  Public (development only)
router.get('/routes/:routeId', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test routes only allowed in development mode'
      });
    }

    const { routeId } = req.params;

    const routeDetails = {
      id: routeId,
      name: "Residential Route A - Kathmandu Central",
      description: "Daily collection route covering central Kathmandu residential areas",
      status: "in_progress",
      totalStops: 15,
      completedStops: 8,
      estimatedTime: "2h 30m",
      remainingTime: "1h 15m",
      startTime: "08:00 AM",
      driver: {
        id: "driver123",
        name: "Ram Bahadur Shrestha",
        phone: "+977-9841234567"
      },
      vehicle: {
        id: "VEH-001",
        plateNumber: "BA 1 PA 1234",
        type: "Waste Collection Truck"
      },
      stops: [
        {
          id: 1,
          address: "123 Oak Street, Thamel",
          customerName: "Sita Devi Store",
          phone: "+977-9851111111",
          coordinates: { latitude: 27.7172, longitude: 85.3240 },
          wasteTypes: ["general", "recyclable"],
          estimatedTime: "08:15 AM",
          status: "completed",
          completedAt: "2025-08-02T08:14:32Z",
          notes: "Collection completed successfully"
        },
        {
          id: 2,
          address: "456 Pine Avenue, New Baneshwor",
          customerName: "Gita Restaurant",
          phone: "+977-9852222222",
          coordinates: { latitude: 27.6892, longitude: 85.3458 },
          wasteTypes: ["organic", "general"],
          estimatedTime: "08:30 AM",
          status: "completed",
          completedAt: "2025-08-02T08:28:15Z",
          notes: "Large amount of organic waste collected"
        },
        {
          id: 3,
          address: "789 Maple Drive, Lalitpur",
          customerName: "Krishna Family",
          phone: "+977-9853333333",
          coordinates: { latitude: 27.6644, longitude: 85.3188 },
          wasteTypes: ["general"],
          estimatedTime: "08:45 AM",
          status: "completed",
          completedAt: "2025-08-02T08:43:20Z",
          notes: "Regular household waste"
        },
        {
          id: 4,
          address: "321 Elm Street, Bhaktapur",
          customerName: "Hari Electronics",
          phone: "+977-9854444444",
          coordinates: { latitude: 27.6728, longitude: 85.4298 },
          wasteTypes: ["electronic", "general"],
          estimatedTime: "09:00 AM",
          status: "completed",
          completedAt: "2025-08-02T08:58:45Z",
          notes: "Electronic waste collected separately"
        },
        {
          id: 5,
          address: "654 Cedar Lane, Kirtipur",
          customerName: "Maya Bakery",
          phone: "+977-9855555555",
          coordinates: { latitude: 27.6769, longitude: 85.2774 },
          wasteTypes: ["organic", "general"],
          estimatedTime: "09:15 AM",
          status: "completed",
          completedAt: "2025-08-02T09:12:30Z",
          notes: "Bakery waste collected"
        },
        {
          id: 6,
          address: "987 Birch Road, Sankhamul",
          customerName: "Shyam Recycling Center",
          phone: "+977-9856666666",
          coordinates: { latitude: 27.6985, longitude: 85.3211 },
          wasteTypes: ["recyclable"],
          estimatedTime: "09:30 AM",
          status: "completed",
          completedAt: "2025-08-02T09:27:10Z",
          notes: "Only recyclable materials"
        },
        {
          id: 7,
          address: "147 Willow Way, Chabahil",
          customerName: "Laxmi Apartments",
          phone: "+977-9857777777",
          coordinates: { latitude: 27.7209, longitude: 85.3607 },
          wasteTypes: ["general"],
          estimatedTime: "09:45 AM",
          status: "completed",
          completedAt: "2025-08-02T09:41:55Z",
          notes: "Apartment complex collection"
        },
        {
          id: 8,
          address: "258 Spruce Circle, Bouddha",
          customerName: "Tenzin Monastery Kitchen",
          phone: "+977-9858888888",
          coordinates: { latitude: 27.7206, longitude: 85.3616 },
          wasteTypes: ["organic", "general"],
          estimatedTime: "10:00 AM",
          status: "completed",
          completedAt: "2025-08-02T09:58:20Z",
          notes: "Monastery kitchen waste"
        },
        {
          id: 9,
          address: "369 Ash Boulevard, Maharajgunj",
          customerName: "Bikash Medical Store",
          phone: "+977-9859999999",
          coordinates: { latitude: 27.7394, longitude: 85.3328 },
          wasteTypes: ["hazardous", "general"],
          estimatedTime: "10:15 AM",
          status: "current",
          notes: "Medical waste requires special handling"
        },
        {
          id: 10,
          address: "741 Cherry Street, Dillibazar",
          customerName: "Anita Fashion Store",
          phone: "+977-9851010101",
          coordinates: { latitude: 27.7056, longitude: 85.3290 },
          wasteTypes: ["recyclable", "general"],
          estimatedTime: "10:30 AM",
          status: "pending",
          notes: ""
        },
        {
          id: 11,
          address: "852 Poplar Avenue, Putalisadak",
          customerName: "Rajesh Commercial Complex",
          phone: "+977-9851111111",
          coordinates: { latitude: 27.7089, longitude: 85.3159 },
          wasteTypes: ["general", "recyclable"],
          estimatedTime: "10:45 AM",
          status: "pending",
          notes: ""
        },
        {
          id: 12,
          address: "963 Hickory Drive, Baneshwor",
          customerName: "Sunita Grocery",
          phone: "+977-9851212121",
          coordinates: { latitude: 27.6892, longitude: 85.3458 },
          wasteTypes: ["organic", "general"],
          estimatedTime: "11:00 AM",
          status: "pending",
          notes: ""
        },
        {
          id: 13,
          address: "159 Sycamore Lane, Koteshwor",
          customerName: "Dinesh Auto Parts",
          phone: "+977-9851313131",
          coordinates: { latitude: 27.6751, longitude: 85.3516 },
          wasteTypes: ["hazardous", "general"],
          estimatedTime: "11:15 AM",
          status: "pending",
          notes: ""
        },
        {
          id: 14,
          address: "357 Dogwood Road, Balkhu",
          customerName: "Kamala Textile Mill",
          phone: "+977-9851414141",
          coordinates: { latitude: 27.6694, longitude: 85.2985 },
          wasteTypes: ["general", "recyclable"],
          estimatedTime: "11:30 AM",
          status: "pending",
          notes: ""
        },
        {
          id: 15,
          address: "486 Magnolia Court, Kalimati",
          customerName: "Gopal Vegetable Market",
          phone: "+977-9851515151",
          coordinates: { latitude: 27.6969, longitude: 85.2951 },
          wasteTypes: ["organic"],
          estimatedTime: "11:45 AM",
          status: "pending",
          notes: ""
        }
      ],
      optimization: {
        score: 85,
        suggestedReorder: false,
        timeSavings: "12 minutes",
        fuelSavings: "2.3 liters"
      },
      weather: {
        condition: "Partly Cloudy",
        temperature: "26°C",
        humidity: "65%",
        visibility: "Good"
      }
    };

    res.json({
      success: true,
      data: routeDetails
    });

  } catch (error) {
    console.error('Test route details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test route details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/test-tracking/routes/:routeId/start
// @desc    Start a route (test endpoint)
// @access  Public (development only)
router.post('/routes/:routeId/start', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test routes only allowed in development mode'
      });
    }

    const { routeId } = req.params;

    res.json({
      success: true,
      message: 'Route started successfully',
      data: {
        routeId,
        status: 'active',
        startedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Test start route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting test route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/test-tracking/routes/:routeId/pause
// @desc    Pause a route (test endpoint)
// @access  Public (development only)
router.post('/routes/:routeId/pause', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test routes only allowed in development mode'
      });
    }

    const { routeId } = req.params;

    res.json({
      success: true,
      message: 'Route paused successfully',
      data: {
        routeId,
        status: 'paused',
        pausedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Test pause route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error pausing test route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/test-tracking/routes/:routeId/complete
// @desc    Complete a route (test endpoint)
// @access  Public (development only)
router.post('/routes/:routeId/complete', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test routes only allowed in development mode'
      });
    }

    const { routeId } = req.params;
    const { summary } = req.body;

    res.json({
      success: true,
      message: 'Route completed successfully',
      data: {
        routeId,
        status: 'completed',
        completedAt: new Date().toISOString(),
        summary: summary || {
          totalStops: 15,
          completedStops: 15,
          duration: '2h 45m',
          totalDistance: '35.2 km'
        }
      }
    });

  } catch (error) {
    console.error('Test complete route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing test route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/test-tracking/routes/:routeId/optimize
// @desc    Optimize a route (test endpoint)
// @access  Public (development only)
router.post('/routes/:routeId/optimize', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test routes only allowed in development mode'
      });
    }

    const { routeId } = req.params;

    res.json({
      success: true,
      message: 'Route optimized successfully',
      data: {
        routeId,
        optimizationScore: 92,
        timeSaved: '18 minutes',
        fuelSaved: '3.2 liters',
        optimizedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Test optimize route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error optimizing test route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/test-tracking/routes/:routeId/stops/:stopId/status
// @desc    Update stop status (test endpoint)
// @access  Public (development only)
router.put('/routes/:routeId/stops/:stopId/status', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test routes only allowed in development mode'
      });
    }

    const { routeId, stopId } = req.params;
    const { status, notes } = req.body;

    res.json({
      success: true,
      message: 'Stop status updated successfully',
      data: {
        routeId,
        stopId,
        status,
        notes,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Test update stop status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating test stop status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
