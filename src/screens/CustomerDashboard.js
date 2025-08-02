import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { COLORS, SIZES } from "../utils/theme";
import CustomButton from "../components/CustomButton";
import { formatDate, formatTime } from "../utils/helpers";
import apiService from "../services/apiService";

export default function CustomerDashboard({ navigation }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [upcomingPickups, setUpcomingPickups] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to format pickup time
  const formatPickupTime = (timeValue) => {
    if (!timeValue) return '8:45 AM';
    
    // If it's already formatted (like "8:45 AM"), return as is
    if (typeof timeValue === 'string' && timeValue.includes(':')) {
      return timeValue;
    }
    
    // Map common time slots to readable format
    const timeSlots = {
      'morning': '8:45 AM',
      'afternoon': '2:30 PM', 
      'evening': '6:15 PM'
    };
    
    return timeSlots[timeValue] || timeValue || '8:45 AM';
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // Load dashboard analytics
      const dashboardResponse = await apiService.getCustomerDashboard();
      if (dashboardResponse.success) {
        setDashboardData(dashboardResponse.data.dashboard);
      }

      // Load upcoming collections
      const collectionsResponse = await apiService.getUpcomingCollections();
      if (collectionsResponse.success && collectionsResponse.data.collections.length > 0) {
        // Process real data to ensure proper formatting
        const processedCollections = collectionsResponse.data.collections.map(collection => ({
          ...collection,
          date: collection.date instanceof Date ? collection.date : new Date(collection.date),
          time: formatPickupTime(collection.time || collection.requestedTime),
          type: collection.type || 
                (collection.wasteTypes && collection.wasteTypes.length > 0 
                  ? collection.wasteTypes[0].description || collection.wasteTypes[0].category
                  : 'General Waste')
        }));
        setUpcomingPickups(processedCollections);
      } else {
        // Set dummy data if no real collections found
        setUpcomingPickups([{
          id: 'dummy-1',
          requestId: 'REQ-001',
          date: 'January 8, 2025',
          time: '8:45 AM',
          type: 'General Waste',
          status: 'confirmed',
          wasteTypes: [{ category: 'general', description: 'General Waste' }],
          address: { street: 'Sample Street', city: 'Kathmandu' }
        }]);
      }

      // Load unread notification count
      const notificationCountResponse = await apiService.getUnreadNotificationCount();
      if (notificationCountResponse.success) {
        setUnreadNotifications(notificationCountResponse.data.count || 0);
      }

    } catch (error) {
      console.error('Dashboard loading error:', error);
      setError('Failed to load dashboard data');
      // Set dummy data on error as well
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatPickupData = (collection) => {
    return {
      id: collection._id,
      date: formatDate(new Date(collection.requestedDate)),
      time: collection.preferredTimeRange 
        ? `${collection.preferredTimeRange.start} - ${collection.preferredTimeRange.end}`
        : collection.requestedTime,
      type: collection.wasteTypes?.map(w => w.category).join(', ') || 'Mixed Waste',
      status: collection.status,
      requestId: collection.requestId,
      totalWeight: collection.totalEstimatedWeight
    };
  };

  const quickActions = [
    {
      id: 1,
      title: "Schedule Pickup",
      description: "Request waste collection",
      icon: "📅",
      action: "schedule",
    },
    {
      id: 2,
      title: "Live Tracking",
      description: "Track driver in real-time",
      icon: "�️",
      action: "track",
    },
    {
      id: 3,
      title: "Scan Waste",
      description: "Identify waste type",
      icon: "📸",
      action: "scan",
    },
    {
      id: 4,
      title: "Report Issue",
      description: "Report a problem",
      icon: "⚠️",
      action: "report",
    },
    {
      id: 5,
      title: "View History",
      description: "Past collections",
      icon: "📋",
      action: "history",
    },
    {
      id: 6,
      title: "Notifications",
      description: "Manage alerts",
      icon: "🔔",
      action: "notifications",
    },
  ];

  const handleQuickAction = (action) => {
    switch (action) {
      case "schedule":
        navigation.navigate("SchedulePickup");
        break;
      case "track":
        navigation.navigate("DriverTracking");
        break;
      case "scan":
        navigation.navigate("CameraScanner");
        break;
      case "report":
        navigation.navigate("ReportIssue");
        break;
      case "history":
        navigation.navigate("CollectionHistory");
        break;
      case "notifications":
        navigation.navigate("Notifications");
        break;
      case "insights":
        navigation.navigate("CustomerInsights");
        break;
      default:
        Alert.alert(
          "Feature Coming Soon",
          "This feature will be available soon!"
        );
    }
  };

  const handlePickupAction = async (pickupId, action) => {
    const pickup = upcomingPickups.find(p => p.id === pickupId);
    if (!pickup) return;

    if (action === "Reschedule") {
      Alert.alert(
        "Reschedule Pickup",
        `Reschedule ${pickup.type} scheduled for ${pickup.date}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reschedule",
            onPress: () => {
              // Navigate to schedule pickup with pre-filled data
              navigation.navigate("SchedulePickup", { 
                rescheduleId: pickupId,
                originalPickup: pickup 
              });
            },
          },
        ]
      );
    } else if (action === "Cancel") {
      Alert.alert(
        "Cancel Pickup",
        `Are you sure you want to cancel ${pickup.type} scheduled for ${pickup.date}?`,
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Cancel",
            style: "destructive",
            onPress: async () => {
              try {
                const response = await apiService.cancelCollection(pickupId, "Customer cancelled");
                if (response.success) {
                  // Refresh the dashboard data
                  loadDashboardData();
                  Alert.alert("Pickup Cancelled", "Your pickup has been cancelled successfully.");
                } else {
                  Alert.alert("Error", response.message || "Failed to cancel pickup");
                }
              } catch (error) {
                Alert.alert("Error", "Failed to cancel pickup. Please try again.");
              }
            },
          },
        ]
      );
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => navigation.navigate("Welcome"),
      },
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled":
        return COLORS.success;
      case "pending":
        return COLORS.warning;
      case "in-progress":
        return COLORS.info;
      default:
        return COLORS.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.customer} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <CustomButton
            title="Retry"
            onPress={loadDashboardData}
            style={styles.retryButton}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.customer]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hello Customer! 🏠</Text>
              <Text style={styles.subtitle}>Manage your waste collection</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => navigation.navigate("CustomerProfile")}
              >
                <Text style={styles.profileIcon}>👤</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Next Pickup Card */}
          {upcomingPickups.length > 0 ? (
            <View style={styles.nextPickupCard}>
              <Text style={styles.nextPickupTitle}>Next Pickup</Text>
              <Text style={styles.nextPickupDate}>
                {upcomingPickups[0].date instanceof Date 
                  ? formatDate(upcomingPickups[0].date) 
                  : upcomingPickups[0].date}
              </Text>
              <Text style={styles.nextPickupTime}>
                at {upcomingPickups[0].time}
              </Text>
              <Text style={styles.nextPickupType}>
                {upcomingPickups[0].type || 
                 (upcomingPickups[0].wasteTypes && upcomingPickups[0].wasteTypes.length > 0 
                   ? upcomingPickups[0].wasteTypes[0].description || upcomingPickups[0].wasteTypes[0].category
                   : 'General Waste')}
              </Text>
              <Text style={styles.nextPickupStatus}>
                Status: {upcomingPickups[0].status || 'Pending'}
              </Text>
              <CustomButton
                title="Track Driver"
                onPress={() => handleQuickAction("track")}
                style={styles.trackButton}
              />
            </View>
          ) : (
            <View style={styles.nextPickupCard}>
              <Text style={styles.nextPickupTitle}>No Upcoming Pickups</Text>
              <Text style={styles.nextPickupSubtitle}>Schedule your next waste collection</Text>
              <CustomButton
                title="Schedule Pickup"
                onPress={() => handleQuickAction("schedule")}
                style={styles.trackButton}
              />
            </View>
          )}

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statsGrid}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: COLORS.customer + "20" },
                ]}
              >
                <Text style={styles.statNumber}>
                  {dashboardData?.collections?.total || 1}
                </Text>
                <Text style={styles.statLabel}>Total Collections</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: COLORS.success + "20" },
                ]}
              >
                <Text style={styles.statNumber}>
                  {dashboardData?.waste?.totalWeight ? `${dashboardData.waste.totalWeight} kg` : '5 kg'}
                </Text>
                <Text style={styles.statLabel}>Waste Collected</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: COLORS.warning + "20" },
                ]}
              >
                <Text style={styles.statNumber}>
                  {dashboardData?.engagement?.totalPoints || 5}
                </Text>
                <Text style={styles.statLabel}>Reward Points</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: COLORS.info + "20" },
                ]}
              >
                <Text style={styles.statNumber}>
                  {dashboardData?.environmental?.carbonSaved || 0.36} kg
                </Text>
                <Text style={styles.statLabel}>CO₂ Saved</Text>
              </View>
            </View>
          </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => handleQuickAction(action.action)}
              >
                <View style={styles.actionIconContainer}>
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                  {action.action === "notifications" && unreadNotifications > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {unreadNotifications}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>
                  {action.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Pickups */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Collections</Text>
          <View style={styles.pickupsContainer}>
            {upcomingPickups.map((pickup) => (
              <View key={pickup.id} style={styles.pickupCard}>
                <View style={styles.pickupHeader}>
                  <View style={styles.pickupInfo}>
                    <Text style={styles.pickupType}>{pickup.type}</Text>
                    <Text style={styles.pickupDateTime}>
                      {formatDate(pickup.date)} at {pickup.time}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(pickup.status) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(pickup.status) },
                      ]}
                    >
                      {pickup.status.charAt(0).toUpperCase() +
                        pickup.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.pickupActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: COLORS.info },
                    ]}
                    onPress={() => handlePickupAction(pickup.id, "Reschedule")}
                  >
                    <Text style={styles.actionButtonText}>Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: COLORS.error },
                    ]}
                    onPress={() => handlePickupAction(pickup.id, "Cancel")}
                  >
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Waste Management Tips</Text>
          <View style={styles.tip}>
            <Text style={styles.tipText}>
              • Separate recyclables from general waste
            </Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>
              • Rinse containers before recycling
            </Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>
              • Compost organic waste when possible
            </Text>
          </View>
        </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SIZES.large,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.small,
  },
  profileButton: {
    backgroundColor: COLORS.primary + "20",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  profileIcon: {
    fontSize: 18,
  },
  greeting: {
    fontSize: SIZES.fontExtraLarge,
    fontWeight: "bold",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radiusSmall,
  },
  logoutText: {
    color: COLORS.surface,
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  nextPickupCard: {
    backgroundColor: COLORS.primary + "10",
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    marginBottom: SIZES.large,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary + "30",
  },
  nextPickupTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: SIZES.small,
  },
  nextPickupDate: {
    fontSize: SIZES.fontTitle,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  nextPickupTime: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    marginBottom: SIZES.large,
  },
  trackButton: {
    paddingHorizontal: SIZES.extraLarge,
  },
  statsContainer: {
    marginBottom: SIZES.large,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SIZES.large,
    borderRadius: SIZES.radiusMedium,
    marginHorizontal: SIZES.small / 2,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: SIZES.fontTitle,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  section: {
    marginBottom: SIZES.large,
  },
  sectionTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.medium,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    backgroundColor: COLORS.surface,
    padding: SIZES.large,
    borderRadius: SIZES.radiusMedium,
    marginBottom: SIZES.medium,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIconContainer: {
    position: "relative",
    marginBottom: SIZES.small,
  },
  actionIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: "600",
  },
  actionTitle: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  pickupsContainer: {
    gap: SIZES.medium,
  },
  pickupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SIZES.medium,
  },
  pickupInfo: {
    flex: 1,
  },
  pickupType: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  pickupDateTime: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small / 2,
    borderRadius: SIZES.radiusLarge,
  },
  statusText: {
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  pickupActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SIZES.small,
  },
  actionButton: {
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radiusSmall,
  },
  actionButtonText: {
    color: COLORS.surface,
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  tipsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.medium,
  },
  tip: {
    marginBottom: SIZES.small,
  },
  tipText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.large,
  },
  loadingText: {
    marginTop: SIZES.medium,
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.large,
  },
  errorText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SIZES.large,
  },
  retryButton: {
    backgroundColor: COLORS.customer,
    paddingHorizontal: SIZES.large,
  },
  nextPickupSubtitle: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    marginBottom: SIZES.large,
    textAlign: 'center',
  },
  nextPickupType: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginBottom: SIZES.medium,
    textAlign: 'center',
  },
  nextPickupStatus: {
    fontSize: SIZES.fontSmall,
    color: COLORS.primary,
    marginBottom: SIZES.medium,
    textAlign: 'center',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
