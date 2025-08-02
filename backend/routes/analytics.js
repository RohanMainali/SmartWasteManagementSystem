const express = require('express');
const router = express.Router();
const CustomerAnalytics = require('../models/CustomerAnalytics');
const CollectionRequest = require('../models/CollectionRequest');
const IssueReport = require('../models/IssueReport');
const { auth, authorize } = require('../middleware/auth');
const { param, validationResult } = require('express-validator');

// @route   GET /api/analytics
// @desc    Get customer analytics (customer: own analytics, admin: all)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'customer') {
      // Customer gets their own analytics
      const analytics = await CustomerAnalytics.getOrCreate(req.user._id);
      
      res.json({
        success: true,
        data: { analytics }
      });
    } else if (req.user.role === 'admin') {
      // Admin gets aggregate statistics
      const aggregateStats = await CustomerAnalytics.getAggregateStats();
      const topCustomers = await CustomerAnalytics.getTopCustomers('totalWeight', 10);
      
      res.json({
        success: true,
        data: { 
          aggregateStats,
          topCustomers
        }
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/analytics/dashboard
// @desc    Get customer dashboard analytics
// @access  Private (Customer)
router.get('/dashboard', [auth, authorize('customer')], async (req, res) => {
  try {
    const analytics = await CustomerAnalytics.getOrCreate(req.user._id);
    
    // Get additional real-time data
    const upcomingPickups = await CollectionRequest.getUpcomingPickups(req.user._id);
    const recentIssues = await IssueReport.getCustomerIssues(req.user._id, { 
      limit: 5,
      sortBy: '-reportedAt'
    });
    
    // Calculate current month statistics
    const currentDate = new Date();
    const currentMonth = analytics.collections.monthly.find(
      m => m.year === currentDate.getFullYear() && m.month === currentDate.getMonth() + 1
    );
    
    const dashboardData = {
      // Collection stats
      collections: {
        total: analytics.collections.total,
        completed: analytics.collections.completed,
        completionRate: analytics.collections.completionRate,
        thisMonth: currentMonth ? currentMonth.count : 0
      },
      
      // Waste stats
      waste: {
        totalWeight: analytics.waste.totalWeight,
        thisMonthWeight: currentMonth ? currentMonth.weight : 0,
        recyclingRate: analytics.waste.recycling.recyclingRate,
        topCategory: analytics.waste.byCategory.length > 0 
          ? analytics.waste.byCategory.reduce((prev, current) => 
              (prev.weight > current.weight) ? prev : current
            ).category
          : null
      },
      
      // Environmental impact
      environmental: analytics.waste.environmental,
      
      // Engagement
      engagement: {
        loyaltyTier: analytics.engagement.loyaltyTier,
        totalPoints: analytics.engagement.totalPoints,
        availablePoints: analytics.engagement.availablePoints,
        customerLifetime: analytics.engagement.customerLifetime
      },
      
      // Service quality
      service: {
        averageSatisfaction: analytics.service.averageSatisfaction,
        onTimeRate: analytics.service.onTimeRate,
        issueResolutionRate: analytics.service.issueResolutionRate
      },
      
      // Upcoming activities
      upcomingPickups: upcomingPickups.slice(0, 3),
      recentIssues: recentIssues.slice(0, 3),
      
      // Goals progress
      goals: {
        wasteReduction: analytics.wasteReductionProgress,
        recycling: analytics.recyclingProgress
      }
    };

    res.json({
      success: true,
      data: { dashboard: dashboardData }
    });

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/analytics/environmental-impact
// @desc    Get detailed environmental impact analytics
// @access  Private (Customer)
router.get('/environmental-impact', [auth, authorize('customer')], async (req, res) => {
  try {
    const analytics = await CustomerAnalytics.getOrCreate(req.user._id);
    
    // Get customer rankings
    const rankings = await CustomerAnalytics.getCustomerRankings(req.user._id);
    
    const environmentalData = {
      impact: analytics.waste.environmental,
      wasteBreakdown: analytics.waste.byCategory,
      monthlyTrends: analytics.waste.monthlyWeight.slice(-12), // Last 12 months
      recyclingStats: analytics.waste.recycling,
      rankings,
      goals: {
        wasteReduction: {
          target: analytics.goals.wasteReductionTarget,
          achieved: analytics.goals.wasteReductionAchieved,
          progress: analytics.wasteReductionProgress
        },
        recycling: {
          target: analytics.goals.recyclingTarget,
          achieved: analytics.goals.recyclingAchieved,
          progress: analytics.recyclingProgress
        }
      }
    };

    res.json({
      success: true,
      data: { environmental: environmentalData }
    });

  } catch (error) {
    console.error('Get environmental impact error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching environmental impact data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/analytics/collection-history
// @desc    Get collection history analytics
// @access  Private (Customer)
router.get('/collection-history', [auth, authorize('customer')], async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    
    // Build filter for collections
    let filter = { customer: req.user._id };
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (startDate || endDate) {
      filter.requestedDate = {};
      if (startDate) filter.requestedDate.$gte = new Date(startDate);
      if (endDate) filter.requestedDate.$lte = new Date(endDate);
    }

    // Get collections with pagination
    const collections = await CollectionRequest.find(filter)
      .populate('assignedDriver', 'name phone')
      .populate('assignedVehicle', 'licensePlate model')
      .sort({ requestedDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await CollectionRequest.countDocuments(filter);

    // Format collections for frontend
    const formattedCollections = collections.map(collection => ({
      _id: collection._id,
      id: collection._id,
      requestId: collection.requestId,
      scheduledDate: collection.requestedDate,
      requestedTime: collection.requestedTime,
      preferredTimeRange: collection.preferredTimeRange,
      wasteTypes: collection.wasteTypes?.map(w => w.category) || [],
      totalWeight: collection.totalWeightCollected || collection.totalEstimatedWeight || 0,
      status: collection.status,
      driver: collection.assignedDriver?.name || 'Not assigned',
      driverPhone: collection.assignedDriver?.phone || '',
      vehicle: collection.assignedVehicle ? 
        `${collection.assignedVehicle.licensePlate} (${collection.assignedVehicle.model})` : 
        'Not assigned',
      completedAt: collection.completedAt,
      cost: collection.actualCost || 0,
      rating: collection.customerRating || 0,
      address: collection.fullAddress,
      notes: collection.driverNotes || collection.customerNotes || '',
      beforePhotos: collection.beforePhotos || [],
      afterPhotos: collection.afterPhotos || []
    }));

    // Get analytics data
    const analytics = await CustomerAnalytics.getOrCreate(req.user._id);
    
    const historyData = {
      collections: formattedCollections,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      summary: {
        totalCollections: analytics.collections.total,
        completedCollections: analytics.collections.completed,
        cancelledCollections: analytics.collections.cancelled,
        rescheduledCollections: analytics.collections.rescheduled,
        completionRate: analytics.collections.completionRate,
        averageRating: analytics.collections.averageRating
      },
      
      trends: {
        monthly: analytics.collections.monthly.slice(-12), // Last 12 months
        weekly: analytics.collections.weekly.slice(-12) // Last 12 weeks
      },
      
      behavior: {
        preferredDays: analytics.behavior.preferredDays,
        preferredTimes: analytics.behavior.preferredTimes,
        averageFrequency: analytics.behavior.averageFrequency,
        consistencyScore: analytics.behavior.consistencyScore
      },
      
      wasteAnalysis: {
        totalWeight: analytics.waste.totalWeight,
        byCategory: analytics.waste.byCategory,
        monthlyWeight: analytics.waste.monthlyWeight.slice(-12)
      }
    };

    res.json({
      success: true,
      data: historyData
    });

  } catch (error) {
    console.error('Get collection history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching collection history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/analytics/rewards
// @desc    Get rewards and loyalty analytics
// @access  Private (Customer)
router.get('/rewards', [auth, authorize('customer')], async (req, res) => {
  try {
    const analytics = await CustomerAnalytics.getOrCreate(req.user._id);
    
    // Get customer rankings for points
    const rankings = await CustomerAnalytics.getCustomerRankings(req.user._id);
    
    const rewardsData = {
      loyalty: {
        tier: analytics.engagement.loyaltyTier,
        totalPoints: analytics.engagement.totalPoints,
        availablePoints: analytics.engagement.availablePoints,
        pointsRedeemed: analytics.engagement.pointsRedeemed,
        customerLifetime: analytics.engagement.customerLifetime
      },
      
      rankings: rankings.points,
      
      achievements: analytics.engagement.achievements,
      
      // Point earning breakdown (this would typically come from transaction history)
      pointSources: [
        { source: 'Collections', points: Math.floor(analytics.collections.completed * 10) },
        { source: 'Recycling', points: Math.floor(analytics.waste.recycling.totalRecycled * 5) },
        { source: 'Referrals', points: analytics.engagement.referralsSuccessful * 50 },
        { source: 'Reviews', points: Math.floor(analytics.collections.averageRating * analytics.collections.completed * 2) }
      ],
      
      // Next tier requirements
      tierRequirements: {
        bronze: { minPoints: 0, benefits: ['Basic rewards', 'Monthly newsletter'] },
        silver: { minPoints: 500, benefits: ['5% discount', 'Priority support', 'Eco tips'] },
        gold: { minPoints: 2000, benefits: ['10% discount', 'Free monthly pickup', 'Carbon tracking'] },
        platinum: { minPoints: 5000, benefits: ['15% discount', 'Personal eco consultant', 'VIP support'] }
      }
    };

    res.json({
      success: true,
      data: { rewards: rewardsData }
    });

  } catch (error) {
    console.error('Get rewards analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rewards data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/analytics/insights
// @desc    Get personalized customer insights
// @access  Private (Customer)
router.get('/insights', [auth, authorize('customer')], async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const analytics = await CustomerAnalytics.getOrCreate(req.user._id);
    
    // Calculate date ranges
    const now = new Date();
    let startDate, endDate = now;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get collections for the period
    const collections = await CollectionRequest.find({
      customer: req.user._id,
      requestedDate: { $gte: startDate, $lte: endDate },
      status: 'completed'
    });

    // Calculate period-specific metrics
    const totalCollections = collections.length;
    const wasteReduced = collections.reduce((sum, c) => sum + (c.totalWeightCollected || 0), 0);
    const costSaved = collections.reduce((sum, c) => sum + (c.actualCost || 0), 0);
    
    // Calculate recycling rate
    let recyclableWeight = 0;
    let totalWeight = 0;
    collections.forEach(collection => {
      if (collection.actualWasteCollected) {
        collection.actualWasteCollected.forEach(waste => {
          totalWeight += waste.weight || 0;
          if (['plastic', 'paper', 'glass', 'metal'].includes(waste.category)) {
            recyclableWeight += waste.weight || 0;
          }
        });
      }
    });
    const recyclingRate = totalWeight > 0 ? (recyclableWeight / totalWeight) * 100 : 0;

    // Calculate waste breakdown
    const wasteBreakdown = {};
    collections.forEach(collection => {
      if (collection.actualWasteCollected) {
        collection.actualWasteCollected.forEach(waste => {
          wasteBreakdown[waste.category] = (wasteBreakdown[waste.category] || 0) + (waste.weight || 0);
        });
      }
    });

    // Calculate carbon footprint reduction (kg CO2)
    const carbonFootprint = wasteReduced * 0.3; // 0.3kg CO2 per kg waste

    // Calculate streak (consecutive days with collections)
    const recentCollections = await CollectionRequest.find({
      customer: req.user._id,
      status: 'completed'
    }).sort({ completedAt: -1 }).limit(30);

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < recentCollections.length; i++) {
      const collectionDate = new Date(recentCollections[i].completedAt);
      const daysDiff = Math.floor((today - collectionDate) / (1000 * 60 * 60 * 24));
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }

    // Generate achievements
    const achievements = [];
    if (totalCollections >= 10) achievements.push("Eco Warrior");
    if (recyclingRate > 70) achievements.push("Recycling Champion");
    if (streak >= 7) achievements.push("Consistency Master");
    if (wasteReduced > 100) achievements.push("Waste Reducer");
    if (carbonFootprint > 20) achievements.push("Carbon Saver");

    // Generate monthly trend for recycling rate
    const monthlyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const trendStartDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const trendEndDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthCollections = await CollectionRequest.find({
        customer: req.user._id,
        requestedDate: { $gte: trendStartDate, $lte: trendEndDate },
        status: 'completed'
      });

      let monthRecyclableWeight = 0;
      let monthTotalWeight = 0;
      monthCollections.forEach(collection => {
        if (collection.actualWasteCollected) {
          collection.actualWasteCollected.forEach(waste => {
            monthTotalWeight += waste.weight || 0;
            if (['plastic', 'paper', 'glass', 'metal'].includes(waste.category)) {
              monthRecyclableWeight += waste.weight || 0;
            }
          });
        }
      });
      
      const monthRecyclingRate = monthTotalWeight > 0 ? (monthRecyclableWeight / monthTotalWeight) * 100 : 0;
      monthlyTrend.push(monthRecyclingRate);
    }

    // Generate insights and tips based on data
    const insights = [];
    const tips = [];

    if (recyclingRate < 50) {
      insights.push("Your recycling rate could be improved");
      tips.push("Try separating plastic, paper, glass, and metal from general waste");
    }

    if (totalCollections > 0 && totalCollections < 4) {
      insights.push("Regular collections help maintain better waste management");
      tips.push("Consider scheduling weekly collections for optimal waste management");
    }

    if (wasteReduced > 100) {
      insights.push("Great job on waste reduction!");
      tips.push("Keep up the excellent work and consider composting organic waste");
    }

    const periodData = {
      totalCollections,
      wasteReduced: Math.round(wasteReduced * 100) / 100,
      recyclingRate: Math.round(recyclingRate * 100) / 100,
      costSaved: Math.round(costSaved * 100) / 100,
      carbonFootprint: Math.round(carbonFootprint * 100) / 100,
      streak,
      achievements,
      wasteBreakdown,
      monthlyTrend,
      insights,
      tips,
      // Goals progress
      goals: {
        recyclingTarget: 75,
        recyclingProgress: Math.min(recyclingRate, 75),
        wasteReductionTarget: 200,
        wasteReductionProgress: Math.min(wasteReduced, 200),
        collectionsTarget: 12,
        collectionsProgress: Math.min(totalCollections, 12)
      }
    };

    res.json({
      success: true,
      data: { [period]: periodData }
    });

  } catch (error) {
    console.error('Get personalized insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching personalized insights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// @desc    Get specific customer analytics (Admin only)
// @access  Private (Admin)
router.get('/customer/:id', [
  auth,
  authorize('admin'),
  param('id').isMongoId().withMessage('Valid customer ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID',
        errors: errors.array()
      });
    }

    const analytics = await CustomerAnalytics.findOne({ customer: req.params.id })
      .populate('customer', 'name email profile joinDate');

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Customer analytics not found'
      });
    }

    // Get additional insights
    const rankings = await CustomerAnalytics.getCustomerRankings(req.params.id);
    
    const customerData = {
      customer: analytics.customer,
      analytics: analytics.toObject(),
      rankings,
      insights: {
        riskFactors: analytics.predictions.churnRisk.factors,
        strengths: [],
        recommendations: []
      }
    };

    // Generate insights based on data
    if (analytics.collections.completionRate > 90) {
      customerData.insights.strengths.push('High collection completion rate');
    }
    
    if (analytics.waste.recycling.recyclingRate > 70) {
      customerData.insights.strengths.push('Excellent recycling habits');
    }
    
    if (analytics.service.averageSatisfaction > 4) {
      customerData.insights.strengths.push('High satisfaction scores');
    }

    if (analytics.predictions.churnRisk.score > 60) {
      customerData.insights.recommendations.push('High churn risk - consider engagement initiatives');
    }
    
    if (analytics.collections.completionRate < 70) {
      customerData.insights.recommendations.push('Low completion rate - review scheduling preferences');
    }

    res.json({
      success: true,
      data: customerData
    });

  } catch (error) {
    console.error('Get customer analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/analytics/top-customers
// @desc    Get top customers by various metrics (Admin only)
// @access  Private (Admin)
router.get('/top-customers', [auth, authorize('admin')], async (req, res) => {
  try {
    const { metric = 'totalWeight', limit = 10 } = req.query;
    
    const validMetrics = ['totalWeight', 'totalCollections', 'totalPoints', 'recyclingRate'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid metric. Valid options: totalWeight, totalCollections, totalPoints, recyclingRate'
      });
    }

    const topCustomers = await CustomerAnalytics.getTopCustomers(metric, parseInt(limit));

    res.json({
      success: true,
      data: { 
        topCustomers,
        metric,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get top customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top customers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/analytics/calculate-churn-risk
// @desc    Calculate churn risk for customers (Admin only)
// @access  Private (Admin)
router.post('/calculate-churn-risk', [auth, authorize('admin')], async (req, res) => {
  try {
    const { customerIds } = req.body;
    
    let analyticsToUpdate;
    
    if (customerIds && Array.isArray(customerIds)) {
      // Calculate for specific customers
      analyticsToUpdate = await CustomerAnalytics.find({
        customer: { $in: customerIds }
      });
    } else {
      // Calculate for all customers
      analyticsToUpdate = await CustomerAnalytics.find({});
    }

    const results = [];
    
    for (const analytics of analyticsToUpdate) {
      await analytics.calculateChurnRisk();
      results.push({
        customerId: analytics.customer,
        churnRisk: analytics.predictions.churnRisk
      });
    }

    res.json({
      success: true,
      message: `Churn risk calculated for ${results.length} customers`,
      data: { results }
    });

  } catch (error) {
    console.error('Calculate churn risk error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating churn risk',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/analytics/update-environmental-impact
// @desc    Update environmental impact calculations (Admin only)
// @access  Private (Admin)
router.post('/update-environmental-impact', [auth, authorize('admin')], async (req, res) => {
  try {
    const { customerIds } = req.body;
    
    let analyticsToUpdate;
    
    if (customerIds && Array.isArray(customerIds)) {
      analyticsToUpdate = await CustomerAnalytics.find({
        customer: { $in: customerIds }
      });
    } else {
      analyticsToUpdate = await CustomerAnalytics.find({});
    }

    const results = [];
    
    for (const analytics of analyticsToUpdate) {
      await analytics.calculateEnvironmentalImpact();
      results.push({
        customerId: analytics.customer,
        environmentalImpact: analytics.waste.environmental
      });
    }

    res.json({
      success: true,
      message: `Environmental impact updated for ${results.length} customers`,
      data: { results }
    });

  } catch (error) {
    console.error('Update environmental impact error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating environmental impact',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/analytics/insights
// @desc    Get AI-powered insights for customer (Customer)
// @access  Private (Customer)
router.get('/insights', [auth, authorize('customer')], async (req, res) => {
  try {
    const analytics = await CustomerAnalytics.getOrCreate(req.user._id);
    
    // Generate personalized insights
    const insights = {
      performance: {
        score: Math.round((analytics.collections.completionRate + analytics.waste.recycling.recyclingRate) / 2),
        trend: 'improving', // This would be calculated based on historical data
        strengths: [],
        improvements: []
      },
      
      environmental: {
        impact: analytics.waste.environmental,
        comparison: {
          vsAverage: 'above', // Compared to other customers
          improvement: '+15%' // Year over year
        }
      },
      
      recommendations: [],
      
      achievements: analytics.engagement.achievements,
      
      goals: {
        suggested: [
          { type: 'recycling', target: Math.min(analytics.waste.recycling.recyclingRate + 10, 100) },
          { type: 'frequency', target: Math.max(analytics.behavior.averageFrequency - 1, 7) }
        ],
        current: [
          { type: 'wasteReduction', progress: analytics.wasteReductionProgress },
          { type: 'recycling', progress: analytics.recyclingProgress }
        ]
      }
    };

    // Generate dynamic recommendations based on data
    if (analytics.waste.recycling.recyclingRate < 50) {
      insights.recommendations.push({
        type: 'recycling',
        title: 'Increase Recycling',
        description: 'You could improve your recycling rate by separating more materials',
        impact: 'High environmental impact'
      });
    }

    if (analytics.behavior.consistencyScore < 70) {
      insights.recommendations.push({
        type: 'scheduling',
        title: 'Regular Scheduling',
        description: 'Schedule regular pickups to improve consistency',
        impact: 'Better service efficiency'
      });
    }

    if (analytics.collections.completionRate > 90) {
      insights.performance.strengths.push('Excellent pickup completion rate');
    }

    if (analytics.waste.recycling.recyclingRate > 70) {
      insights.performance.strengths.push('Outstanding recycling performance');
    }

    res.json({
      success: true,
      data: { insights }
    });

  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching insights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
