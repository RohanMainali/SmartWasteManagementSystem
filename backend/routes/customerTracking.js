const express = require('express');
const router = express.Router();
const CollectionRequest = require('../models/CollectionRequest');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { auth, authorize } = require('../middleware/auth');
const { param, validationResult } = require('express-validator');

// @route   GET /api/tracking/driver/:collectionId
// @desc    Get driver tracking information for a specific collection
// @access  Private (Customer can track their collection, Driver can track their assignment)
router.get('/driver/:collectionId', [
  auth,
  param('collectionId').isMongoId().withMessage('Valid collection ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection ID',
        errors: errors.array()
      });
    }

    const collection = await CollectionRequest.findById(req.params.collectionId)
      .populate('customer', 'name phone')
      .populate('assignedDriver', 'name phone profile')
      .populate('assignedVehicle', 'licensePlate model brand capacity');

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    // Check permissions
    const canAccess = (
      (req.user.role === 'customer' && collection.customer._id.toString() === req.user._id.toString()) ||
      (req.user.role === 'driver' && collection.assignedDriver && collection.assignedDriver._id.toString() === req.user._id.toString()) ||
      req.user.role === 'admin'
    );

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only track your own collections or assignments.'
      });
    }

    if (!collection.assignedDriver) {
      return res.status(404).json({
        success: false,
        message: 'No driver assigned to this collection yet'
      });
    }

    // Get driver's current location (in a real app, this would come from GPS tracking)
    // For now, we'll simulate a location
    const mockLocation = {
      lat: 40.7589 + (Math.random() - 0.5) * 0.01,
      lng: -73.9851 + (Math.random() - 0.5) * 0.01,
      address: "En route to pickup location",
      timestamp: new Date().toISOString(),
    };

    // Calculate estimated arrival (mock calculation)
    const now = new Date();
    const estimatedArrival = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
    const distanceAway = (Math.random() * 5 + 0.5).toFixed(1); // Random distance 0.5-5.5 km

    // Get driver's other collections for today to show route
    const todaysCollections = await CollectionRequest.find({
      assignedDriver: collection.assignedDriver._id,
      requestedDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    })
    .populate('customer', 'name')
    .sort('requestedDate');

    // Format route data
    const route = todaysCollections.map((coll, index) => ({
      id: coll._id,
      address: coll.fullAddress,
      customer: coll.customer.name,
      status: getCollectionStatus(coll, collection._id),
      completedAt: coll.status === 'completed' ? coll.completedAt : null,
      startedAt: coll.status === 'in-progress' ? coll.scheduledAt : null,
      estimatedTime: coll.preferredTimeRange ? coll.preferredTimeRange.start : '10:00 AM',
      isCurrentUser: req.user.role === 'customer' && coll._id.toString() === collection._id.toString(),
      timeSpent: coll.status === 'completed' ? calculateTimeSpent(coll) : null,
      estimatedDuration: "00:08:00" // Mock duration
    }));

    const currentStopIndex = route.findIndex(stop => stop.status === 'in-progress');
    const completedStops = route.filter(stop => stop.status === 'completed').length;

    const trackingData = {
      collection: {
        id: collection._id,
        requestId: collection.requestId,
        status: collection.status,
        scheduledDate: collection.requestedDate,
        wasteTypes: collection.wasteTypes
      },
      driver: {
        id: collection.assignedDriver._id,
        name: collection.assignedDriver.name,
        phone: collection.assignedDriver.phone,
        rating: collection.assignedDriver.profile?.rating || 4.5,
        totalCollections: collection.assignedDriver.profile?.totalCollections || 500,
        photo: collection.assignedDriver.profile?.photo || null,
        status: "active"
      },
      vehicle: collection.assignedVehicle ? {
        id: collection.assignedVehicle._id,
        licensePlate: collection.assignedVehicle.licensePlate,
        model: collection.assignedVehicle.model,
        brand: collection.assignedVehicle.brand,
        capacity: collection.assignedVehicle.capacity
      } : null,
      currentLocation: mockLocation,
      estimatedArrival: estimatedArrival.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      distanceAway: `${distanceAway} km`,
      stopsRemaining: route.length - completedStops - 1,
      currentStop: currentStopIndex >= 0 ? currentStopIndex + 1 : completedStops + 1,
      totalStops: route.length,
      route: route,
      lastUpdate: new Date().toISOString(),
      notifications: generateTrackingNotifications(collection)
    };

    res.json({
      success: true,
      data: trackingData
    });

  } catch (error) {
    console.error('Get driver tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching driver tracking information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/tracking/customer/active
// @desc    Get active collection tracking for customer
// @access  Private (Customer only)
router.get('/customer/active', [auth, authorize('customer')], async (req, res) => {
  try {
    // Find customer's active collection
    const activeCollection = await CollectionRequest.findOne({
      customer: req.user._id,
      status: { $in: ['assigned', 'in-progress'] },
      requestedDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999) + 24 * 60 * 60 * 1000) // Include tomorrow
      }
    })
    .populate('assignedDriver', 'name phone profile')
    .populate('assignedVehicle', 'licensePlate model')
    .sort('requestedDate');

    if (!activeCollection) {
      return res.status(404).json({
        success: false,
        message: 'No active collection found for tracking'
      });
    }

    // Get tracking data using the existing endpoint logic
    const trackingResponse = await getTrackingData(activeCollection, req.user);

    res.json({
      success: true,
      data: trackingResponse
    });

  } catch (error) {
    console.error('Get customer active tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active collection tracking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/tracking/driver/:collectionId/location
// @desc    Update driver location for a collection (Driver only)
// @access  Private (Driver only)
router.post('/driver/:collectionId/location', [
  auth,
  authorize('driver'),
  param('collectionId').isMongoId().withMessage('Valid collection ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection ID',
        errors: errors.array()
      });
    }

    const { latitude, longitude, heading, speed } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const collection = await CollectionRequest.findById(req.params.collectionId);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    // Verify driver is assigned to this collection
    if (!collection.assignedDriver || collection.assignedDriver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update location for your assigned collections.'
      });
    }

    // Update driver location (in production, this would be stored in a tracking collection)
    // For now, we'll update the collection with the latest location
    collection.driverLocation = {
      coordinates: [longitude, latitude],
      heading: heading || null,
      speed: speed || null,
      lastUpdated: new Date()
    };

    await collection.save();

    // In a real-time system, this would trigger WebSocket updates to customers tracking this driver

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        collectionId: collection._id,
        location: {
          latitude,
          longitude,
          heading,
          speed,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Update driver location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating driver location',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper functions
function getCollectionStatus(collection, currentCollectionId) {
  if (collection.status === 'completed') return 'completed';
  if (collection.status === 'in-progress') return 'in-progress';
  if (collection._id.toString() === currentCollectionId.toString() && collection.status === 'assigned') {
    return 'upcoming'; // Current user's collection
  }
  return 'upcoming';
}

function calculateTimeSpent(collection) {
  if (collection.completedAt && collection.scheduledAt) {
    const start = new Date(collection.scheduledAt);
    const end = new Date(collection.completedAt);
    const diffMs = end - start;
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return null;
}

function generateTrackingNotifications(collection) {
  const notifications = [];
  
  if (collection.status === 'assigned') {
    notifications.push({
      id: 1,
      message: "Driver has been assigned to your collection",
      timestamp: collection.scheduledAt || new Date().toISOString(),
      type: "info",
      read: false
    });
  }
  
  if (collection.status === 'in-progress') {
    notifications.push({
      id: 2,
      message: "Driver is approaching your location",
      timestamp: new Date().toISOString(),
      type: "info",
      read: false
    });
  }

  return notifications;
}

async function getTrackingData(collection, user) {
  // This function contains the core tracking logic that can be reused
  // Implementation would be similar to the main tracking endpoint
  // Simplified for now - in production, this would be extracted to a service
  
  return {
    collection: {
      id: collection._id,
      requestId: collection.requestId,
      status: collection.status
    },
    driver: collection.assignedDriver ? {
      id: collection.assignedDriver._id,
      name: collection.assignedDriver.name,
      phone: collection.assignedDriver.phone
    } : null,
    isTracking: collection.status === 'in-progress'
  };
}

// @route   POST /api/customer-tracking/test/create-fake-data
// @desc    Create fake tracking data for testing (Development only)
// @access  Public (in development)
router.post('/test/create-fake-data', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only available in development'
      });
    }

    // Create or find a test customer
    let testCustomer = await User.findOne({ email: 'test.customer@safacycle.com' });
    if (!testCustomer) {
      testCustomer = new User({
        name: 'Test Customer',
        email: 'test.customer@safacycle.com',
        phone: '+977-9841234567',
        role: 'customer',
        password: 'password123', // In real app, this would be hashed
        address: 'Thamel, Kathmandu',
        isVerified: true
      });
      await testCustomer.save();
    }

    // Create or find a test driver
    let testDriver = await User.findOne({ email: 'ram.sharma@safacycle.com' });
    if (!testDriver) {
      testDriver = new User({
        name: 'Ram Sharma',
        email: 'ram.sharma@safacycle.com',
        phone: '+977-9851234567',
        role: 'driver',
        password: 'password123',
        isVerified: true,
        driverInfo: {
          licenseNumber: 'DL-001-2024',
          licenseExpiry: new Date('2026-12-31'),
          vehicleAssigned: null
        }
      });
      await testDriver.save();
    }

    // Create or find a test vehicle
    let testVehicle = await Vehicle.findOne({ plateNumber: 'BA 1 KHA 2345' });
    if (!testVehicle) {
      testVehicle = new Vehicle({
        plateNumber: 'BA 1 KHA 2345',
        licensePlate: 'BA 1 KHA 2345', // Keep both for compatibility
        model: 'Tata Ace',
        brand: 'Tata',
        type: 'truck',
        year: 2022,
        capacity: {
          weight: 1000, // kg
          volume: 2.5   // cubic meters
        },
        driver: testDriver._id,
        status: 'active'
      });
      await testVehicle.save();
    }

    // Create fake collection for August 4, 2025 at 8:45 AM
    const august4Date = new Date('2025-08-04');
    
    let fakeCollection = await CollectionRequest.findOne({
      customer: testCustomer._id,
      requestedDate: august4Date
    });

    if (!fakeCollection) {
      fakeCollection = new CollectionRequest({
        customer: testCustomer._id,
        requestedDate: august4Date,
        requestedTime: 'morning', // Use enum value
        preferredTimeRange: {
          start: '08:00',
          end: '10:00'
        },
        pickupLocation: {
          type: 'Point',
          coordinates: [85.3081, 27.7115] // [longitude, latitude] for Thamel
        },
        address: {
          street: 'Thamel Marg',
          city: 'Kathmandu',
          state: 'Bagmati Province',
          zipCode: '44600',
          country: 'Nepal',
          landmark: 'Near Thamel Chowk',
          specialInstructions: 'Test collection for tracking demo'
        },
        wasteTypes: [
          { category: 'general', estimatedWeight: 3 },
          { category: 'recyclable', estimatedWeight: 2 }
        ],
        totalEstimatedWeight: 5,
        status: 'in-progress', // Use valid enum value for active tracking
        assignedDriver: testDriver._id,
        assignedVehicle: testVehicle._id,
        contactPhone: '+977-9841234567',
        priority: 'normal'
      });
      await fakeCollection.save();
    }

    res.json({
      success: true,
      message: 'Fake tracking data created successfully',
      data: {
        collection: fakeCollection,
        customer: {
          id: testCustomer._id,
          name: testCustomer.name,
          email: testCustomer.email
        },
        driver: {
          id: testDriver._id,
          name: testDriver.name,
          email: testDriver.email
        },
        vehicle: {
          id: testVehicle._id,
          licensePlate: testVehicle.licensePlate,
          model: testVehicle.model
        }
      }
    });

  } catch (error) {
    console.error('Error creating fake tracking data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create fake tracking data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
