const express = require('express');
const router = express.Router();
const CollectionRequest = require('../models/CollectionRequest');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { auth } = require('../middleware/auth');

// @route   POST /api/test/seed-collections
// @desc    Create test collection data for development
// @access  Private
router.post('/seed-collections', auth, async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test data seeding only allowed in development mode'
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
            street: 'Boudhanath Area',
            city: 'Kathmandu',
            coordinates: {
              latitude: 27.7215,
              longitude: 85.3619
            }
          }
        }
      });
      await testDriver.save();
    }

    // Find or create test vehicle
    let testVehicle = await Vehicle.findOne({ licensePlate: 'BA 1 CHA 5678' });
    if (!testVehicle) {
      testVehicle = new Vehicle({
        licensePlate: 'BA 1 CHA 5678',
        model: 'Tata Ace',
        brand: 'Tata',
        capacity: 2500, // 2.5 tons in kg
        type: 'truck',
        status: 'active'
      });
      await testVehicle.save();
    }

    // Create test collection request
    const testCollection = new CollectionRequest({
      customer: testCustomer._id,
      requestedDate: new Date(),
      requestedTime: '10:00',
      wasteTypes: [
        { category: 'Organic', estimatedWeight: 5 },
        { category: 'Recyclable', estimatedWeight: 3 }
      ],
      estimatedWeight: 8,
      specialInstructions: 'Ring bell twice, gate number 12',
      address: {
        street: 'Thamel, Ward 26',
        city: 'Kathmandu',
        postalCode: '44600',
        coordinates: {
          latitude: 27.7056,
          longitude: 85.3178
        }
      },
      contactPhone: '+977-9841234567',
      status: 'assigned',
      assignedDriver: testDriver._id,
      assignedVehicle: testVehicle._id,
      assignedAt: new Date(),
      estimatedCost: 500,
      urgentPickup: false
    });

    await testCollection.save();

    // Create another in-progress collection
    const inProgressCollection = new CollectionRequest({
      customer: testCustomer._id,
      requestedDate: new Date(),
      requestedTime: '11:30',
      wasteTypes: [
        { category: 'Mixed', estimatedWeight: 10 }
      ],
      estimatedWeight: 10,
      specialInstructions: 'Commercial collection',
      address: {
        street: 'Patan Durbar Square',
        city: 'Lalitpur',
        postalCode: '44700',
        coordinates: {
          latitude: 27.6710,
          longitude: 85.3107
        }
      },
      contactPhone: '+977-9841234567',
      status: 'in-progress',
      assignedDriver: testDriver._id,
      assignedVehicle: testVehicle._id,
      assignedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      startedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      estimatedCost: 750,
      urgentPickup: false
    });

    await inProgressCollection.save();

    res.json({
      success: true,
      message: 'Test collection data created successfully',
      data: {
        customer: testCustomer,
        driver: testDriver,
        vehicle: testVehicle,
        collections: [testCollection, inProgressCollection]
      }
    });

  } catch (error) {
    console.error('Seed collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating test data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/test/clear-collections
// @desc    Clear test collection data
// @access  Private
router.delete('/clear-collections', auth, async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test data clearing only allowed in development mode'
      });
    }

    // Clear test data
    await CollectionRequest.deleteMany({ 
      $or: [
        { 'address.street': { $regex: /Thamel|Patan/ } },
        { contactPhone: '+977-9841234567' }
      ]
    });

    await User.deleteMany({ 
      email: { $in: ['customer@test.com', 'driver@test.com'] }
    });

    await Vehicle.deleteMany({ 
      licensePlate: 'BA 1 CHA 5678'
    });

    res.json({
      success: true,
      message: 'Test data cleared successfully'
    });

  } catch (error) {
    console.error('Clear collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing test data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
