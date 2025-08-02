import apiService from './apiService';
import userService from './userService';

class AnalyticsService {
  // Get dashboard analytics
  async getDashboardAnalytics() {
    try {
      console.log('🔍 Starting to fetch dashboard analytics...');
      
      const [usersResponse, todaysRoutes] = await Promise.all([
        userService.getUsers({ limit: 100 }),
        this.getTodaysCollectionStats()
      ]);

      console.log('📊 Users response:', usersResponse);

      // Handle the response structure properly
      let users = [];
      if (usersResponse && usersResponse.success && usersResponse.data && usersResponse.data.users) {
        users = usersResponse.data.users;
        console.log(`✅ Found ${users.length} users`);
      } else if (usersResponse && usersResponse.data && Array.isArray(usersResponse.data)) {
        users = usersResponse.data;
        console.log(`✅ Found ${users.length} users (array format)`);
      } else if (usersResponse && Array.isArray(usersResponse)) {
        users = usersResponse;
        console.log(`✅ Found ${users.length} users (direct array)`);
      } else {
        console.warn('⚠️ Unexpected users response structure:', usersResponse);
        users = [];
      }

      const analytics = {
        users: this.analyzeUsers(users),
        collections: todaysRoutes,
        system: await this.getSystemStats(),
        trends: await this.getTrends()
      };

      console.log('✅ Dashboard analytics compiled successfully');
      return analytics;
    } catch (error) {
      console.error('❌ Error fetching dashboard analytics:', error);
      // Return a safe fallback structure
      return {
        users: this.analyzeUsers([]),
        collections: await this.getTodaysCollectionStats(),
        system: await this.getSystemStats(),
        trends: await this.getTrends()
      };
    }
  }

  // Analyze user statistics
  analyzeUsers(users) {
    // Ensure users is an array
    if (!Array.isArray(users)) {
      console.warn('analyzeUsers received non-array:', users);
      users = [];
    }

    const userStats = {
      total: users.length,
      byRole: {
        admin: 0,
        driver: 0,
        customer: 0
      },
      byStatus: {
        active: 0,
        inactive: 0,
        locked: 0
      },
      recentJoins: 0 // Last 7 days
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    users.forEach(user => {
      // Ensure user object exists and has required properties
      if (!user) return;

      // Count by role (with fallback)
      const role = user.role || 'customer';
      if (userStats.byRole.hasOwnProperty(role)) {
        userStats.byRole[role]++;
      }
      
      // Count by status
      if (user.isLocked) {
        userStats.byStatus.locked++;
      } else if (user.status === 'active') {
        userStats.byStatus.active++;
      } else {
        userStats.byStatus.inactive++;
      }

      // Count recent joins
      const joinDate = user.joinDate || user.createdAt;
      if (joinDate && new Date(joinDate) > oneWeekAgo) {
        userStats.recentJoins++;
      }
    });

    return userStats;
  }

  // Get today's collection statistics (mock data for now)
  async getTodaysCollectionStats() {
    // This would typically come from route/collection APIs
    // For now, returning mock data based on the system we're building
    return {
      scheduled: 12,
      inProgress: 3,
      completed: 8,
      pending: 1,
      totalWasteCollected: 850, // kg
      routesOptimized: 5,
      averageCollectionTime: 45, // minutes
      co2Saved: 23.5, // kg
      efficiency: 87 // percentage
    };
  }

  // Get system statistics
  async getSystemStats() {
    try {
      // Mock system statistics - in a real app, these would come from various APIs
      return {
        serverUptime: this.calculateUptime(),
        activeConnections: Math.floor(Math.random() * 50) + 10,
        apiRequests: {
          today: 1247,
          thisWeek: 8956,
          thisMonth: 34521
        },
        database: {
          status: 'healthy',
          responseTime: Math.floor(Math.random() * 50) + 15, // ms
          connections: Math.floor(Math.random() * 10) + 5
        },
        storage: {
          used: 2.3, // GB
          total: 10, // GB
          percentage: 23
        }
      };
    } catch (error) {
      console.error('Error fetching system stats:', error);
      return null;
    }
  }

  // Get trends data
  async getTrends() {
    // Mock trends data - would come from analytics APIs
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return {
      weeklyCollections: {
        labels: days,
        data: [45, 52, 48, 61, 55, 67, 43],
        trend: 'up',
        percentage: 12.5
      },
      userGrowth: {
        labels: days,
        data: [120, 125, 128, 132, 138, 142, 145],
        trend: 'up',
        percentage: 8.3
      },
      wasteReduction: {
        labels: days,
        data: [78, 82, 85, 88, 91, 94, 97],
        trend: 'up',
        percentage: 15.2
      },
      routeEfficiency: {
        labels: days,
        data: [82, 84, 87, 85, 89, 91, 88],
        trend: 'up',
        percentage: 7.3
      }
    };
  }

  // Calculate server uptime (mock)
  calculateUptime() {
    const uptimeMs = Date.now() - (new Date().setHours(0, 0, 0, 0)); // Since midnight
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  // Get route analytics
  async getRouteAnalytics() {
    try {
      // Mock route analytics - would come from route APIs
      return {
        totalRoutes: 25,
        activeRoutes: 18,
        optimizedRoutes: 15,
        averageEfficiency: 89.5,
        fuelSavings: {
          thisWeek: 125.5, // liters
          thisMonth: 542.3,
          co2Reduction: 287.6 // kg
        },
        performance: {
          onTimeDelivery: 94.2, // percentage
          customerSatisfaction: 4.7, // out of 5
          driverUtilization: 87.3 // percentage
        }
      };
    } catch (error) {
      console.error('Error fetching route analytics:', error);
      throw error;
    }
  }

  // Get environmental impact metrics
  async getEnvironmentalImpact() {
    try {
      return {
        wasteCollected: {
          today: 850, // kg
          thisWeek: 5640,
          thisMonth: 24350
        },
        recycled: {
          percentage: 68.5,
          totalKg: 16680, // this month
          breakdown: {
            plastic: 35,
            paper: 25,
            metal: 15,
            glass: 20,
            organic: 5
          }
        },
        carbonFootprint: {
          reduced: 287.6, // kg CO2 this month
          fuelSaved: 542.3, // liters
          treesEquivalent: 13 // trees saved equivalent
        },
        sustainability: {
          score: 87.5, // out of 100
          trend: 'improving',
          goals: {
            wasteReduction: { target: 90, current: 87.5 },
            recyclingRate: { target: 75, current: 68.5 },
            fuelEfficiency: { target: 95, current: 89.2 }
          }
        }
      };
    } catch (error) {
      console.error('Error fetching environmental impact:', error);
      throw error;
    }
  }

  // Utility methods for formatting data
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatPercentage(value, total) {
    return ((value / total) * 100).toFixed(1);
  }

  getStatusIcon(status) {
    const icons = {
      active: '🟢',
      inactive: '🔴',
      in_progress: '🟡',
      completed: '✅',
      pending: '⏳',
      scheduled: '📅'
    };
    return icons[status] || '❓';
  }

  getTrendIcon(trend) {
    return trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';
  }

  // Generate report data for exports
  async generateReport(type = 'daily', dateRange = null) {
    try {
      const reportData = {
        type,
        dateRange: dateRange || this.getDefaultDateRange(type),
        generatedAt: new Date().toISOString(),
        data: {}
      };

      switch (type) {
        case 'daily':
          reportData.data = await this.getDailyReport();
          break;
        case 'weekly':
          reportData.data = await this.getWeeklyReport();
          break;
        case 'monthly':
          reportData.data = await this.getMonthlyReport();
          break;
        default:
          throw new Error('Invalid report type');
      }

      return reportData;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  getDefaultDateRange(type) {
    const now = new Date();
    const ranges = {
      daily: {
        start: new Date(now.setHours(0, 0, 0, 0)),
        end: new Date(now.setHours(23, 59, 59, 999))
      },
      weekly: {
        start: new Date(now.setDate(now.getDate() - now.getDay())),
        end: new Date(now.setDate(now.getDate() - now.getDay() + 6))
      },
      monthly: {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
    };
    return ranges[type];
  }

  async getDailyReport() {
    return {
      collections: await this.getTodaysCollectionStats(),
      users: { activeToday: 45, newSignups: 3 },
      system: { uptime: '24h 0m', errors: 0 }
    };
  }

  async getWeeklyReport() {
    return {
      collections: { total: 392, efficiency: 89.5 },
      users: { growth: 8.3, active: 287 },
      environmental: await this.getEnvironmentalImpact()
    };
  }

  async getMonthlyReport() {
    return {
      summary: 'Monthly performance report',
      collections: { total: 1680, growth: 15.2 },
      financial: { savings: 45000, revenue: 180000 },
      environmental: await this.getEnvironmentalImpact(),
      performance: await this.getRouteAnalytics()
    };
  }
}

export default new AnalyticsService();
