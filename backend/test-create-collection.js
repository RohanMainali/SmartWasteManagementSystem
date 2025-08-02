const mongoose = require('mongoose');
const CollectionRequest = require('./models/CollectionRequest');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/safacycle', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createTestCollection() {
  try {
    // Find a customer user
    const customer = await User.findOne({ role: 'customer' });
    if (!customer) {
      console.log('No customer found. Please create a customer user first.');
      return;
    }

    // Find or create a driver user
    let driver = await User.findOne({ role: 'driver' });
    if (!driver) {
      // Create a test driver
      driver = new User({
        name: 'Ram Bahadur Thapa',
        email: 'driver.ram@safacycle.np',
        phone: '+977-9851234567',
        role: 'driver',
        profile: {
          address: {
            street: 'Patan Dhoka',
            city: 'Lalitpur',
            district: 'Lalitpur',
            province: 'Bagmati'
          }
        }
      });
      await driver.save();
      console.log('Created test driver:', driver.name);
    }

    // Create test collection with Nepal context
    const testCollection = new CollectionRequest({
      customer: customer._id,
      requestedDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      address: {
        street: 'Thamel, Ward 26',
        city: 'Kathmandu',
        district: 'Kathmandu',
        province: 'Bagmati',
        coordinates: {
          latitude: 27.7172,
          longitude: 85.3240
        }
      },
      contactPhone: '+977-9841234567',
      wasteTypes: [
        {
          category: 'organic',
          estimatedWeight: 3,
          description: 'Kitchen waste and food scraps'
        },
        {
          category: 'recyclable',
          estimatedWeight: 2,
          description: 'Plastic bottles and paper'
        }
      ],
      totalEstimatedWeight: 5,
      estimatedCost: 125.50,
      priority: 'normal',
      specialInstructions: 'Please ring the bell twice. Gate is next to Himalayan Java Coffee.',
      status: 'assigned', // Set as assigned so it shows in tracking
      assignedDriver: driver._id,
      assignedAt: new Date(),
      timeSlot: 'morning' // 08:00 - 11:00
    });

    await testCollection.save();
    
    console.log('✅ Test collection created successfully!');
    console.log('Collection ID:', testCollection._id);
    console.log('Customer:', customer.name);
    console.log('Driver:', driver.name);
    console.log('Address:', testCollection.address.street + ', ' + testCollection.address.city);
    console.log('Status:', testCollection.status);
    console.log('Time Slot:', testCollection.timeSlot);
    
    console.log('\\n🎉 Now test the Driver Tracking screen - it should show this active collection!');
    
  } catch (error) {
    console.error('Error creating test collection:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestCollection();
