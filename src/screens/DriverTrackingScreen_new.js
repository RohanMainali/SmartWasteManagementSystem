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
      webSocketService.disconnect();
    };
  }, []);

  const setupWebSocket = () => {
    try {
      webSocketService.connect();
      
      webSocketService.on('driverLocationUpdate', (data) => {
        setTrackingData(prev => prev ? {
          ...prev,
          driverLocation: data.location,
          lastUpdate: data.timestamp
        } : null);
      });

      webSocketService.on('collectionStatusUpdate', (data) => {
        setTrackingData(prev => prev ? {
          ...prev,
          collection: { ...prev.collection, status: data.status }
        } : null);
      });
    } catch (error) {
      console.error('WebSocket setup error:', error);
    }
  };

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const activeTracking = await apiService.getActiveCollectionTracking();
      setTrackingData(activeTracking);
    } catch (error) {
      console.error('Failed to load tracking data:', error);
      setError(error.message || 'Failed to load tracking information');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadTrackingData();
    setRefreshing(false);
  }, []);

  const handleCallDriver = () => {
    if (!trackingData?.driver?.phone) {
      Alert.alert('Error', 'Driver phone number not available');
      return;
    }

    Alert.alert(
      'Call Driver',
      `Call ${trackingData.driver.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${trackingData.driver.phone}`);
          },
        },
      ]
    );
  };

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
