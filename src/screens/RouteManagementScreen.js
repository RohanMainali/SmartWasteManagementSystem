import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  RefreshControl,
  Linking,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { COLORS } from "../utils/theme";
import CustomButton from "../components/CustomButton";
import apiService from "../services/apiService";

const { width, height } = Dimensions.get("window");

// Enhanced Map Placeholder Component for Expo Go compatibility
const MapPlaceholder = ({ visible, onClose, stops, currentLocation }) => {
  const handleOpenInMaps = () => {
    if (stops.length === 0) {
      Alert.alert("No Stops", "No route stops available to display on map");
      return;
    }

    // Create a route with all stops for Google Maps
    const waypoints = stops.map(stop => {
      if (stop.coordinates) {
        return `${stop.coordinates.latitude},${stop.coordinates.longitude}`;
      }
      return null;
    }).filter(Boolean);

    if (waypoints.length === 0) {
      Alert.alert("No Coordinates", "No valid coordinates available for route stops");
      return;
    }

    // Create Google Maps URL with multiple waypoints
    const origin = currentLocation 
      ? `${currentLocation.latitude},${currentLocation.longitude}`
      : waypoints[0];
    
    const destination = waypoints[waypoints.length - 1];
    const waypointsParam = waypoints.slice(0, -1).join('|');
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypointsParam) {
      url += `&waypoints=${waypointsParam}`;
    }
    url += '&travelmode=driving';

    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open maps application");
    });
  };

  const handleWebMap = () => {
    // Open a web-based route planner
    const baseUrl = "https://www.google.com/maps";
    Linking.openURL(baseUrl).catch(() => {
      Alert.alert("Error", "Could not open web browser");
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>Route Map</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.mapContent}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderTitle}>🗺️ Route Overview</Text>
            <Text style={styles.mapPlaceholderText}>
              Interactive map view requires a development build.{"\n"}
              Use the options below to view your route.
            </Text>

            {/* Map Action Buttons */}
            <View style={styles.mapActions}>
              <TouchableOpacity 
                style={[styles.mapActionButton, styles.primaryMapButton]} 
                onPress={handleOpenInMaps}
              >
                <Text style={styles.mapActionIcon}>🧭</Text>
                <Text style={styles.mapActionText}>Open Full Route</Text>
                <Text style={styles.mapActionSubtext}>Google Maps Navigation</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.mapActionButton, styles.secondaryMapButton]} 
                onPress={handleWebMap}
              >
                <Text style={styles.mapActionIcon}>🌐</Text>
                <Text style={styles.mapActionText}>Web Maps</Text>
                <Text style={styles.mapActionSubtext}>Browser-based view</Text>
              </TouchableOpacity>
            </View>

            {/* Current Location Display */}
            {currentLocation && (
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>📍 Your Current Location</Text>
                <Text style={styles.locationText}>
                  Latitude: {currentLocation.latitude.toFixed(6)}{"\n"}
                  Longitude: {currentLocation.longitude.toFixed(6)}
                </Text>
                <TouchableOpacity 
                  style={styles.locationButton}
                  onPress={() => {
                    const url = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
                    Linking.openURL(url);
                  }}
                >
                  <Text style={styles.locationButtonText}>View on Map</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Route Statistics */}
            <View style={styles.routeStats}>
              <Text style={styles.routeStatsTitle}>📊 Route Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stops.length}</Text>
                  <Text style={styles.statLabel}>Total Stops</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {stops.filter(s => s.status === 'completed').length}
                  </Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {stops.filter(s => s.status === 'pending').length}
                  </Text>
                  <Text style={styles.statLabel}>Remaining</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Enhanced Stops List */}
          <View style={styles.stopsSection}>
            <Text style={styles.stopsTitle}>📍 Route Stops ({stops.length})</Text>
            {stops.map((stop, index) => (
              <View key={stop.id || stop._id || index} style={styles.stopItem}>
                <View style={styles.stopItemHeader}>
                  <Text style={styles.stopItemNumber}>{index + 1}</Text>
                  <View style={styles.stopItemInfo}>
                    <Text style={styles.stopItemName}>
                      {stop.customerName || stop.customer?.name || `Stop ${index + 1}`}
                    </Text>
                    <Text style={styles.stopItemAddress}>
                      {stop.address || "Address not available"}
                    </Text>
                    <Text style={styles.stopItemStatus}>
                      Status: {stop.status || "pending"}
                    </Text>
                    {stop.estimatedTime && (
                      <Text style={styles.stopItemTime}>
                        ETA: {stop.estimatedTime}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.navigateStopButton}
                    onPress={() => {
                      if (stop.coordinates) {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates.latitude},${stop.coordinates.longitude}`;
                        Linking.openURL(url);
                      } else {
                        Alert.alert("No Coordinates", "Location coordinates not available for this stop");
                      }
                    }}
                  >
                    <Text style={styles.navigateStopText}>Navigate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default function RouteManagementScreen({ navigation, route }) {
  const [currentRoute, setCurrentRoute] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);
  const [driverNotes, setDriverNotes] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);

  // Get route ID from navigation params or use default
  const routeId = route?.params?.routeId || "RT-001";

  useEffect(() => {
    loadRouteData();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required for route tracking"
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(coords);
    } catch (error) {
      console.error("Error getting location:", error);
    }
  };

  const loadRouteData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDriverRoutes();

      if (response.success && response.data) {
        const { activeRoute, routes } = response.data;

        if (activeRoute) {
          // Fetch detailed route data including stops
          const routeDetails = await apiService.getRouteDetails(activeRoute.id);
          if (routeDetails.success && routeDetails.data) {
            // Merge the active route data with detailed data
            const detailedRoute = {
              ...activeRoute,
              ...routeDetails.data,
              routeId: activeRoute.id,
              _id: activeRoute.id
            };
            setCurrentRoute(detailedRoute);
            setRouteStops(routeDetails.data.stops || []);
          } else {
            // Use basic route data without stops if details failed
            setCurrentRoute({
              ...activeRoute,
              routeId: activeRoute.id,
              _id: activeRoute.id
            });
            setRouteStops([]);
          }
        }
      }
    } catch (error) {
      console.error("Error loading route data:", error);
      Alert.alert("Error", "Failed to load route data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRouteAction = async (action) => {
    try {
      switch (action) {
        case "start":
          await apiService.startRoute(currentRoute._id);
          await loadRouteData();
          Alert.alert("Success", "Route started successfully");
          break;

        case "pause":
          await apiService.pauseRoute(currentRoute._id);
          await loadRouteData();
          Alert.alert("Success", "Route paused");
          break;

        case "complete":
          await apiService.completeRoute(currentRoute._id);
          await loadRouteData();
          Alert.alert("Success", "Route completed successfully");
          break;

        case "optimize":
          await apiService.optimizeRoute(currentRoute._id);
          await loadRouteData();
          Alert.alert("Success", "Route optimized");
          break;

        case "map":
          setShowMap(true);
          break;

        default:
          console.log("Unknown action:", action);
      }
    } catch (error) {
      console.error("Route action error:", error);
      Alert.alert("Error", "Failed to perform action. Please try again.");
    }
  };

  const handleStopAction = async (stopId, action) => {
    try {
      let newStatus;
      switch (action) {
        case "start":
          newStatus = "current";
          break;
        case "complete":
          newStatus = "completed";
          break;
        case "skip":
          newStatus = "skipped";
          break;
        default:
          return;
      }

      await apiService.updateStopStatus(
        currentRoute._id,
        stopId,
        newStatus,
        driverNotes
      );
      await loadRouteData();
      setShowNotes(false);
      setSelectedStop(null);
      setDriverNotes("");
      Alert.alert("Success", `Stop ${action}d successfully`);
    } catch (error) {
      console.error("Stop action error:", error);
      Alert.alert("Error", "Failed to update stop. Please try again.");
    }
  };

  const handleNavigation = (stop) => {
    let latitude, longitude;
    
    // Handle different coordinate formats from backend
    if (stop.coordinates?.latitude && stop.coordinates?.longitude) {
      latitude = stop.coordinates.latitude;
      longitude = stop.coordinates.longitude;
    } else if (stop.location?.coordinates) {
      [longitude, latitude] = stop.location.coordinates;
    } else {
      Alert.alert("Error", "Location coordinates not available for this stop");
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open navigation app");
    });
  };

  const handleEmergencyContact = () => {
    Alert.alert("Emergency Contact", "Choose contact method:", [
      {
        text: "Call Support",
        onPress: () => Linking.openURL("tel:+97714444444"),
      },
      { text: "Call Emergency", onPress: () => Linking.openURL("tel:100") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const renderStopStatus = (status) => {
    const statusColors = {
      pending: "#FFA500",
      current: "#4CAF50",
      completed: "#2196F3",
      skipped: "#FF5722",
    };

    const statusEmojis = {
      pending: "⏳",
      current: "🚛",
      completed: "✅",
      skipped: "⏭️",
    };

    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: statusColors[status] },
        ]}
      >
        <Text style={styles.statusEmoji}>{statusEmojis[status]}</Text>
        <Text style={styles.statusText}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  const renderRouteStops = () => {
    return routeStops.map((stop, index) => (
      <View key={stop.id || stop._id || index} style={styles.stopCard}>
        <View style={styles.stopHeader}>
          <View style={styles.stopNumberContainer}>
            <Text style={styles.stopNumber}>{index + 1}</Text>
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopTitle}>
              {stop.customerName || stop.customer?.name || "Unknown Customer"}
            </Text>
            <Text style={styles.stopAddress}>
              {stop.address || "Address not available"}
            </Text>
            <Text style={styles.stopWaste}>
              Waste: {stop.wasteTypes?.join(", ") || "Not specified"}
            </Text>
            {stop.estimatedTime && (
              <Text style={styles.stopTime}>
                Estimated: {stop.estimatedTime}
              </Text>
            )}
          </View>
          {renderStopStatus(stop.status || "pending")}
        </View>

        <View style={styles.stopActions}>
          <TouchableOpacity
            style={[styles.stopButton, styles.navigationButton]}
            onPress={() => handleNavigation(stop)}
          >
            <Text style={styles.buttonText}>🧭 Navigate</Text>
          </TouchableOpacity>

          {stop.status === "pending" && (
            <TouchableOpacity
              style={[styles.stopButton, styles.startButton]}
              onPress={() => handleStopAction(stop.id || stop._id, "start")}
            >
              <Text style={styles.buttonText}>▶️ Start</Text>
            </TouchableOpacity>
          )}

          {stop.status === "current" && (
            <>
              <TouchableOpacity
                style={[styles.stopButton, styles.completeButton]}
                onPress={() => {
                  setSelectedStop(stop);
                  setShowNotes(true);
                }}
              >
                <Text style={styles.buttonText}>✅ Complete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stopButton, styles.skipButton]}
                onPress={() => handleStopAction(stop.id || stop._id, "skip")}
              >
                <Text style={styles.buttonText}>⏭️ Skip</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    ));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRouteData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading route data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentRoute) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noRouteContainer}>
          <Text style={styles.noRouteTitle}>No Active Route</Text>
          <Text style={styles.noRouteText}>
            You don't have any active routes assigned. Contact your supervisor
            for route assignment.
          </Text>
          <CustomButton
            title="Refresh"
            onPress={loadRouteData}
            style={styles.refreshButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const progressPercentage =
    currentRoute.totalStops > 0
      ? (currentRoute.completedStops / currentRoute.totalStops) * 100
      : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Route Header */}
        <View style={styles.routeHeader}>
          <Text style={styles.routeTitle}>Route {currentRoute.routeId}</Text>
          <Text style={styles.routeSubtitle}>{currentRoute.name}</Text>

          {/* Route Progress */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Progress: {currentRoute.completedStops || 0}/
              {currentRoute.totalStops || 0} stops
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPercentage}>
              {progressPercentage.toFixed(1)}%
            </Text>
          </View>

          {/* Route Status */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    currentRoute.status === "active" ? "#4CAF50" : "#FFA500",
                },
              ]}
            >
              <Text style={styles.statusText}>
                {currentRoute.status?.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Route Times */}
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              🕐 Start: {currentRoute.startTime || "Not started"}
            </Text>
            <Text style={styles.timeText}>
              🏁 Est. End: {currentRoute.estimatedEndTime || "TBD"}
            </Text>
          </View>

          {/* Weather Info */}
          {currentRoute.weather && (
            <View style={styles.weatherContainer}>
              <Text style={styles.weatherText}>
                🌤️ {currentRoute.weather.condition} •{" "}
                {currentRoute.weather.temperature} • Humidity:{" "}
                {currentRoute.weather.humidity}
              </Text>
            </View>
          )}

          {/* Current Location */}
          {currentLocation && (
            <View style={styles.locationContainer}>
              <Text style={styles.locationText}>
                📍 Current: {currentLocation.latitude.toFixed(4)},{" "}
                {currentLocation.longitude.toFixed(4)}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRouteAction("map")}
          >
            <Text style={styles.actionIcon}>🗺️</Text>
            <Text style={styles.actionText}>Live Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (routeStops.length > 0) {
                const waypoints = routeStops.filter(stop => stop.coordinates)
                  .map(stop => `${stop.coordinates.latitude},${stop.coordinates.longitude}`)
                  .join('|');
                
                const origin = currentLocation 
                  ? `${currentLocation.latitude},${currentLocation.longitude}`
                  : waypoints.split('|')[0];
                
                const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&waypoints=${waypoints}&travelmode=driving`;
                Linking.openURL(url);
              } else {
                Alert.alert("No Route", "No route stops available for navigation");
              }
            }}
          >
            <Text style={styles.actionIcon}>🧭</Text>
            <Text style={styles.actionText}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRouteAction("optimize")}
          >
            <Text style={styles.actionIcon}>⚡</Text>
            <Text style={styles.actionText}>Optimize</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleEmergencyContact}
          >
            <Text style={styles.actionIcon}>🚨</Text>
            <Text style={styles.actionText}>Emergency</Text>
          </TouchableOpacity>
        </View>

        {/* Route Control */}
        <View style={styles.routeControl}>
          {currentRoute.status !== "active" && (
            <CustomButton
              title="🚀 Start Route"
              onPress={() => handleRouteAction("start")}
              style={styles.startRouteButton}
            />
          )}

          {currentRoute.status === "active" && (
            <View style={styles.activeControls}>
              <CustomButton
                title="⏸️ Pause Route"
                onPress={() => handleRouteAction("pause")}
                style={[styles.controlButton, styles.pauseButton]}
              />
              <CustomButton
                title="🏁 Complete Route"
                onPress={() => handleRouteAction("complete")}
                style={[styles.controlButton, styles.completeRouteButton]}
              />
            </View>
          )}
        </View>

        {/* Route Stops */}
        <View style={styles.stopsSection}>
          <Text style={styles.sectionTitle}>
            Route Stops ({routeStops.length})
          </Text>
          {renderRouteStops()}
        </View>
      </ScrollView>

      {/* Map Placeholder Modal */}
      <MapPlaceholder
        visible={showMap}
        onClose={() => setShowMap(false)}
        stops={routeStops}
        currentLocation={currentLocation}
      />

      {/* Notes Modal */}
      <Modal
        visible={showNotes}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowNotes(false)}
      >
        <View style={styles.notesModalOverlay}>
          <View style={styles.notesModal}>
            <Text style={styles.notesTitle}>Complete Stop</Text>
            <Text style={styles.notesSubtitle}>
              {selectedStop?.customerName || selectedStop?.customer?.name || "Customer"}
            </Text>

            <TextInput
              style={styles.notesInput}
              placeholder="Add notes about this collection (optional)"
              value={driverNotes}
              onChangeText={setDriverNotes}
              multiline={true}
              numberOfLines={4}
            />

            <View style={styles.notesActions}>
              <TouchableOpacity
                style={[styles.notesButton, styles.cancelButton]}
                onPress={() => {
                  setShowNotes(false);
                  setSelectedStop(null);
                  setDriverNotes("");
                }}
              >
                <Text style={styles.notesButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.notesButton, styles.confirmButton]}
                onPress={() => handleStopAction(selectedStop?.id || selectedStop?._id, "complete")}
              >
                <Text style={styles.notesButtonText}>Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  noRouteContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  noRouteTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  noRouteText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  refreshButton: {
    backgroundColor: COLORS.primary,
  },
  routeHeader: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  routeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  routeSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  progressPercentage: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "right",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  statusEmoji: {
    marginRight: 4,
    fontSize: 12,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  timeContainer: {
    marginBottom: 12,
  },
  timeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  weatherContainer: {
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  weatherText: {
    fontSize: 14,
    color: "#1976d2",
  },
  locationContainer: {
    backgroundColor: "#f3e5f5",
    padding: 12,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#7b1fa2",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    flexWrap: "wrap",
  },
  actionButton: {
    backgroundColor: "white",
    flex: 1,
    minWidth: "22%",
    marginHorizontal: 2,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  routeControl: {
    marginBottom: 16,
  },
  startRouteButton: {
    backgroundColor: "#4CAF50",
  },
  activeControls: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  controlButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  pauseButton: {
    backgroundColor: "#FF9800",
  },
  completeRouteButton: {
    backgroundColor: "#2196F3",
  },
  stopsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  stopCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stopHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  stopNumberContainer: {
    marginRight: 12,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    color: "white",
    textAlign: "center",
    lineHeight: 32,
    fontSize: 14,
    fontWeight: "bold",
  },
  stopInfo: {
    flex: 1,
    marginRight: 12,
  },
  stopTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  stopAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  stopWaste: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  stopTime: {
    fontSize: 12,
    color: COLORS.primary,
    fontStyle: "italic",
    marginTop: 2,
  },
  stopActions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    flexWrap: "wrap",
  },
  stopButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  navigationButton: {
    backgroundColor: "#2196F3",
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  completeButton: {
    backgroundColor: "#FF9800",
  },
  skipButton: {
    backgroundColor: "#FF5722",
  },
  buttonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  mapPlaceholder: {
    flex: 1,
    padding: 20,
  },
  mapContent: {
    flex: 1,
  },
  mapActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  mapActionButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryMapButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryMapButton: {
    backgroundColor: "#2196F3",
  },
  mapActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  mapActionText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  mapActionSubtext: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  routeStats: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  routeStatsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  stopsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stopItemHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  stopItemTime: {
    fontSize: 11,
    color: COLORS.primary,
    fontStyle: "italic",
    marginTop: 2,
  },
  navigateStopButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  navigateStopText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  locationButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "center",
  },
  locationButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  mapPlaceholderTitle: {
    fontSize: 48,
    marginBottom: 20,
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  locationInfo: {
    backgroundColor: "#f3e5f5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  stopsList: {
    maxHeight: 300,
    width: "100%",
  },
  stopsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  stopItem: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  stopItemNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    color: "white",
    textAlign: "center",
    lineHeight: 30,
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 12,
  },
  stopItemInfo: {
    flex: 1,
  },
  stopItemName: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  stopItemAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  stopItemStatus: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "500",
  },
  notesModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  notesModal: {
    backgroundColor: "white",
    margin: 20,
    padding: 24,
    borderRadius: 16,
    width: width - 40,
  },
  notesTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  notesSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    textAlignVertical: "top",
    minHeight: 80,
  },
  notesActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  notesButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  notesButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
});