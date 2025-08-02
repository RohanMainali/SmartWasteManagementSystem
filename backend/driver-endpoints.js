// @route   GET /api/collections/driver/dashboard
// @desc    Get driver dashboard data
// @access  Driver
router.get('/driver/dashboard', [auth, authorize('driver')], async (req, res) => {
  try {
    const driverId = req.user._id;
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Get today's collections
    const todaysCollections = await CollectionRequest.find({
      assignedDriver: driverId,
      requestedDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
    .populate('customer', 'name profile.phone profile.address')
    .populate('assignedVehicle', 'plateNumber model brand')
    .sort('requestedDate');

    // Get pending collections (assigned but not started)
    const pendingCollections = await CollectionRequest.find({
      assignedDriver: driverId,
      status: 'assigned'
    }).countDocuments();

    // Get in-progress collections
    const inProgressCollections = await CollectionRequest.find({
      assignedDriver: driverId,
      status: 'in-progress'
    })
    .populate('customer', 'name profile.phone profile.address')
    .sort('requestedDate');

    // Get driver performance stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const performanceStats = await CollectionRequest.aggregate([
      {
        $match: {
          assignedDriver: mongoose.Types.ObjectId(driverId),
          requestedDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalCollections: { $sum: 1 },
          completedCollections: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$finalCost' },
          averageRating: { $avg: '$driverRating' }
        }
      }
    ]);

    const stats = performanceStats[0] || {
      totalCollections: 0,
      completedCollections: 0,
      totalRevenue: 0,
      averageRating: 0
    };

    // Calculate completion rate
    const completionRate = stats.totalCollections > 0 
      ? (stats.completedCollections / stats.totalCollections * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        todaysCollections,
        inProgressCollections,
        summary: {
          todayTotal: todaysCollections.length,
          pending: pendingCollections,
          inProgress: inProgressCollections.length,
          completedToday: todaysCollections.filter(c => c.status === 'completed').length
        },
        performance: {
          totalCollections: stats.totalCollections,
          completedCollections: stats.completedCollections,
          completionRate: `${completionRate}%`,
          totalRevenue: `NPR ${(stats.totalRevenue || 0).toFixed(2)}`,
          averageRating: (stats.averageRating || 0).toFixed(1)
        }
      }
    });

  } catch (error) {
    console.error('Get driver dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching driver dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/collections/driver/upcoming
// @desc    Get driver's upcoming collections
// @access  Driver
router.get('/driver/upcoming', [auth, authorize('driver')], async (req, res) => {
  try {
    const driverId = req.user._id;
    const { limit = 20 } = req.query;

    const upcomingCollections = await CollectionRequest.find({
      assignedDriver: driverId,
      status: { $in: ['assigned', 'in-progress'] },
      requestedDate: { $gte: new Date() }
    })
    .populate('customer', 'name profile.phone profile.address')
    .populate('assignedVehicle', 'plateNumber model brand type')
    .sort('requestedDate')
    .limit(parseInt(limit));

    // Format for driver app
    const formattedCollections = upcomingCollections.map(collection => ({
      id: collection._id,
      requestId: collection.requestId,
      customer: {
        name: collection.customer.name,
        phone: collection.customer.profile?.phone,
        address: {
          street: collection.address.street,
          city: collection.address.city,
          district: collection.address.district,
          coordinates: collection.address.coordinates
        }
      },
      scheduledTime: collection.requestedDate,
      timeSlot: collection.timeSlot,
      wasteTypes: collection.wasteTypes,
      estimatedWeight: collection.totalEstimatedWeight,
      estimatedCost: collection.estimatedCost,
      status: collection.status,
      priority: collection.priority,
      specialInstructions: collection.specialInstructions,
      vehicle: collection.assignedVehicle ? {
        plateNumber: collection.assignedVehicle.plateNumber,
        model: collection.assignedVehicle.model,
        brand: collection.assignedVehicle.brand,
        type: collection.assignedVehicle.type
      } : null
    }));

    res.json({
      success: true,
      data: {
        collections: formattedCollections,
        total: upcomingCollections.length,
        pending: formattedCollections.filter(c => c.status === 'assigned').length,
        inProgress: formattedCollections.filter(c => c.status === 'in-progress').length
      }
    });

  } catch (error) {
    console.error('Get driver upcoming collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming collections',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
