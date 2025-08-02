import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import analyticsService from '../services/analyticsService';
import userService from '../services/userService';
import { COLORS, SIZES } from '../utils/theme';

const { width } = Dimensions.get('window');

const AdminDashboard = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📱 Loading admin dashboard data...');
      const data = await analyticsService.getDashboardAnalytics();
      console.log('📊 Dashboard data loaded:', data);
      setAnalytics(data);
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please check your connection and try again.');
      // Set a fallback analytics object to prevent crashes
      setAnalytics({
        users: { total: 0, byRole: { admin: 0, driver: 0, customer: 0 }, byStatus: { active: 0, inactive: 0, locked: 0 }, recentJoins: 0 },
        collections: { scheduled: 0, inProgress: 0, completed: 0, pending: 0, totalWasteCollected: 0, efficiency: 0, co2Saved: 0 },
        system: { serverUptime: '0h 0m' },
        trends: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' }
      ]
    );
  };

  const MetricCard = ({ title, value, subtitle, color = COLORS.primary, onPress }) => (
    <TouchableOpacity 
      style={[styles.metricCard, { borderLeftColor: color }]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  const QuickActionButton = ({ title, icon, onPress, color = COLORS.primary }) => (
    <TouchableOpacity style={[styles.actionButton, { backgroundColor: color }]} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading && !analytics) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.adminName}>{user?.name || 'Admin'}</Text>
            <Text style={styles.roleText}>System Administrator</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* System Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🟢 System Status</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Backend: Online • Database: Connected • Uptime: {analytics?.system?.serverUptime || '0h 0m'}
            </Text>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Today's Overview</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Users"
              value={analytics?.users?.total || 0}
              subtitle={`+${analytics?.users?.recentJoins || 0} this week`}
              color={COLORS.success}
              onPress={() => navigation.navigate('UserManagement')}
            />
            <MetricCard
              title="Active Routes"
              value={analytics?.collections?.inProgress || 0}
              subtitle={`${analytics?.collections?.completed || 0} completed today`}
              color={COLORS.warning}
              onPress={() => navigation.navigate('RouteManagement')}
            />
            <MetricCard
              title="Waste Collected"
              value={`${analytics?.collections?.totalWasteCollected || 0} kg`}
              subtitle={`${analytics?.collections?.efficiency || 0}% efficiency`}
              color={COLORS.primary}
            />
            <MetricCard
              title="CO₂ Saved"
              value={`${analytics?.collections?.co2Saved || 0} kg`}
              subtitle="Environmental impact"
              color={COLORS.success}
            />
          </View>
        </View>

        {/* User Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 User Distribution</Text>
          <View style={styles.userBreakdown}>
            <View style={styles.userStat}>
              <Text style={styles.userStatNumber}>{analytics?.users?.byRole?.admin || 0}</Text>
              <Text style={styles.userStatLabel}>Admins</Text>
            </View>
            <View style={styles.userStat}>
              <Text style={styles.userStatNumber}>{analytics?.users?.byRole?.driver || 0}</Text>
              <Text style={styles.userStatLabel}>Drivers</Text>
            </View>
            <View style={styles.userStat}>
              <Text style={styles.userStatNumber}>{analytics?.users?.byRole?.customer || 0}</Text>
              <Text style={styles.userStatLabel}>Customers</Text>
            </View>
            <View style={styles.userStat}>
              <Text style={styles.userStatNumber}>{analytics?.users?.byStatus?.active || 0}</Text>
              <Text style={styles.userStatLabel}>Active</Text>
            </View>
          </View>
        </View>

        {/* Collection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚛 Collection Status</Text>
          <View style={styles.collectionStats}>
            <View style={styles.collectionStat}>
              <Text style={styles.collectionNumber}>{analytics?.collections?.scheduled || 0}</Text>
              <Text style={styles.collectionLabel}>Scheduled</Text>
            </View>
            <View style={styles.collectionStat}>
              <Text style={[styles.collectionNumber, { color: COLORS.warning }]}>
                {analytics?.collections?.inProgress || 0}
              </Text>
              <Text style={styles.collectionLabel}>In Progress</Text>
            </View>
            <View style={styles.collectionStat}>
              <Text style={[styles.collectionNumber, { color: COLORS.success }]}>
                {analytics?.collections?.completed || 0}
              </Text>
              <Text style={styles.collectionLabel}>Completed</Text>
            </View>
            <View style={styles.collectionStat}>
              <Text style={[styles.collectionNumber, { color: COLORS.error }]}>
                {analytics?.collections?.pending || 0}
              </Text>
              <Text style={styles.collectionLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <QuickActionButton
              title="User Management"
              icon="👥"
              onPress={() => navigation.navigate('UserManagement')}
              color={COLORS.success}
            />
            <QuickActionButton
              title="Driver Management"
              icon="🚛"
              onPress={() => navigation.navigate('DriverManagement')}
              color={COLORS.primary}
            />
            <QuickActionButton
              title="Analytics"
              icon="📈"
              onPress={() => navigation.navigate('AnalyticsScreen')}
              color={COLORS.warning}
            />
            <QuickActionButton
              title="Settings"
              icon="⚙️"
              onPress={() => navigation.navigate('SettingsScreen')}
              color="#9C27B0"
            />
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Performance</Text>
          <View style={styles.performanceContainer}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Route Efficiency</Text>
              <Text style={styles.performanceValue}>{analytics?.collections?.efficiency || 0}%</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Avg Collection Time</Text>
              <Text style={styles.performanceValue}>{analytics?.collections?.averageCollectionTime || 0} min</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Routes Optimized</Text>
              <Text style={styles.performanceValue}>{analytics?.collections?.routesOptimized || 0}</Text>
            </View>
          </View>
        </View>

        {/* API Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔌 API Activity</Text>
          <View style={styles.apiStats}>
            <Text style={styles.apiStatText}>
              Requests Today: {analytics?.system?.apiRequests?.today || 0}
            </Text>
            <Text style={styles.apiStatText}>
              Active Connections: {analytics?.system?.activeConnections || 0}
            </Text>
            <Text style={styles.apiStatText}>
              DB Response Time: {analytics?.system?.database?.responseTime || 0}ms
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SafaCycle Admin Dashboard</Text>
          <Text style={styles.footerSubtext}>Smart Waste Management System</Text>
          <Text style={styles.footerSubtext}>Last updated: {new Date().toLocaleTimeString()}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  loadingText: {
    fontSize: SIZES.large,
    color: COLORS.gray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: COLORS.white,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  adminName: {
    fontSize: SIZES.xLarge,
    fontWeight: 'bold',
    color: COLORS.black,
    marginVertical: 4,
  },
  roleText: {
    fontSize: SIZES.small,
    color: COLORS.success,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 16,
  },
  statusContainer: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 6,
  },
  statusText: {
    color: '#2E7D32',
    fontSize: SIZES.small,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 60) / 2,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  metricTitle: {
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: SIZES.xLarge,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: COLORS.darkGray,
  },
  userBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userStat: {
    alignItems: 'center',
  },
  userStatNumber: {
    fontSize: SIZES.xLarge,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  userStatLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  collectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  collectionStat: {
    alignItems: 'center',
  },
  collectionNumber: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  collectionLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTitle: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: SIZES.small,
  },
  performanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
  },
  performanceValue: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: 4,
  },
  apiStats: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
  },
  apiStatText: {
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginBottom: 4,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 10,
  },
  footerText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 2,
  },
});

export default AdminDashboard;
