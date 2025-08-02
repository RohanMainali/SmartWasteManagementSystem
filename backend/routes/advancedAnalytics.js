const express = require('express');
const router = express.Router();
const CollectionRequest = require('../models/CollectionRequest');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const CustomerAnalytics = require('../models/CustomerAnalytics');
const IssueReport = require('../models/IssueReport');
const { auth, authorize } = require('../middleware/auth');

// Advanced Analytics Engine
class AdvancedAnalytics {
  constructor() {
    this.wasteTypeMapping = {
      'organic': { category: 'Biodegradable', carbonReduction: 0.3, recyclable: false },
      'paper': { category: 'Recyclable', carbonReduction: 0.8, recyclable: true },
      'plastic': { category: 'Recyclable', carbonReduction: 0.6, recyclable: true },
      'glass': { category: 'Recyclable', carbonReduction: 0.5, recyclable: true },
      'metal': { category: 'Recyclable', carbonReduction: 0.9, recyclable: true },
      'electronic': { category: 'Special', carbonReduction: 0.4, recyclable: true },
      'hazardous': { category: 'Special', carbonReduction: 0.2, recyclable: false }
    };
  }

  calculateCarbonFootprint(wasteData) {
    return wasteData.reduce((total, waste) => {
      const mapping = this.wasteTypeMapping[waste.category] || { carbonReduction: 0.1 };
      return total + ((waste.estimatedWeight || waste.weight || 0) * mapping.carbonReduction);
    }, 0);
  }

  generateTrends(data, periods = 6) {
    if (data.length < 2) return { trend: 'stable', percentage: 0 };
    
    const recent = data.slice(-Math.min(periods, data.length));
    const older = data.slice(0, Math.min(periods, data.length));
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    if (olderAvg === 0) return { trend: 'stable', percentage: 0 };
    
    const percentage = ((recentAvg - olderAvg) / olderAvg) * 100;
    const trend = percentage > 5 ? 'increasing' : percentage < -5 ? 'decreasing' : 'stable';
    
    return { trend, percentage: Math.round(percentage * 100) / 100 };
  }

  calculateRecyclingRate(wasteData) {
    const totalWeight = wasteData.reduce((sum, waste) => sum + (waste.weight || 0), 0);
    const recyclableWeight = wasteData.filter(waste => 
      this.wasteTypeMapping[waste.category]?.recyclable
    ).reduce((sum, waste) => sum + (waste.weight || 0), 0);
    
    return totalWeight > 0 ? (recyclableWeight / totalWeight) * 100 : 0;
  }

  calculateEfficiencyScore(metrics) {
    const { routes, collections, fuel, capacity } = metrics;
    let score = 100;
    
    // Route efficiency (30%)
    const avgDistancePerCollection = routes.totalDistance / collections.total || 0;
    if (avgDistancePerCollection > 5) score -= 15;
    else if (avgDistancePerCollection < 2) score += 5;
    
    // Time efficiency (25%)
    const avgTimePerCollection = routes.totalTime / collections.total || 0;
    if (avgTimePerCollection > 30) score -= 10;
    else if (avgTimePerCollection < 15) score += 5;
    
    // Fuel efficiency (25%)
    const fuelEfficiency = routes.totalDistance / fuel.totalUsed || 0;
    if (fuelEfficiency < 8) score -= 15;
    else if (fuelEfficiency > 12) score += 10;
    
    // Capacity utilization (20%)
    const capacityUtilization = collections.totalWeight / capacity.total || 0;
    if (capacityUtilization < 0.6) score -= 10;
    else if (capacityUtilization > 0.85) score += 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

// @route   GET /api/advanced-analytics/operational-dashboard
// @desc    Get comprehensive operational analytics
// @access  Admin
router.get('/operational-dashboard', auth, authorize(['admin']), async (req, res) => {
  try {
    const { period = '30', startDate, endDate } = req.query;
    
    // Calculate date range
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getTime() - (parseInt(period) * 24 * 60 * 60 * 1000));
    const end = endDate ? new Date(endDate) : now;

    const analytics = new AdvancedAnalytics();

    // Collection Performance
    const collections = await CollectionRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          totalWeight: { $sum: '$actualWeight' },
          avgResponseTime: { $avg: { $subtract: ['$scheduledDate', '$createdAt'] } }
        }
      }
    ]);

    // Vehicle Performance
    const vehicles = await Vehicle.aggregate([
      {
        $lookup: {
          from: 'collectionrequests',
          localField: '_id',
          foreignField: 'assignedVehicle',
          as: 'collections'
        }
      },
      {
        $project: {
          licensePlate: 1,
          model: 1,
          type: 1,
          status: 1,
          capacity: 1,
          totalCollections: { $size: '$collections' },
          efficiency: {
            $cond: [
              { $gt: [{ $size: '$collections' }, 0] },
              {
                $divide: [
                  { $size: { $filter: { input: '$collections', cond: { $eq: ['$$this.status', 'completed'] } } } },
                  { $size: '$collections' }
                ]
              },
              0
            ]
          }
        }
      }
    ]);

    // Driver Performance
    const drivers = await User.aggregate([
      {
        $match: { role: 'driver' }
      },
      {
        $lookup: {
          from: 'collectionrequests',
          localField: '_id',
          foreignField: 'assignedDriver',
          as: 'collections'
        }
      },
      {
        $project: {
          name: 1,
          totalCollections: { $size: '$collections' },
          completedCollections: {
            $size: { $filter: { input: '$collections', cond: { $eq: ['$$this.status', 'completed'] } } }
          },
          completionRate: {
            $cond: [
              { $gt: [{ $size: '$collections' }, 0] },
              {
                $multiply: [
                  { $divide: [
                    { $size: { $filter: { input: '$collections', cond: { $eq: ['$$this.status', 'completed'] } } } },
                    { $size: '$collections' }
                  ] },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      { $sort: { completionRate: -1 } }
    ]);

    // Waste Category Analysis
    const wasteAnalysis = await CollectionRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: 'completed'
        }
      },
      { $unwind: '$wasteTypes' },
      {
        $group: {
          _id: '$wasteTypes.category',
          totalWeight: { $sum: '$wasteTypes.actualWeight' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalWeight: -1 } }
    ]);

    // Calculate environmental impact
    const totalCarbonReduction = analytics.calculateCarbonFootprint(
      wasteAnalysis.map(w => ({ category: w._id, weight: w.totalWeight }))
    );

    // Regional Performance
    const regionalStats = await CollectionRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$address.city',
          collections: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalWeight: { $sum: '$actualWeight' }
        }
      },
      {
        $project: {
          city: '$_id',
          collections: 1,
          completed: 1,
          totalWeight: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completed', '$collections'] },
              100
            ]
          }
        }
      },
      { $sort: { collections: -1 } }
    ]);

    // Customer Engagement Metrics
    const customerMetrics = await User.aggregate([
      {
        $match: { role: 'customer' }
      },
      {
        $lookup: {
          from: 'collectionrequests',
          localField: '_id',
          foreignField: 'customer',
          as: 'collections'
        }
      },
      {
        $project: {
          totalCustomers: 1,
          activeCustomers: {
            $cond: [
              { $gt: [{ $size: '$collections' }, 0] },
              1,
              0
            ]
          },
          avgCollectionsPerCustomer: { $size: '$collections' }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          activeCustomers: { $sum: '$activeCustomers' },
          avgCollectionsPerCustomer: { $avg: '$avgCollectionsPerCustomer' }
        }
      }
    ]);

    const collectionData = collections[0] || {};
    const customerData = customerMetrics[0] || {};

    res.status(200).json({
      success: true,
      message: 'Operational dashboard data retrieved successfully',
      data: {
        summary: {
          dateRange: { start, end },
          collections: {
            total: collectionData.total || 0,
            completed: collectionData.completed || 0,
            pending: collectionData.pending || 0,
            cancelled: collectionData.cancelled || 0,
            completionRate: collectionData.total > 0 ? 
              Math.round((collectionData.completed / collectionData.total) * 100) : 0,
            avgResponseTime: Math.round((collectionData.avgResponseTime || 0) / (1000 * 60 * 60)) // hours
          },
          waste: {
            totalWeight: Math.round((collectionData.totalWeight || 0) * 100) / 100,
            carbonReduction: Math.round(totalCarbonReduction * 100) / 100,
            recyclingRate: Math.round(analytics.calculateRecyclingRate(
              wasteAnalysis.map(w => ({ category: w._id, weight: w.totalWeight }))
            ) * 100) / 100
          },
          customers: {
            total: customerData.totalCustomers || 0,
            active: customerData.activeCustomers || 0,
            engagementRate: customerData.totalCustomers > 0 ?
              Math.round((customerData.activeCustomers / customerData.totalCustomers) * 100) : 0,
            avgCollections: Math.round((customerData.avgCollectionsPerCustomer || 0) * 100) / 100
          }
        },
        vehicles: vehicles.map(v => ({
          id: v._id,
          licensePlate: v.licensePlate,
          model: v.model,
          type: v.type,
          status: v.status,
          collections: v.totalCollections,
          efficiency: Math.round(v.efficiency * 100),
          capacityUtilization: v.capacity?.weight ? 
            Math.round((v.totalCollections * 50 / v.capacity.weight) * 100) : 0 // Rough estimate
        })),
        drivers: drivers.slice(0, 10), // Top 10 drivers
        wasteCategories: wasteAnalysis.map(w => ({
          category: w._id,
          weight: Math.round(w.totalWeight * 100) / 100,
          count: w.count,
          carbonReduction: Math.round(analytics.calculateCarbonFootprint([{
            category: w._id,
            weight: w.totalWeight
          }]) * 100) / 100
        })),
        regionalPerformance: regionalStats.slice(0, 10), // Top 10 regions
        trends: {
          collections: analytics.generateTrends(
            collections.map(c => c.total || 0)
          ),
          waste: analytics.generateTrends(
            wasteAnalysis.map(w => w.totalWeight || 0)
          ),
          efficiency: analytics.generateTrends(
            vehicles.map(v => v.efficiency * 100 || 0)
          )
        }
      }
    });

  } catch (error) {
    console.error('Operational dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve operational dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/advanced-analytics/predictive-insights
// @desc    Get predictive analytics and AI insights
// @access  Admin
router.get('/predictive-insights', auth, authorize(['admin']), async (req, res) => {
  try {
    // Collect historical data for predictions
    const historicalData = await CollectionRequest.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          dailyCollections: { $sum: 1 },
          dailyWeight: { $sum: '$actualWeight' },
          dailyRevenue: { $sum: '$cost' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Simple moving average prediction (in production, use ML models)
    const predictNextWeek = (data, key) => {
      if (data.length < 7) return 0;
      const lastWeek = data.slice(-7);
      return lastWeek.reduce((sum, day) => sum + day[key], 0) / 7;
    };

    const predictions = {
      nextWeek: {
        collections: Math.round(predictNextWeek(historicalData, 'dailyCollections')),
        weight: Math.round(predictNextWeek(historicalData, 'dailyWeight') * 100) / 100,
        revenue: Math.round(predictNextWeek(historicalData, 'dailyRevenue') * 100) / 100
      }
    };

    // Capacity utilization prediction
    const vehicleCapacity = await Vehicle.aggregate([
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$capacity.weight' },
          totalVehicles: { $sum: 1 }
        }
      }
    ]);

    const capacityData = vehicleCapacity[0] || {};
    const predictedLoad = predictions.nextWeek.weight;
    const capacityUtilization = capacityData.totalCapacity > 0 ? 
      (predictedLoad / capacityData.totalCapacity) * 100 : 0;

    // Demand hotspots analysis
    const hotspots = await CollectionRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 2] },
            lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 2] }
          },
          requestCount: { $sum: 1 },
          avgWeight: { $avg: '$actualWeight' }
        }
      },
      { $sort: { requestCount: -1 } },
      { $limit: 10 }
    ]);

    // Peak time analysis
    const peakTimes = await CollectionRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          requestCount: { $sum: 1 }
        }
      },
      { $sort: { requestCount: -1 } }
    ]);

    // Resource optimization recommendations
    const recommendations = [];
    
    if (capacityUtilization > 90) {
      recommendations.push({
        type: 'capacity',
        priority: 'high',
        message: 'Vehicle capacity will be exceeded. Consider adding more vehicles or optimizing routes.',
        impact: 'operational'
      });
    }
    
    if (predictions.nextWeek.collections > historicalData.slice(-7).reduce((sum, day) => 
      sum + day.dailyCollections, 0) / 7 * 1.2) {
      recommendations.push({
        type: 'demand',
        priority: 'medium',
        message: 'Demand spike predicted. Prepare additional resources.',
        impact: 'resource_planning'
      });
    }

    // Seasonal patterns (simplified)
    const currentMonth = new Date().getMonth();
    const seasonalFactors = [0.8, 0.85, 0.9, 1.0, 1.1, 1.2, 1.3, 1.25, 1.1, 1.0, 0.9, 0.85];
    const seasonalAdjustment = seasonalFactors[currentMonth];

    res.status(200).json({
      success: true,
      message: 'Predictive insights retrieved successfully',
      data: {
        predictions: {
          nextWeek: {
            ...predictions.nextWeek,
            seasonallyAdjusted: {
              collections: Math.round(predictions.nextWeek.collections * seasonalAdjustment),
              weight: Math.round(predictions.nextWeek.weight * seasonalAdjustment * 100) / 100,
              revenue: Math.round(predictions.nextWeek.revenue * seasonalAdjustment * 100) / 100
            }
          },
          capacityUtilization: Math.round(capacityUtilization * 100) / 100,
          peakDemandHour: peakTimes[0]?._id || 10,
          seasonalFactor: seasonalAdjustment
        },
        insights: {
          demandHotspots: hotspots.map(h => ({
            coordinates: [h._id.lng, h._id.lat],
            requestCount: h.requestCount,
            avgWeight: Math.round(h.avgWeight * 100) / 100
          })),
          peakHours: peakTimes.slice(0, 5),
          recommendations,
          trends: {
            weekOverWeek: historicalData.length >= 14 ? {
              collections: Math.round(((historicalData.slice(-7).reduce((sum, day) => 
                sum + day.dailyCollections, 0) / 7) / (historicalData.slice(-14, -7).reduce((sum, day) => 
                sum + day.dailyCollections, 0) / 7) - 1) * 100 * 100) / 100,
              weight: Math.round(((historicalData.slice(-7).reduce((sum, day) => 
                sum + day.dailyWeight, 0) / 7) / (historicalData.slice(-14, -7).reduce((sum, day) => 
                sum + day.dailyWeight, 0) / 7) - 1) * 100 * 100) / 100
            } : { collections: 0, weight: 0 }
          }
        },
        modelMetrics: {
          accuracy: 85, // Placeholder - would come from actual ML model
          confidence: 78,
          lastUpdated: new Date(),
          dataPoints: historicalData.length
        }
      }
    });

  } catch (error) {
    console.error('Predictive insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve predictive insights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/advanced-analytics/environmental-impact
// @desc    Get detailed environmental impact analytics
// @access  Admin, Customer
router.get('/environmental-impact', auth, async (req, res) => {
  try {
    const { userId, period = '365' } = req.query;
    const isCustomer = req.user.role === 'customer';
    const targetUserId = isCustomer ? req.user.userId : userId;

    if (isCustomer && userId && userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Customers can only view their own environmental impact'
      });
    }

    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
    const analytics = new AdvancedAnalytics();

    // Build match criteria
    const matchCriteria = {
      status: 'completed',
      createdAt: { $gte: startDate }
    };

    if (targetUserId) {
      matchCriteria.customer = targetUserId;
    }

    // Waste impact analysis
    const wasteImpact = await CollectionRequest.aggregate([
      { $match: matchCriteria },
      { $unwind: '$wasteTypes' },
      {
        $group: {
          _id: '$wasteTypes.category',
          totalWeight: { $sum: '$wasteTypes.actualWeight' },
          collections: { $sum: 1 }
        }
      }
    ]);

    // Calculate environmental metrics
    const totalCarbonReduction = analytics.calculateCarbonFootprint(
      wasteImpact.map(w => ({ category: w._id, weight: w.totalWeight }))
    );

    const totalWeight = wasteImpact.reduce((sum, w) => sum + w.totalWeight, 0);
    const recyclingRate = analytics.calculateRecyclingRate(
      wasteImpact.map(w => ({ category: w._id, weight: w.totalWeight }))
    );

    // Calculate equivalent impact metrics
    const treesEquivalent = Math.round(totalCarbonReduction / 0.021); // 1 tree absorbs ~21kg CO2/year
    const carMilesEquivalent = Math.round(totalCarbonReduction / 0.404); // 404g CO2 per mile
    const energyEquivalent = Math.round(totalCarbonReduction * 2.2); // kWh equivalent

    // Monthly breakdown
    const monthlyBreakdown = await CollectionRequest.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          weight: { $sum: '$actualWeight' },
          collections: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthlyData = monthlyBreakdown.map(m => ({
      year: m._id.year,
      month: m._id.month,
      weight: m.weight,
      collections: m.collections,
      carbonReduction: analytics.calculateCarbonFootprint([{ category: 'mixed', weight: m.weight }])
    }));

    // Environmental achievements
    const achievements = [];
    if (totalWeight > 100) achievements.push('Waste Warrior - Recycled over 100kg');
    if (recyclingRate > 70) achievements.push('Eco Champion - 70%+ recycling rate');
    if (totalCarbonReduction > 50) achievements.push('Carbon Saver - Reduced 50kg+ CO2');
    if (monthlyData.length >= 6) achievements.push('Consistent Contributor - 6+ months active');

    res.status(200).json({
      success: true,
      message: 'Environmental impact data retrieved successfully',
      data: {
        period: `${period} days`,
        userId: targetUserId,
        summary: {
          totalWeight: Math.round(totalWeight * 100) / 100,
          totalCollections: wasteImpact.reduce((sum, w) => sum + w.collections, 0),
          carbonReduction: Math.round(totalCarbonReduction * 100) / 100,
          recyclingRate: Math.round(recyclingRate * 100) / 100
        },
        impact: {
          carbon: {
            totalReduction: Math.round(totalCarbonReduction * 100) / 100,
            unit: 'kg CO2',
            equivalents: {
              trees: treesEquivalent,
              carMiles: carMilesEquivalent,
              energy: energyEquivalent
            }
          },
          waste: {
            totalDiverted: Math.round(totalWeight * 100) / 100,
            recycled: Math.round((totalWeight * recyclingRate / 100) * 100) / 100,
            landfillAvoided: Math.round(totalWeight * 0.85 * 100) / 100 // 85% would go to landfill
          }
        },
        breakdown: {
          byCategory: wasteImpact.map(w => ({
            category: w._id,
            weight: Math.round(w.totalWeight * 100) / 100,
            collections: w.collections,
            carbonReduction: Math.round(analytics.calculateCarbonFootprint([{
              category: w._id,
              weight: w.totalWeight
            }]) * 100) / 100,
            recyclable: analytics.wasteTypeMapping[w._id]?.recyclable || false
          })),
          monthly: monthlyData
        },
        achievements,
        projections: {
          annual: monthlyData.length > 0 ? {
            weight: Math.round((totalWeight / parseInt(period)) * 365 * 100) / 100,
            carbonReduction: Math.round((totalCarbonReduction / parseInt(period)) * 365 * 100) / 100,
            treesEquivalent: Math.round((treesEquivalent / parseInt(period)) * 365)
          } : null
        },
        comparisons: isCustomer ? null : {
          averageCustomer: {
            weight: 45.5, // kg per year
            carbonReduction: 15.2,
            collections: 24
          },
          topPercentile: {
            weight: 120.0,
            carbonReduction: 40.0,
            collections: 52
          }
        }
      }
    });

  } catch (error) {
    console.error('Environmental impact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve environmental impact data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
