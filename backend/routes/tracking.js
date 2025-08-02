const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const CollectionRequest = require('../models/CollectionRequest');
const { auth, authorize } = require('../middleware/auth');

// In-memory store for real-time tracking data
// In production, use Redis or similar
const trackingData = new Map();

// Location tracking model
class LocationUpdate {
  constructor(data) {
    this.driverId = data.driverId;
    this.vehicleId = data.vehicleId;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.accuracy = data.accuracy || 10;
    this.heading = data.heading || 0;
    this.speed = data.speed || 0;
    this.timestamp = new Date();
    this.status = data.status || 'active'; // active, break, offline
    this.currentCollection = data.currentCollection || null;
  }
}

// @route   POST /api/tracking/location
// @desc    Update driver's current location
// @access  Driver
router.post('/location', auth, authorize(['driver']), async (req, res) => {
  try {
    const { latitude, longitude, accuracy, heading, speed, status, currentCollection } = req.body;
    const driverId = req.user.userId;

    // Validate coordinates
    if (!latitude || !longitude || 
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    // Get driver's assigned vehicle
    const driver = await User.findById(driverId).populate('assignedVehicle');
    if (!driver || !driver.assignedVehicle) {
      return res.status(400).json({
        success: false,
        message: 'No vehicle assigned to driver'
      });
    }

    // Create location update
    const locationUpdate = new LocationUpdate({
      driverId,
      vehicleId: driver.assignedVehicle._id,
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      status,
      currentCollection
    });

    // Store in memory (use Redis in production)
    trackingData.set(driverId, locationUpdate);

    // Update vehicle's last known location
    await Vehicle.findByIdAndUpdate(driver.assignedVehicle._id, {
      $set: {
        'location.coordinates': [longitude, latitude],
        'location.lastUpdated': new Date(),
        'tracking.speed': speed,
        'tracking.heading': heading,
        'tracking.status': status,
        updatedAt: new Date()
      }
    });

    // If driver is at a collection site, update collection status
    if (currentCollection && status === 'collecting') {
      await CollectionRequest.findByIdAndUpdate(currentCollection, {
        $set: {
          status: 'in_progress',
          'tracking.arrivedAt': new Date(),
          'tracking.driverLocation': {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          updatedAt: new Date()
        }
      });
    }

    // Broadcast location to subscribers (WebSocket)
    // This would integrate with your WebSocket service
    const locationData = {
      type: 'driver_location',
      data: {
        driverId,
        vehicleId: driver.assignedVehicle._id,
        location: { latitude, longitude },
        speed,
        heading,
        status,
        timestamp: locationUpdate.timestamp,
        vehicleInfo: {
          licensePlate: driver.assignedVehicle.licensePlate,
          model: driver.assignedVehicle.model
        }
      }
    };

    // Here you would broadcast via WebSocket to connected clients
    // broadcastToSubscribers(locationData);

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        timestamp: locationUpdate.timestamp,
        received: {
          latitude,
          longitude,
          status
        }
      }
    });

  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/tracking/driver/:driverId
// @desc    Get current location of a specific driver
// @access  Admin, Customer (for their assigned driver)
router.get('/driver/:driverId', auth, async (req, res) => {
  try {
    const { driverId } = req.params;
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role;

    // Check permissions
    if (requestingUserRole === 'customer') {
      // Customer can only track driver assigned to their active collection
      const activeCollection = await CollectionRequest.findOne({
        customer: requestingUserId,
        assignedDriver: driverId,
        status: { $in: ['scheduled', 'in_progress', 'en_route'] }
      });

      if (!activeCollection) {
        return res.status(403).json({
          success: false,
          message: 'You can only track drivers assigned to your active collections'
        });
      }
    }

    // Get location from memory store
    const locationData = trackingData.get(driverId);
    
    if (!locationData) {
      return res.status(404).json({
        success: false,
        message: 'Driver location not available',
        data: null
      });
    }

    // Get driver info
    const driver = await User.findById(driverId)
      .select('name profile.phone')
      .populate('assignedVehicle', 'licensePlate model type capacity');

    // Check if location is stale (older than 5 minutes)
    const isStale = (new Date() - locationData.timestamp) > 5 * 60 * 1000;

    res.status(200).json({
      success: true,
      message: 'Driver location retrieved successfully',
      data: {
        driverId,
        driver: {
          name: driver.name,
          phone: driver.profile?.phone
        },
        vehicle: driver.assignedVehicle,
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy
        },
        movement: {
          speed: locationData.speed,
          heading: locationData.heading
        },
        status: locationData.status,
        currentCollection: locationData.currentCollection,
        timestamp: locationData.timestamp,
        isStale,
        lastUpdated: Math.floor((new Date() - locationData.timestamp) / 1000) // seconds ago
      }
    });

  } catch (error) {
    console.error('Get driver location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver location',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/tracking/vehicles/active
// @desc    Get all active vehicles with current locations
// @access  Admin
router.get('/vehicles/active', auth, authorize(['admin']), async (req, res) => {
  try {
    const activeVehicles = [];

    // Get all tracking data
    for (const [driverId, locationData] of trackingData.entries()) {
      const driver = await User.findById(driverId)
        .select('name profile.phone')
        .populate('assignedVehicle', 'licensePlate model type status');

      if (driver && driver.assignedVehicle) {
        const isStale = (new Date() - locationData.timestamp) > 5 * 60 * 1000;
        
        activeVehicles.push({
          driverId,
          driver: {
            name: driver.name,
            phone: driver.profile?.phone
          },
          vehicle: driver.assignedVehicle,
          location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy
          },
          movement: {
            speed: locationData.speed,
            heading: locationData.heading
          },
          status: locationData.status,
          timestamp: locationData.timestamp,
          isStale,
          lastUpdated: Math.floor((new Date() - locationData.timestamp) / 1000)
        });
      }
    }

    // Sort by last updated (most recent first)
    activeVehicles.sort((a, b) => b.timestamp - a.timestamp);

    res.status(200).json({
      success: true,
      message: 'Active vehicles retrieved successfully',
      data: {
        vehicles: activeVehicles,
        totalActive: activeVehicles.filter(v => !v.isStale).length,
        totalTracked: activeVehicles.length,
        lastRefresh: new Date()
      }
    });

  } catch (error) {
    console.error('Get active vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active vehicles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/tracking/collection/start
// @desc    Mark collection as started at current location
// @access  Driver
router.post('/collection/start', auth, authorize(['driver']), async (req, res) => {
  try {
    const { collectionId, latitude, longitude } = req.body;
    const driverId = req.user.userId;

    // Validate collection exists and is assigned to this driver
    const collection = await CollectionRequest.findOne({
      _id: collectionId,
      assignedDriver: driverId,
      status: { $in: ['scheduled', 'en_route'] }
    }).populate('customer', 'name profile.phone profile.address');

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found or not assigned to you'
      });
    }

    // Update collection status
    await CollectionRequest.findByIdAndUpdate(collectionId, {
      $set: {
        status: 'in_progress',
        'tracking.startedAt': new Date(),
        'tracking.startLocation': {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        updatedAt: new Date()
      }
    });

    // Update driver's current collection in tracking
    const locationData = trackingData.get(driverId);
    if (locationData) {
      locationData.currentCollection = collectionId;
      locationData.status = 'collecting';
      trackingData.set(driverId, locationData);
    }

    // Notify customer
    const notification = {
      recipient: collection.customer._id,
      type: 'collection_started',
      title: 'Collection Started',
      message: `Your waste collection has started. The driver is now at your location.`,
      data: {
        collectionId,
        driverLocation: { latitude, longitude },
        startTime: new Date()
      }
    };

    // Here you would create the notification and broadcast via WebSocket

    res.status(200).json({
      success: true,
      message: 'Collection started successfully',
      data: {
        collectionId,
        customer: collection.customer,
        startTime: new Date(),
        location: { latitude, longitude }
      }
    });

  } catch (error) {
    console.error('Start collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start collection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/tracking/collection/complete
// @desc    Mark collection as completed
// @access  Driver
router.post('/collection/complete', auth, authorize(['driver']), async (req, res) => {
  try {
    const { collectionId, latitude, longitude, actualWasteCollected, notes } = req.body;
    const driverId = req.user.userId;

    // Validate collection
    const collection = await CollectionRequest.findOne({
      _id: collectionId,
      assignedDriver: driverId,
      status: 'in_progress'
    }).populate('customer', 'name profile.phone');

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found or not in progress'
      });
    }

    // Update collection status
    await CollectionRequest.findByIdAndUpdate(collectionId, {
      $set: {
        status: 'completed',
        'tracking.completedAt': new Date(),
        'tracking.endLocation': {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        actualWasteCollected: actualWasteCollected || collection.wasteTypes,
        completionNotes: notes,
        updatedAt: new Date()
      }
    });

    // Update driver's tracking status
    const locationData = trackingData.get(driverId);
    if (locationData) {
      locationData.currentCollection = null;
      locationData.status = 'active';
      trackingData.set(driverId, locationData);
    }

    // Calculate collection duration
    const duration = collection.tracking?.startedAt ? 
      Math.round((new Date() - new Date(collection.tracking.startedAt)) / 1000 / 60) : null;

    res.status(200).json({
      success: true,
      message: 'Collection completed successfully',
      data: {
        collectionId,
        completedAt: new Date(),
        duration: duration ? `${duration} minutes` : null,
        location: { latitude, longitude },
        wasteCollected: actualWasteCollected || collection.wasteTypes
      }
    });

  } catch (error) {
    console.error('Complete collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete collection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/tracking/route/progress/:driverId
// @desc    Get driver's route progress for the day
// @access  Admin, Driver (own route)
router.get('/route/progress/:driverId', auth, async (req, res) => {
  try {
    const { driverId } = req.params;
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role;

    // Check permissions
    if (requestingUserRole === 'driver' && driverId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own route progress'
      });
    }

    // Get today's collections for the driver
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysCollections = await CollectionRequest.find({
      assignedDriver: driverId,
      scheduledDate: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('customer', 'name profile.address profile.phone')
    .sort({ 'route.sequence.order': 1 });

    // Get current location
    const currentLocation = trackingData.get(driverId);

    // Calculate progress
    const completed = todaysCollections.filter(c => c.status === 'completed').length;
    const inProgress = todaysCollections.filter(c => c.status === 'in_progress').length;
    const pending = todaysCollections.filter(c => c.status === 'scheduled').length;

    res.status(200).json({
      success: true,
      message: 'Route progress retrieved successfully',
      data: {
        driverId,
        date: today.toISOString().split('T')[0],
        progress: {
          total: todaysCollections.length,
          completed,
          inProgress,
          pending,
          completionRate: todaysCollections.length > 0 ? 
            Math.round((completed / todaysCollections.length) * 100) : 0
        },
        collections: todaysCollections.map(collection => ({
          id: collection._id,
          customer: collection.customer,
          address: collection.address,
          status: collection.status,
          estimatedTime: collection.route?.sequence?.estimatedArrival,
          actualStartTime: collection.tracking?.startedAt,
          actualEndTime: collection.tracking?.completedAt,
          wasteTypes: collection.wasteTypes
        })),
        currentLocation: currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          timestamp: currentLocation.timestamp,
          status: currentLocation.status
        } : null
      }
    });

  } catch (error) {
    console.error('Get route progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get route progress',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
