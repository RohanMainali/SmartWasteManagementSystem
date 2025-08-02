const express = require('express');
const router = express.Router();
const CollectionRequest = require('../models/CollectionRequest');
const User = require('../models/User');

// @route   GET /api/health
// @desc    Health check endpoint
// @access  Public
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SafaCycle Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// @route   POST /api/health/create-test-tracking
// @desc    Create test tracking data for development (no auth required)
// @access  Public (development only)
router.post('/create-test-tracking', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test data creation only allowed in development mode'
      });
    }

    // Find or create test customer
    let testCustomer = await User.findOne({ email: 'customer@test.com' });
    if (!testCustomer) {
      testCustomer = new User({
        name: 'Ram Sharma',
        email: 'customer@test.com',
        phone: '+977-9841234567',
        role: 'customer',
        profile: {
          address: {
            street: 'Thamel, Ward 26',
            city: 'Kathmandu',
            coordinates: {
              latitude: 27.7056,
              longitude: 85.3178
            }
          }
        }
      });
      await testCustomer.save();
    }

    // Find or create test driver
    let testDriver = await User.findOne({ email: 'driver@test.com' });
    if (!testDriver) {
      testDriver = new User({
        name: 'Ram Bahadur Thapa',
        email: 'driver@test.com',
        phone: '+977-9851234567',
        role: 'driver',
        profile: {
          address: {
            street: 'Durbar Marg',
            city: 'Kathmandu',
            coordinates: {
              latitude: 27.7024,
              longitude: 85.3186
            }
          }
        },
        driverInfo: {
          licenseNumber: 'DL-123456789',
          vehicleType: 'Truck',
          experience: 5
        }
      });
      await testDriver.save();
    }

    // Create active collection request
    const activeCollection = new CollectionRequest({
      customer: testCustomer._id,
      requestedDate: new Date(),
      requestedTime: 'morning',
      preferredTimeRange: {
        start: '08:00',
        end: '10:00'
      },
      wasteTypes: [
        { category: 'organic', estimatedWeight: 10 },
        { category: 'recyclable', estimatedWeight: 5 }
      ],
      address: {
        street: 'Thamel, Ward 26',
        city: 'Kathmandu',
        state: 'Bagmati',
        zipCode: '44600'
      },
      pickupLocation: {
        type: 'Point',
        coordinates: [85.3178, 27.7056]
      },
      specialInstructions: 'Test collection - Sample data',
      status: 'in-progress',
      assignedDriver: testDriver._id,
      assignedVehicle: null
    });

    await activeCollection.save();

    res.json({
      success: true,
      message: 'Test tracking data created successfully',
      data: {
        collectionId: activeCollection._id,
        customer: testCustomer.name,
        driver: testDriver.name,
        status: activeCollection.status
      }
    });

  } catch (error) {
    console.error('Test tracking creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test tracking data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
