const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Route name is required'],
    trim: true,
    maxLength: [100, 'Route name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxLength: [500, 'Description cannot exceed 500 characters']
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    validate: {
      validator: async function(driverId) {
        if (!driverId) return true;
        const User = mongoose.model('User');
        const driver = await User.findById(driverId);
        return driver && driver.role === 'driver';
      },
      message: 'Assigned user must be a driver'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'in_progress', 'completed'],
      message: 'Status must be active, inactive, in_progress, or completed'
    },
    default: 'active'
  },
  schedule: {
    frequency: {
      type: String,
      enum: {
        values: ['daily', 'weekly', 'bi_weekly', 'monthly'],
        message: 'Frequency must be daily, weekly, bi_weekly, or monthly'
      },
      default: 'weekly'
    },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    startTime: {
      type: String,
      default: '08:00',
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)']
    },
    estimatedDuration: {
      type: Number, // in minutes
      default: 240, // 4 hours default
      min: [30, 'Duration must be at least 30 minutes']
    }
  },
  locations: [{
    address: {
      street: { type: String, required: true, trim: true },
      area: { type: String, required: true, trim: true },
      city: { type: String, default: 'Kathmandu', trim: true },
      zipCode: { type: String, trim: true }
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function(coords) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && // longitude
                   coords[1] >= -90 && coords[1] <= 90;     // latitude
          },
          message: 'Invalid coordinates format [longitude, latitude]'
        }
      }
    },
    customerInfo: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      }
    },
    wasteTypes: [{
      type: String,
      enum: ['organic', 'recyclable', 'hazardous', 'electronic', 'general'],
      default: 'general'
    }],
    estimatedQuantity: {
      type: Number, // in kg
      default: 10,
      min: [0.1, 'Quantity must be positive']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    notes: {
      type: String,
      trim: true,
      maxLength: [300, 'Notes cannot exceed 300 characters']
    },
    order: {
      type: Number,
      default: 1,
      min: [1, 'Order must be positive']
    }
  }],
  metrics: {
    totalDistance: {
      type: Number, // in km
      default: 0,
      min: [0, 'Distance must be non-negative']
    },
    estimatedFuelCost: {
      type: Number, // in NPR
      default: 0,
      min: [0, 'Cost must be non-negative']
    },
    co2Emissions: {
      type: Number, // in kg
      default: 0,
      min: [0, 'Emissions must be non-negative']
    }
  },
  optimizationSettings: {
    prioritizeTime: {
      type: Boolean,
      default: true
    },
    prioritizeFuel: {
      type: Boolean,
      default: false
    },
    allowTrafficConsideration: {
      type: Boolean,
      default: true
    }
  },
  lastOptimized: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
routeSchema.index({ assignedDriver: 1 });
routeSchema.index({ status: 1 });
routeSchema.index({ 'schedule.frequency': 1 });
routeSchema.index({ 'schedule.days': 1 });
routeSchema.index({ 'locations.coordinates': '2dsphere' });
routeSchema.index({ isDeleted: 1 });

// Virtual for location count
routeSchema.virtual('locationCount').get(function() {
  return this.locations ? this.locations.length : 0;
});

// Virtual for total estimated weight
routeSchema.virtual('totalEstimatedWeight').get(function() {
  return this.locations ? 
    this.locations.reduce((total, loc) => total + (loc.estimatedQuantity || 0), 0) : 0;
});

// Virtual for next scheduled date
routeSchema.virtual('nextScheduledDate').get(function() {
  if (!this.schedule.days || this.schedule.days.length === 0) return null;
  
  const today = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[today.getDay()];
  
  // Find next occurrence
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    const checkDay = dayNames[checkDate.getDay()];
    
    if (this.schedule.days.includes(checkDay) && (i > 0 || checkDay !== currentDay)) {
      const [hours, minutes] = this.schedule.startTime.split(':');
      checkDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return checkDate;
    }
  }
  
  return null;
});

// Static methods
routeSchema.statics.findByDriver = function(driverId) {
  return this.find({
    assignedDriver: driverId,
    isDeleted: false
  });
};

routeSchema.statics.findActiveRoutes = function() {
  return this.find({
    status: 'active',
    isDeleted: false
  });
};

routeSchema.statics.findScheduledForToday = function() {
  const today = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[today.getDay()];
  
  return this.find({
    'schedule.days': currentDay,
    status: { $in: ['active', 'in_progress'] },
    isDeleted: false
  });
};

routeSchema.statics.findNearLocation = function(longitude, latitude, maxDistance = 5000) {
  return this.find({
    'locations.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isDeleted: false
  });
};

// Instance methods
routeSchema.methods.assignToDriver = async function(driverId) {
  const User = mongoose.model('User');
  const driver = await User.findById(driverId);
  
  if (!driver || driver.role !== 'driver') {
    throw new Error('Invalid driver ID');
  }
  
  this.assignedDriver = driverId;
  return this.save();
};

routeSchema.methods.unassignDriver = function() {
  this.assignedDriver = null;
  return this.save();
};

routeSchema.methods.optimizeRoute = function() {
  // Simple optimization: sort by priority then by order
  this.locations.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    
    if (priorityDiff !== 0) return priorityDiff;
    return a.order - b.order;
  });
  
  // Update order numbers
  this.locations.forEach((location, index) => {
    location.order = index + 1;
  });
  
  this.lastOptimized = new Date();
  return this.save();
};

routeSchema.methods.calculateMetrics = function() {
  // Simple distance calculation (this would be enhanced with real routing API)
  let totalDistance = 0;
  
  if (this.locations.length > 1) {
    for (let i = 0; i < this.locations.length - 1; i++) {
      const loc1 = this.locations[i].coordinates.coordinates;
      const loc2 = this.locations[i + 1].coordinates.coordinates;
      
      // Haversine formula for distance calculation
      const R = 6371; // Earth's radius in km
      const dLat = (loc2[1] - loc1[1]) * Math.PI / 180;
      const dLon = (loc2[0] - loc1[0]) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(loc1[1] * Math.PI / 180) * Math.cos(loc2[1] * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDistance += R * c;
    }
  }
  
  this.metrics.totalDistance = Math.round(totalDistance * 100) / 100; // Round to 2 decimal places
  
  // Estimate fuel cost (assuming 8 km/l and NPR 150/l)
  const fuelEfficiency = 8; // km per liter
  const fuelPrice = 150; // NPR per liter
  this.metrics.estimatedFuelCost = Math.round((totalDistance / fuelEfficiency) * fuelPrice);
  
  // Estimate CO2 emissions (2.3 kg CO2 per liter of diesel)
  this.metrics.co2Emissions = Math.round((totalDistance / fuelEfficiency) * 2.3 * 100) / 100;
  
  return this.save();
};

routeSchema.methods.startRoute = function() {
  this.status = 'in_progress';
  return this.save();
};

routeSchema.methods.completeRoute = function() {
  this.status = 'completed';
  return this.save();
};

module.exports = mongoose.model('Route', routeSchema);
