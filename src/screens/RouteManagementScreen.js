import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { COLORS, SIZES } from "../utils/theme";
import CustomButton from "../components/CustomButton";
import { formatTime } from "../utils/helpers";

const { width } = Dimensions.get("window");

export default function RouteManagementScreen({ navigation }) {
  const [currentRoute, setCurrentRoute] = useState({
    id: "RT-001",
    name: "Residential Route A",
    totalStops: 15,
    completedStops: 8,
    estimatedTime: "2h 30m",
    remainingTime: "1h 15m",
    status: "in-progress",
  });

  const [routeStops] = useState([
    {
      id: 1,
      address: "123 Oak Street",
      type: "Residential",
      status: "completed",
      time: "08:15 AM",
      waste: "General",
    },
    {
      id: 2,
      address: "456 Pine Avenue",
      type: "Residential",
      status: "completed",
      time: "08:30 AM",
      waste: "Recycling",
    },
    {
      id: 3,
      address: "789 Maple Drive",
      type: "Residential",
      status: "completed",
      time: "08:45 AM",
      waste: "General",
    },
    {
      id: 4,
      address: "321 Elm Street",
      type: "Residential",
      status: "completed",
      time: "09:00 AM",
      waste: "Organic",
    },
    {
      id: 5,
      address: "654 Cedar Lane",
      type: "Residential",
      status: "completed",
      time: "09:15 AM",
      waste: "General",
    },
    {
      id: 6,
      address: "987 Birch Road",
      type: "Residential",
      status: "completed",
      time: "09:30 AM",
      waste: "Recycling",
    },
    {
      id: 7,
      address: "147 Willow Way",
      type: "Residential",
      status: "completed",
      time: "09:45 AM",
      waste: "General",
    },
    {
      id: 8,
      address: "258 Spruce Circle",
      type: "Residential",
      status: "completed",
      time: "10:00 AM",
      waste: "General",
    },
    {
      id: 9,
      address: "369 Ash Boulevard",
      type: "Residential",
      status: "current",
      time: "10:15 AM",
      waste: "General",
    },
    {
      id: 10,
      address: "741 Cherry Street",
      type: "Residential",
      status: "pending",
      time: "10:30 AM",
      waste: "Recycling",
    },
    {
      id: 11,
      address: "852 Poplar Avenue",
      type: "Commercial",
      status: "pending",
      time: "10:45 AM",
      waste: "Commercial",
    },
    {
      id: 12,
      address: "963 Hickory Drive",
      type: "Residential",
      status: "pending",
      time: "11:00 AM",
      waste: "General",
    },
    {
      id: 13,
      address: "159 Sycamore Lane",
      type: "Residential",
      status: "pending",
      time: "11:15 AM",
      waste: "Organic",
    },
    {
      id: 14,
      address: "357 Dogwood Road",
      type: "Residential",
      status: "pending",
      time: "11:30 AM",
      waste: "General",
    },
    {
      id: 15,
      address: "486 Magnolia Court",
      type: "Commercial",
      status: "pending",
      time: "11:45 AM",
      waste: "Commercial",
    },
  ]);

  const [driverNotes, setDriverNotes] = useState("");

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return COLORS.success;
      case "current":
        return COLORS.warning;
      case "pending":
        return COLORS.info;
      case "skipped":
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return "✅";
      case "current":
        return "🚛";
      case "pending":
        return "⏳";
      case "skipped":
        return "⏭️";
      default:
        return "📍";
    }
  };

  const getWasteTypeColor = (type) => {
    switch (type) {
      case "General":
        return COLORS.textSecondary;
      case "Recycling":
        return COLORS.info;
      case "Organic":
        return COLORS.success;
      case "Commercial":
        return COLORS.customer;
      default:
        return COLORS.textSecondary;
    }
  };

  const handleStopAction = (stopId, action) => {
    const stop = routeStops.find((s) => s.id === stopId);
    switch (action) {
      case "complete":
        Alert.alert(
          "Complete Stop",
          `Mark collection at ${stop.address} as completed?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Complete", onPress: () => console.log("Stop completed") },
          ]
        );
        break;
      case "skip":
        Alert.alert("Skip Stop", `Skip collection at ${stop.address}?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Skip",
            style: "destructive",
            onPress: () => console.log("Stop skipped"),
          },
        ]);
        break;
      case "navigate":
        Alert.alert("Navigation", `Opening GPS navigation to ${stop.address}`);
        break;
      case "report":
        Alert.alert(
          "Report Issue",
          "Issue reporting feature will be implemented soon!"
        );
        break;
    }
  };

  const handleRouteAction = (action) => {
    switch (action) {
      case "pause":
        Alert.alert(
          "Pause Route",
          "Route has been paused. You can resume anytime."
        );
        break;
      case "complete":
        Alert.alert(
          "Complete Route",
          "Are you sure you want to mark this entire route as completed?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Complete", onPress: () => navigation.goBack() },
          ]
        );
        break;
      case "emergency":
        Alert.alert(
          "Emergency Contact",
          "Contacting dispatch for emergency assistance..."
        );
        break;
      case "map":
        Alert.alert("Route Map", "Full route map feature coming soon!");
        break;
    }
  };

  const progressPercentage =
    (currentRoute.completedStops / currentRoute.totalStops) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Route Header */}
        <View style={styles.routeHeader}>
          <Text style={styles.routeName}>{currentRoute.name}</Text>
          <Text style={styles.routeId}>Route ID: {currentRoute.id}</Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentRoute.completedStops} of {currentRoute.totalStops} stops
              completed
            </Text>
          </View>

          {/* Route Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentRoute.estimatedTime}</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentRoute.remainingTime}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  { color: getStatusColor(currentRoute.status) },
                ]}
              >
                {currentRoute.status.replace("-", " ").toUpperCase()}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRouteAction("map")}
          >
            <Text style={styles.actionIcon}>🗺️</Text>
            <Text style={styles.actionText}>View Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRouteAction("pause")}
          >
            <Text style={styles.actionIcon}>⏸️</Text>
            <Text style={styles.actionText}>Pause Route</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.emergencyButton]}
            onPress={() => handleRouteAction("emergency")}
          >
            <Text style={styles.actionIcon}>🚨</Text>
            <Text style={styles.actionText}>Emergency</Text>
          </TouchableOpacity>
        </View>

        {/* Route Stops */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Stops</Text>
          <View style={styles.stopsContainer}>
            {routeStops.map((stop, index) => (
              <View key={stop.id} style={styles.stopCard}>
                <View style={styles.stopHeader}>
                  <View style={styles.stopLeft}>
                    <View
                      style={[
                        styles.stopNumber,
                        { backgroundColor: getStatusColor(stop.status) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stopNumberText,
                          { color: getStatusColor(stop.status) },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.stopInfo}>
                      <Text style={styles.stopAddress}>{stop.address}</Text>
                      <View style={styles.stopDetails}>
                        <Text style={styles.stopTime}>{stop.time}</Text>
                        <View
                          style={[
                            styles.wasteTypeBadge,
                            {
                              backgroundColor:
                                getWasteTypeColor(stop.waste) + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.wasteTypeText,
                              { color: getWasteTypeColor(stop.waste) },
                            ]}
                          >
                            {stop.waste}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.stopRight}>
                    <Text style={styles.statusIcon}>
                      {getStatusIcon(stop.status)}
                    </Text>
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(stop.status) },
                      ]}
                    >
                      {stop.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Stop Actions */}
                {stop.status === "current" && (
                  <View style={styles.stopActions}>
                    <TouchableOpacity
                      style={[
                        styles.stopActionButton,
                        { backgroundColor: COLORS.info },
                      ]}
                      onPress={() => handleStopAction(stop.id, "navigate")}
                    >
                      <Text style={styles.stopActionText}>Navigate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.stopActionButton,
                        { backgroundColor: COLORS.success },
                      ]}
                      onPress={() => handleStopAction(stop.id, "complete")}
                    >
                      <Text style={styles.stopActionText}>Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.stopActionButton,
                        { backgroundColor: COLORS.warning },
                      ]}
                      onPress={() => handleStopAction(stop.id, "skip")}
                    >
                      <Text style={styles.stopActionText}>Skip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.stopActionButton,
                        { backgroundColor: COLORS.error },
                      ]}
                      onPress={() => handleStopAction(stop.id, "report")}
                    >
                      <Text style={styles.stopActionText}>Issue</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {stop.status === "pending" && (
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={[
                        styles.pendingButton,
                        { backgroundColor: COLORS.info },
                      ]}
                      onPress={() => handleStopAction(stop.id, "navigate")}
                    >
                      <Text style={styles.pendingButtonText}>Navigate</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Complete Route Button */}
        <View style={styles.completeContainer}>
          <CustomButton
            title="Complete Route"
            onPress={() => handleRouteAction("complete")}
            style={styles.completeButton}
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
  routeHeader: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    marginBottom: SIZES.large,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeName: {
    fontSize: SIZES.fontTitle,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  routeId: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    marginBottom: SIZES.large,
  },
  progressContainer: {
    marginBottom: SIZES.large,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: SIZES.small,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: SIZES.fontLarge,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.large,
    gap: SIZES.small,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SIZES.medium,
    borderRadius: SIZES.radiusMedium,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyButton: {
    backgroundColor: COLORS.error + "20",
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: SIZES.small,
  },
  actionText: {
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
    color: COLORS.text,
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
  stopsContainer: {
    gap: SIZES.medium,
  },
  stopCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  stopLeft: {
    flexDirection: "row",
    flex: 1,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SIZES.medium,
  },
  stopNumberText: {
    fontSize: SIZES.fontMedium,
    fontWeight: "bold",
  },
  stopInfo: {
    flex: 1,
  },
  stopAddress: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  stopDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.medium,
  },
  stopTime: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  wasteTypeBadge: {
    paddingHorizontal: SIZES.small,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSmall,
  },
  wasteTypeText: {
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  stopRight: {
    alignItems: "center",
  },
  statusIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  statusText: {
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  stopActions: {
    flexDirection: "row",
    marginTop: SIZES.medium,
    gap: SIZES.small,
  },
  stopActionButton: {
    flex: 1,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radiusSmall,
    alignItems: "center",
  },
  stopActionText: {
    color: COLORS.surface,
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  pendingActions: {
    marginTop: SIZES.medium,
  },
  pendingButton: {
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.radiusSmall,
    alignSelf: "flex-start",
  },
  pendingButtonText: {
    color: COLORS.surface,
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  completeContainer: {
    marginTop: SIZES.medium,
  },
  completeButton: {
    backgroundColor: COLORS.success,
  },
});
