import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { COLORS, SIZES } from "../utils/theme";
import CustomButton from "../components/CustomButton";
import { formatTime, getRelativeTime } from "../utils/helpers";
import apiService from "../services/apiService";
import webSocketService from "../services/webSocketService";

export default function DriverTrackingScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTrackingData();
    setupWebSocket();

    return () => {
      cleanup();
    };
  }, []);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getActiveCollectionTracking();
      
      if (response.success) {
        setTrackingData(response.data);
        
        // If we have a collection ID, set up real-time tracking
        if (response.data.collection?.id) {
          setupCollectionTracking(response.data.collection.id);
        }
      } else {
        setError(response.message || 'No active collection found for tracking');
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
      setError('Failed to load tracking information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    webSocketService.connect();
    webSocketService.on('connected', handleWebSocketConnected);
    webSocketService.on('driverLocationUpdate', handleDriverLocationUpdate);
    webSocketService.on('collectionStatusUpdate', handleCollectionStatusUpdate);
  };

  const setupCollectionTracking = (collectionId) => {
    webSocketService.subscribeToCollection(collectionId);
    webSocketService.requestDriverLocation(collectionId);
  };

  const handleWebSocketConnected = () => {
    if (trackingData?.collection?.id) {
      setupCollectionTracking(trackingData.collection.id);
    }
  };

  const handleDriverLocationUpdate = (locationData) => {
    if (trackingData?.collection?.id === locationData.collectionId) {
      setTrackingData(prev => ({
        ...prev,
        driverLocation: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          timestamp: locationData.timestamp,
          estimatedArrival: locationData.estimatedArrival,
          distance: locationData.distance,
        },
        lastUpdate: new Date().toISOString()
      }));
    }
  };

  const handleCollectionStatusUpdate = (statusData) => {
    if (trackingData?.collection?.id === statusData.collectionId) {
      setTrackingData(prev => ({
        ...prev,
        collection: {
          ...prev.collection,
          status: statusData.status,
          actualStartTime: statusData.actualStartTime,
          actualEndTime: statusData.actualEndTime,
        }
      }));

      // Show status change notifications
      if (statusData.status === 'in_progress') {
        Alert.alert('Driver Arrived', 'Your driver has arrived and started the collection!');
      } else if (statusData.status === 'completed') {
        Alert.alert('Collection Complete', 'Your waste collection has been completed successfully!');
      }
    }
  };

  const cleanup = () => {
    if (trackingData?.collection?.id) {
      webSocketService.unsubscribeFromCollection(trackingData.collection.id);
      webSocketService.stopDriverLocation(trackingData.collection.id);
    }
    webSocketService.off('connected', handleWebSocketConnected);
    webSocketService.off('driverLocationUpdate', handleDriverLocationUpdate);
    webSocketService.off('collectionStatusUpdate', handleCollectionStatusUpdate);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrackingData();
    setRefreshing(false);
  };

  const handleCallDriver = () => {
    if (!trackingData?.driver?.phone) {
      Alert.alert('Error', 'Driver phone number not available');
      return;
    }

    Alert.alert("Call Driver", `Would you like to call ${trackingData.driver.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => {
          Linking.openURL(`tel:${trackingData.driver.phone}`);
        },
      },
    ]);
  };

  const handleMessageDriver = () => {
    Alert.alert("Message Driver", "Messaging feature coming soon!");
  };

  const handleReportIssue = () => {
    Alert.alert("Report Issue", "Issue reporting feature coming soon!");
  };

  const handleReschedule = () => {
    Alert.alert("Reschedule Collection", "Rescheduling feature coming soon!");
  };

  const getStopStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return "✅";
      case "in-progress":
        return "🔄";
      case "upcoming":
        return "⏳";
      default:
        return "❓";
    }
  };

  const getStopStatusColor = (status) => {
    switch (status) {
      case "completed":
        return COLORS.success;
      case "in-progress":
        return COLORS.warning;
      case "upcoming":
        return COLORS.textSecondary;
      default:
        return COLORS.textLight;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "info":
        return "ℹ️";
      default:
        return "📱";
    }
  };

  const currentUserStop = trackingData.route.find((stop) => stop.isCurrentUser);
  const completedStops = trackingData.route.filter(
    (stop) => stop.status === "completed"
  ).length;
  const progressPercentage = (completedStops / trackingData.totalStops) * 100;

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned':
        return '#3B82F6';
      case 'in_progress':
        return '#10B981';
      case 'completed':
        return '#059669';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'assigned':
        return 'Driver Assigned';
      case 'in_progress':
        return 'Collection in Progress';
      case 'completed':
        return 'Collection Completed';
      case 'cancelled':
        return 'Collection Cancelled';
      default:
        return 'Unknown Status';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading tracking information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trackingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Driver Tracking</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No Active Collection</Text>
          <Text style={styles.errorMessage}>
            {error || 'You don\'t have any active collections to track at the moment.'}
          </Text>
          <CustomButton
            title="Schedule a Pickup"
            onPress={() => navigation.navigate('SchedulePickup')}
            style={styles.errorButton}
          />
          <CustomButton
            title="Refresh"
            onPress={loadTrackingData}
            variant="secondary"
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Driver Tracking</Text>
        </View>

        {/* Collection Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Collection Status</Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(trackingData.collection?.status) }
            ]}>
              <Text style={styles.statusText}>
                {getStatusText(trackingData.collection?.status)}
              </Text>
            </View>
          </View>
          
          <View style={styles.collectionDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Scheduled Time:</Text>
              <Text style={styles.detailValue}>
                {trackingData.collection?.requestedDate 
                  ? formatTime(new Date(trackingData.collection.requestedDate))
                  : 'Not specified'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Collection ID:</Text>
              <Text style={styles.detailValue}>
                {trackingData.collection?.requestId || 'N/A'}
              </Text>
            </View>
            
            {trackingData.collection?.wasteTypes && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Waste Types:</Text>
                <Text style={styles.detailValue}>
                  {Array.isArray(trackingData.collection.wasteTypes) 
                    ? trackingData.collection.wasteTypes.map(w => w.category).join(', ')
                    : trackingData.collection.wasteTypes}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Driver Information Card */}
        {trackingData.driver && (
          <View style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <Text style={styles.driverTitle}>Your Driver</Text>
              <TouchableOpacity
                style={styles.callButton}
                onPress={handleCallDriver}
              >
                <Text style={styles.callButtonText}>📞 Call</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.driverInfo}>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{trackingData.driver.name}</Text>
                <Text style={styles.driverPhone}>{trackingData.driver.phone}</Text>
                
                {trackingData.vehicle && (
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleText}>
                      🚛 {trackingData.vehicle.model} - {trackingData.vehicle.licensePlate}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Location Tracking Card */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <Text style={styles.trackingTitle}>📍 Live Location</Text>
            <Text style={styles.lastUpdate}>
              Last update: {trackingData.lastUpdate 
                ? getRelativeTime(new Date(trackingData.lastUpdate))
                : 'Never'}
            </Text>
          </View>
          
          {trackingData.driverLocation ? (
            <View style={styles.locationDetails}>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Distance:</Text>
                <Text style={styles.locationValue}>
                  {trackingData.driverLocation.distance 
                    ? `${trackingData.driverLocation.distance.toFixed(1)} km away`
                    : 'Calculating...'}
                </Text>
              </View>
              
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>ETA:</Text>
                <Text style={styles.locationValue}>
                  {trackingData.driverLocation.estimatedArrival || 'Calculating...'}
                </Text>
              </View>
              
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Status:</Text>
                <Text style={[styles.locationValue, { color: COLORS.success }]}>
                  🟢 Tracking Active
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noTrackingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.noTrackingText}>
                Waiting for driver location updates...
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <CustomButton
            title="🗺️ Open in Maps"
            onPress={() => {
              if (trackingData.driverLocation) {
                const url = `https://maps.apple.com/?daddr=${trackingData.driverLocation.latitude},${trackingData.driverLocation.longitude}`;
                Linking.openURL(url);
              } else {
                Alert.alert('Location Not Available', 'Driver location is not currently available.');
              }
            }}
            style={styles.actionButton}
          />
          
          <CustomButton
            title="📞 Call Driver"
            onPress={handleCallDriver}
            variant="secondary"
            style={styles.actionButton}
          />
          
          {trackingData.collection?.status === 'assigned' && (
            <CustomButton
              title="❌ Cancel Collection"
              onPress={() => {
                Alert.alert(
                  'Cancel Collection',
                  'Are you sure you want to cancel this collection?',
                  [
                    { text: 'No', style: 'cancel' },
                    { 
                      text: 'Yes', 
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await apiService.cancelCollection(
                            trackingData.collection.id, 
                            'Cancelled by customer'
                          );
                          Alert.alert('Cancelled', 'Your collection has been cancelled');
                          navigation.goBack();
                        } catch (error) {
                          Alert.alert('Error', 'Failed to cancel collection');
                        }
                      }
                    }
                  ]
                );
              }}
              variant="outline"
              style={[styles.actionButton, styles.cancelButton]}
            />
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: SIZES.large,
  },
  errorTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  errorMessage: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.large,
  },
  errorButton: {
    marginBottom: SIZES.medium,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SIZES.small,
  },
  backButtonText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: SIZES.fontLarge,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    margin: SIZES.large,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.medium,
  },
  statusTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radiusSmall,
  },
  statusText: {
    color: COLORS.surface,
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
  },
  collectionDetails: {
    gap: SIZES.small,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    fontWeight: '600',
  },
  driverCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.large,
    marginBottom: SIZES.large,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.medium,
  },
  driverTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  callButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radiusSmall,
  },
  callButtonText: {
    color: COLORS.surface,
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
  },
  driverInfo: {
    gap: SIZES.small,
  },
  driverDetails: {
    gap: SIZES.small,
  },
  driverName: {
    fontSize: SIZES.fontLarge,
    fontWeight: '600',
    color: COLORS.text,
  },
  driverPhone: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
  vehicleInfo: {
    marginTop: SIZES.small,
  },
  vehicleText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
  trackingCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.large,
    marginBottom: SIZES.large,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.medium,
  },
  trackingTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  lastUpdate: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textLight,
  },
  locationDetails: {
    gap: SIZES.small,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
  locationValue: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    fontWeight: '600',
  },
  noTrackingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.large,
    gap: SIZES.small,
  },
  noTrackingText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
  actionSection: {
    padding: SIZES.large,
    gap: SIZES.medium,
  },
  actionButton: {
    marginBottom: SIZES.small,
  },
  cancelButton: {
    borderColor: COLORS.error,
  },
});

        {/* Tracking Status */}
        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Tracking Status</Text>
          <View style={styles.statusInfo}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Distance Away</Text>
              <Text style={styles.statusValue}>
                {trackingData.distanceAway}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Estimated Arrival</Text>
              <Text style={styles.statusValue}>
                {trackingData.estimatedArrival}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Stops Remaining</Text>
              <Text style={styles.statusValue}>
                {trackingData.stopsRemaining}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Route Progress</Text>
              <Text style={styles.progressText}>
                {completedStops}/{trackingData.totalStops} stops
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
          </View>

          <Text style={styles.lastUpdate}>
            Last updated: {getRelativeTime(trackingData.lastUpdate)}
          </Text>
        </View>

        {/* Your Collection Details */}
        {currentUserStop && (
          <View style={styles.collectionCard}>
            <Text style={styles.sectionTitle}>Your Collection</Text>
            <View style={styles.collectionInfo}>
              <View style={styles.collectionRow}>
                <Text style={styles.collectionLabel}>Address:</Text>
                <Text style={styles.collectionValue}>
                  {currentUserStop.address}
                </Text>
              </View>
              <View style={styles.collectionRow}>
                <Text style={styles.collectionLabel}>Estimated Time:</Text>
                <Text style={styles.collectionValue}>
                  {currentUserStop.estimatedTime}
                </Text>
              </View>
              <View style={styles.collectionRow}>
                <Text style={styles.collectionLabel}>Status:</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusIcon}>
                    {getStopStatusIcon(currentUserStop.status)}
                  </Text>
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: getStopStatusColor(currentUserStop.status) },
                    ]}
                  >
                    {currentUserStop.status.charAt(0).toUpperCase() +
                      currentUserStop.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.collectionActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: COLORS.warning },
                ]}
                onPress={handleReschedule}
              >
                <Text style={styles.actionButtonText}>Reschedule</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: COLORS.error }]}
                onPress={handleReportIssue}
              >
                <Text style={styles.actionButtonText}>Report Issue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Route Overview */}
        <View style={styles.routeCard}>
          <Text style={styles.sectionTitle}>Route Overview</Text>
          <View style={styles.routeList}>
            {trackingData.route.map((stop, index) => (
              <View
                key={stop.id}
                style={[
                  styles.routeStop,
                  stop.isCurrentUser && styles.currentUserStop,
                ]}
              >
                <View style={styles.stopIndicator}>
                  <View
                    style={[
                      styles.stopNumber,
                      { backgroundColor: getStopStatusColor(stop.status) },
                    ]}
                  >
                    <Text style={styles.stopNumberText}>{index + 1}</Text>
                  </View>
                  {index < trackingData.route.length - 1 && (
                    <View
                      style={[
                        styles.routeLine,
                        {
                          backgroundColor:
                            stop.status === "completed"
                              ? COLORS.success
                              : COLORS.textLight,
                        },
                      ]}
                    />
                  )}
                </View>

                <View style={styles.stopInfo}>
                  <View style={styles.stopHeader}>
                    <Text
                      style={[
                        styles.stopCustomer,
                        stop.isCurrentUser && styles.currentUserText,
                      ]}
                    >
                      {stop.customer} {stop.isCurrentUser && "(You)"}
                    </Text>
                    <View style={styles.stopStatusContainer}>
                      <Text style={styles.stopStatusIcon}>
                        {getStopStatusIcon(stop.status)}
                      </Text>
                      <Text
                        style={[
                          styles.stopStatusText,
                          { color: getStopStatusColor(stop.status) },
                        ]}
                      >
                        {stop.status.charAt(0).toUpperCase() +
                          stop.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.stopAddress}>{stop.address}</Text>

                  <View style={styles.stopMeta}>
                    {stop.status === "completed" && stop.completedAt && (
                      <Text style={styles.stopTime}>
                        ✅ Completed at {formatTime(stop.completedAt)}
                      </Text>
                    )}
                    {stop.status === "in-progress" && stop.startedAt && (
                      <Text style={styles.stopTime}>
                        🔄 Started at {formatTime(stop.startedAt)}
                      </Text>
                    )}
                    {stop.status === "upcoming" && stop.estimatedTime && (
                      <Text style={styles.stopTime}>
                        ⏳ Estimated: {stop.estimatedTime}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Notifications */}
        <View style={styles.notificationsCard}>
          <Text style={styles.sectionTitle}>Recent Updates</Text>
          <View style={styles.notificationsList}>
            {notifications.map((notification) => (
              <View
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.unreadNotification,
                ]}
              >
                <View style={styles.notificationIcon}>
                  <Text style={styles.notificationIconText}>
                    {getNotificationIcon(notification.type)}
                  </Text>
                </View>
                <View style={styles.notificationContent}>
                  <Text
                    style={[
                      styles.notificationMessage,
                      !notification.read && styles.unreadMessage,
                    ]}
                  >
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {getRelativeTime(notification.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Map Placeholder */}
        <View style={styles.mapCard}>
          <Text style={styles.sectionTitle}>Live Map</Text>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>🗺️</Text>
            <Text style={styles.mapPlaceholderSubtext}>
              Interactive map with real-time driver location
            </Text>
            <Text style={styles.mapPlaceholderNote}>
              (Map integration coming soon)
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: COLORS.info,
                alignSelf: "center",
                marginTop: SIZES.medium,
              },
            ]}
            onPress={() =>
              Alert.alert("Map View", "Full map view coming soon!")
            }
          >
            <Text style={styles.actionButtonText}>View Full Map</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <CustomButton
              title="Stop Tracking"
              onPress={() => {
                setIsTracking(false);
                Alert.alert(
                  "Tracking Stopped",
                  "You will no longer receive location updates."
                );
              }}
              style={[
                styles.quickActionButton,
                { backgroundColor: COLORS.error },
              ]}
            />
            <CustomButton
              title="Share Location"
              onPress={() =>
                Alert.alert(
                  "Share Location",
                  "Location sharing feature coming soon!"
                )
              }
              style={[
                styles.quickActionButton,
                { backgroundColor: COLORS.info },
              ]}
            />
          </View>
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
  driverCard: {
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
  driverHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.medium,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SIZES.medium,
  },
  driverInitials: {
    color: COLORS.surface,
    fontSize: SIZES.fontLarge,
    fontWeight: "bold",
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: SIZES.fontLarge,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  driverVehicle: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  licensePlate: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  driverMeta: {
    flexDirection: "row",
    gap: SIZES.medium,
  },
  driverRating: {
    fontSize: SIZES.fontSmall,
    color: COLORS.warning,
    fontWeight: "500",
  },
  driverCollections: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textLight,
  },
  statusIndicator: {
    paddingHorizontal: SIZES.small,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSmall,
  },
  statusText: {
    color: COLORS.surface,
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  driverActions: {
    flexDirection: "row",
    gap: SIZES.medium,
  },
  driverActionButton: {
    flex: 1,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.radiusMedium,
    alignItems: "center",
  },
  driverActionText: {
    color: COLORS.surface,
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
  },
  statusCard: {
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
  sectionTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.medium,
  },
  statusInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.large,
  },
  statusItem: {
    alignItems: "center",
  },
  statusLabel: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: SIZES.fontLarge,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  progressContainer: {
    marginBottom: SIZES.medium,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.small,
  },
  progressLabel: {
    fontSize: SIZES.fontMedium,
    fontWeight: "500",
    color: COLORS.text,
  },
  progressText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  lastUpdate: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textLight,
    textAlign: "center",
    fontStyle: "italic",
  },
  collectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    marginBottom: SIZES.large,
    borderWidth: 2,
    borderColor: COLORS.primary + "30",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  collectionInfo: {
    marginBottom: SIZES.medium,
  },
  collectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SIZES.small,
  },
  collectionLabel: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  collectionValue: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusIcon: {
    fontSize: 14,
  },
  statusBadgeText: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
  },
  collectionActions: {
    flexDirection: "row",
    gap: SIZES.medium,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.radiusMedium,
    alignItems: "center",
  },
  actionButtonText: {
    color: COLORS.surface,
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
  },
  routeCard: {
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
  routeList: {
    gap: SIZES.medium,
  },
  routeStop: {
    flexDirection: "row",
    paddingVertical: SIZES.small,
  },
  currentUserStop: {
    backgroundColor: COLORS.primary + "10",
    borderRadius: SIZES.radiusSmall,
    paddingHorizontal: SIZES.medium,
    marginHorizontal: -SIZES.medium,
  },
  stopIndicator: {
    alignItems: "center",
    marginRight: SIZES.medium,
  },
  stopNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  stopNumberText: {
    color: COLORS.surface,
    fontSize: SIZES.fontSmall,
    fontWeight: "bold",
  },
  routeLine: {
    width: 2,
    height: 30,
    marginTop: 4,
  },
  stopInfo: {
    flex: 1,
  },
  stopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  stopCustomer: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  currentUserText: {
    color: COLORS.primary,
  },
  stopStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stopStatusIcon: {
    fontSize: 12,
  },
  stopStatusText: {
    fontSize: SIZES.fontSmall,
    fontWeight: "500",
  },
  stopAddress: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  stopMeta: {
    marginTop: 4,
  },
  stopTime: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textLight,
  },
  notificationsCard: {
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
  notificationsList: {
    gap: SIZES.medium,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: SIZES.small,
  },
  unreadNotification: {
    backgroundColor: COLORS.info + "10",
    borderRadius: SIZES.radiusSmall,
    paddingHorizontal: SIZES.medium,
    marginHorizontal: -SIZES.medium,
  },
  notificationIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SIZES.medium,
  },
  notificationIconText: {
    fontSize: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    marginBottom: 4,
  },
  unreadMessage: {
    fontWeight: "600",
  },
  notificationTime: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textLight,
  },
  mapCard: {
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
  mapPlaceholder: {
    height: 200,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMedium,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.textLight,
    borderStyle: "dashed",
  },
  mapPlaceholderText: {
    fontSize: 48,
    marginBottom: SIZES.small,
  },
  mapPlaceholderSubtext: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 4,
  },
  mapPlaceholderNote: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textLight,
    fontStyle: "italic",
  },
  quickActionsCard: {
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
  quickActions: {
    gap: SIZES.medium,
  },
  quickActionButton: {
    marginBottom: 0,
  },
});
