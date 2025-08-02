const express = require('express');
const router = express.Router();
const CollectionRequest = require('../models/CollectionRequest');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

// Route optimization algorithm using a simplified version of the traveling salesman problem
class RouteOptimizer {
  constructor() {
    this.earthRadius = 6371; // Earth's radius in kilometers
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return this.earthRadius * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  // Nearest neighbor algorithm for route optimization
  optimizeRoute(depot, collectionPoints) {
    if (collectionPoints.length === 0) return [];
    if (collectionPoints.length === 1) return collectionPoints;

    const unvisited = [...collectionPoints];
    const route = [];
    let currentLocation = depot;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        unvisited[0].location.coordinates[1],
        unvisited[0].location.coordinates[0]
      );

      // Find nearest unvisited point
      for (let i = 1; i < unvisited.length; i++) {
        const distance = this.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          unvisited[i].location.coordinates[1],
          unvisited[i].location.coordinates[0]
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      // Add nearest point to route
      const nextPoint = unvisited.splice(nearestIndex, 1)[0];
      route.push({
        ...nextPoint,
        distanceFromPrevious: nearestDistance,
        estimatedTravelTime: Math.ceil(nearestDistance * 2) // 2 minutes per km (rough estimate)
      });

      currentLocation = {
        latitude: nextPoint.location.coordinates[1],
        longitude: nextPoint.location.coordinates[0]
      };
    }

    return route;
  }

  // Calculate total route statistics
  calculateRouteStats(route) {
    const totalDistance = route.reduce((sum, point) => sum + (point.distanceFromPrevious || 0), 0);
    const totalTravelTime = route.reduce((sum, point) => sum + (point.estimatedTravelTime || 0), 0);
    const totalCollectionTime = route.length * 10; // Assume 10 minutes per collection
    const totalTime = totalTravelTime + totalCollectionTime;

    return {
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalTravelTime,
      totalCollectionTime,
      totalTime,
      numberOfStops: route.length,
      estimatedFuelCost: Math.round(totalDistance * 0.8 * 100) / 100, // $0.80 per km
      co2Emissions: Math.round(totalDistance * 0.21 * 100) / 100 // 0.21 kg CO2 per km
    };
  }
}

// @route   POST /api/route-optimization/optimize
// @desc    Generate optimized route for collection requests
// @access  Driver, Admin
router.post('/optimize', auth, authorize(['driver', 'admin']), async (req, res) => {
  try {
    const { vehicleId, date, depotLocation } = req.body;

    // Validate input
    if (!vehicleId || !date || !depotLocation) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID, date, and depot location are required'
      });
    }

    // Get vehicle details
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Get pending collection requests for the specified date
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const collectionRequests = await CollectionRequest.find({
      requestedDate: {
        $gte: startDate,
        $lte: endDate
      },
      status: { $in: ['pending', 'scheduled'] },
      'location.coordinates': { $exists: true }
    }).populate('customer', 'name phone profile.address');

    if (collectionRequests.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No collection requests found for the specified date',
        data: {
          route: [],
          stats: {
            totalDistance: 0,
            totalTime: 0,
            numberOfStops: 0
          }
        }
      });
    }

    // Filter requests based on vehicle capacity and waste types
    const compatibleRequests = collectionRequests.filter(request => {
      const totalWeight = request.wasteTypes.reduce((sum, waste) => sum + (waste.estimatedWeight || 0), 0);
      return totalWeight <= vehicle.capacity.weight && 
             request.wasteTypes.every(waste => 
               vehicle.wasteTypes.includes(waste.category)
             );
    });

    // Initialize route optimizer
    const optimizer = new RouteOptimizer();

    // Optimize route
    const optimizedRoute = optimizer.optimizeRoute(depotLocation, compatibleRequests);
    const routeStats = optimizer.calculateRouteStats(optimizedRoute);

    // Calculate time slots
    let currentTime = new Date();
    currentTime.setHours(8, 0, 0, 0); // Start at 8 AM

    const routeWithSchedule = optimizedRoute.map(point => {
      const arrivalTime = new Date(currentTime);
      currentTime.setMinutes(currentTime.getMinutes() + (point.estimatedTravelTime || 0) + 10);
      const departureTime = new Date(currentTime);

      return {
        collectionId: point._id,
        customer: point.customer,
        location: {
          latitude: point.location.coordinates[1],
          longitude: point.location.coordinates[0],
          address: point.address
        },
        wasteTypes: point.wasteTypes,
        estimatedArrival: arrivalTime,
        estimatedDeparture: departureTime,
        distanceFromPrevious: point.distanceFromPrevious,
        estimatedTravelTime: point.estimatedTravelTime,
        specialInstructions: point.specialInstructions,
        priority: point.priority || 'medium'
      };
    });

    res.status(200).json({
      success: true,
      message: 'Route optimized successfully',
      data: {
        vehicleId,
        date,
        route: routeWithSchedule,
        stats: {
          ...routeStats,
          startTime: '08:00',
          estimatedEndTime: currentTime.toTimeString().slice(0, 5),
          vehicleCapacityUsed: Math.round((routeStats.numberOfStops / vehicle.capacity.collections) * 100)
        },
        depot: depotLocation,
        filteredOut: collectionRequests.length - compatibleRequests.length
      }
    });

  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/route-optimization/suggestions/:vehicleId
// @desc    Get route suggestions for a specific vehicle
// @access  Driver, Admin
router.get('/suggestions/:vehicleId', auth, authorize(['driver', 'admin']), async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Get collection requests for the next 7 days
    const suggestions = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(date);
      currentDate.setDate(currentDate.getDate() + i);
      
      const startDate = new Date(currentDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(currentDate);
      endDate.setHours(23, 59, 59, 999);

      const requests = await CollectionRequest.countDocuments({
        requestedDate: {
          $gte: startDate,
          $lte: endDate
        },
        status: { $in: ['pending', 'scheduled'] }
      });

      if (requests > 0) {
        suggestions.push({
          date: currentDate.toISOString().split('T')[0],
          requestCount: requests,
          estimatedWorkload: requests <= 10 ? 'light' : requests <= 20 ? 'medium' : 'heavy',
          recommended: requests >= 8 && requests <= 15 // Optimal workload
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Route suggestions retrieved successfully',
      data: {
        vehicleId,
        suggestions,
        vehicleCapacity: vehicle.capacity
      }
    });

  } catch (error) {
    console.error('Route suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get route suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/route-optimization/assign
// @desc    Assign optimized route to driver
// @access  Admin
router.post('/assign', auth, authorize(['admin']), async (req, res) => {
  try {
    const { vehicleId, route, driverId, date } = req.body;

    // Validate driver
    const driver = await User.findOne({
      _id: driverId,
      role: 'driver',
      status: 'active'
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Active driver not found'
      });
    }

    // Update collection requests with assigned vehicle and driver
    const collectionIds = route.map(stop => stop.collectionId);
    
    await CollectionRequest.updateMany(
      { _id: { $in: collectionIds } },
      {
        $set: {
          status: 'scheduled',
          assignedVehicle: vehicleId,
          assignedDriver: driverId,
          scheduledDate: new Date(date),
          route: {
            sequence: route.map((stop, index) => ({
              order: index + 1,
              estimatedArrival: stop.estimatedArrival,
              estimatedDeparture: stop.estimatedDeparture
            }))
          },
          updatedAt: new Date()
        }
      }
    );

    // Update vehicle status
    await Vehicle.findByIdAndUpdate(vehicleId, {
      $set: {
        status: 'assigned',
        currentRoute: {
          date: new Date(date),
          driver: driverId,
          collectionCount: route.length
        },
        updatedAt: new Date()
      }
    });

    // Create notifications for customers
    const notifications = route.map(stop => ({
      recipient: stop.customer._id,
      type: 'collection_scheduled',
      title: 'Collection Scheduled',
      message: `Your waste collection has been scheduled for ${new Date(stop.estimatedArrival).toLocaleDateString()} at approximately ${new Date(stop.estimatedArrival).toLocaleTimeString()}`,
      data: {
        collectionId: stop.collectionId,
        estimatedArrival: stop.estimatedArrival,
        driverName: driver.name,
        vehicleInfo: `${vehicle.licensePlate} - ${vehicle.model}`
      }
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({
      success: true,
      message: 'Route assigned successfully',
      data: {
        assignedCollections: collectionIds.length,
        driverName: driver.name,
        vehicleInfo: `${vehicle.licensePlate} - ${vehicle.model}`,
        scheduledDate: date,
        notificationsSent: notifications.length
      }
    });

  } catch (error) {
    console.error('Route assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
