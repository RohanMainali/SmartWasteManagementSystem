import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { COLORS, SIZES } from "../utils/theme";
import CustomButton from "../components/CustomButton";

export default function DriverDashboard({ navigation }) {
  const [driverStats] = useState({
    todayCollections: 12,
    completedRoutes: 3,
    pendingPickups: 8,
    totalDistance: "45.2 km",
  });

  const [todayRoutes] = useState([
    {
      id: 1,
      route: "Route A - Residential",
      status: "completed",
      time: "09:00 AM",
      collections: 15,
    },
    {
      id: 2,
      route: "Route B - Commercial",
      status: "in-progress",
      time: "11:30 AM",
      collections: 8,
    },
    {
      id: 3,
      route: "Route C - Industrial",
      status: "pending",
      time: "02:00 PM",
      collections: 12,
    },
  ]);

  const quickActions = [
    {
      id: 1,
      title: "Route Management",
      description: "Manage your routes and navigation",
      icon: "🗺️",
      action: "route-management",
    },
    {
      id: 2,
      title: "Collection Tracking",
      description: "Track your collections progress",
      icon: "📋",
      action: "collection-tracking",
    },
    {
      id: 3,
      title: "Take Break",
      description: "Log break time",
      icon: "☕",
      action: "break",
    },
    {
      id: 4,
      title: "Performance",
      description: "View your performance metrics",
      icon: "📊",
      action: "performance",
    },
    {
      id: 5,
      title: "Emergency Contact",
      description: "Access emergency contacts",
      icon: "🚨",
      action: "emergency",
    },
    {
      id: 6,
      title: "Driver Profile",
      description: "Manage your profile",
      icon: "👤",
      action: "profile",
    },
  ];

  const handleQuickAction = (action) => {
    switch (action) {
      case "route-management":
        navigation.navigate("RouteManagement");
        break;
      case "collection-tracking":
        navigation.navigate("CollectionTracking");
        break;
      case "break":
        navigation.navigate("BreakManagement");
        break;
      case "performance":
        navigation.navigate("DriverPerformance");
        break;
      case "emergency":
        navigation.navigate("EmergencyContact");
        break;
      case "profile":
        navigation.navigate("DriverProfile");
        break;
      default:
        Alert.alert(
          "Feature Coming Soon",
          "This feature will be available soon!"
        );
    }
  };

  const handleRouteAction = (routeId, action) => {
    Alert.alert(
      "Route Action",
      `${action} for route ${routeId} will be implemented soon!`
    );
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
      case "completed":
        return COLORS.success;
      case "in-progress":
        return COLORS.warning;
      case "pending":
        return COLORS.info;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning, Driver! 🚛</Text>
            <Text style={styles.subtitle}>
              Ready to make a difference today?
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: COLORS.success + "20" },
              ]}
            >
              <Text style={styles.statNumber}>
                {driverStats.todayCollections}
              </Text>
              <Text style={styles.statLabel}>Collections</Text>
            </View>
            <View
              style={[styles.statCard, { backgroundColor: COLORS.info + "20" }]}
            >
              <Text style={styles.statNumber}>
                {driverStats.completedRoutes}
              </Text>
              <Text style={styles.statLabel}>Routes Done</Text>
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
                {driverStats.pendingPickups}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: COLORS.driver + "20" },
              ]}
            >
              <Text style={styles.statNumber}>{driverStats.totalDistance}</Text>
              <Text style={styles.statLabel}>Distance</Text>
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
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>
                  {action.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's Routes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Routes</Text>
          <View style={styles.routesContainer}>
            {todayRoutes.map((route) => (
              <View key={route.id} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName}>{route.route}</Text>
                    <Text style={styles.routeTime}>
                      Scheduled: {route.time}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(route.status) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(route.status) },
                      ]}
                    >
                      {getStatusText(route.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.routeDetails}>
                  <Text style={styles.routeCollections}>
                    Collections: {route.collections} stops
                  </Text>
                  <View style={styles.routeActions}>
                    {route.status === "pending" && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: COLORS.primary },
                        ]}
                        onPress={() => handleRouteAction(route.id, "Start")}
                      >
                        <Text style={styles.actionButtonText}>Start</Text>
                      </TouchableOpacity>
                    )}
                    {route.status === "in-progress" && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: COLORS.warning },
                        ]}
                        onPress={() => handleRouteAction(route.id, "Continue")}
                      >
                        <Text style={styles.actionButtonText}>Continue</Text>
                      </TouchableOpacity>
                    )}
                    {route.status === "completed" && (
                      <View
                        style={[
                          styles.actionButton,
                          { backgroundColor: COLORS.success },
                        ]}
                      >
                        <Text style={styles.actionButtonText}>✓ Done</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.emergencyContainer}>
          <Text style={styles.emergencyTitle}>Need Help?</Text>
          <CustomButton
            title="Emergency Contacts"
            onPress={() => navigation.navigate("EmergencyContact")}
            variant="secondary"
          />
        </View>
      </ScrollView>
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
  statsContainer: {
    marginBottom: SIZES.large,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.medium,
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
  actionIcon: {
    fontSize: 24,
    marginBottom: SIZES.small,
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
  routesContainer: {
    gap: SIZES.medium,
  },
  routeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SIZES.medium,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  routeTime: {
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
  routeDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeCollections: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  routeActions: {
    flexDirection: "row",
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
  emergencyContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.medium,
  },
});
