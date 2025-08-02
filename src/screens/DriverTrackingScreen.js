import React, { useState, useEffect, useRef } from "react";
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
import * as Location from 'expo-location';
import { COLORS, SIZES } from "../utils/theme";
import CustomButton from "../components/CustomButton";
import { formatTime, getRelativeTime } from "../utils/helpers";
import apiService from "../services/apiService";
import webSocketService from "../services/webSocketService";

// Customer Live Map Component for tracking driver
const CustomerLiveMap = ({ driverLocation, driver, vehicle, collectionStatus }) => {
  const [customerLocation, setCustomerLocation] = useState(null);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMapError('Location permission required for live tracking');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCustomerLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      setMapError('Unable to get your location');
      console.error('Location error:', error);
    }
  };

  const openDirections = () => {
    if (driverLocation) {
      const driverLat = driverLocation.latitude;
      const driverLng = driverLocation.longitude;
      
      // Open in Apple Maps (iOS) or Google Maps (Android)
      const url = `https://maps.apple.com/?q=${driverLat},${driverLng}&ll=${driverLat},${driverLng}`;
      const googleUrl = `https://maps.google.com/?q=${driverLat},${driverLng}`;
      
      Alert.alert(
        'View Driver Location',
        'Choose how to view the driver location:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Apple Maps', 
            onPress: () => Linking.openURL(url).catch(() => Linking.openURL(googleUrl))
          },
          { 
            text: 'Google Maps', 
            onPress: () => Linking.openURL(googleUrl)
          }
        ]
      );
    }
  };

  const openRoute = () => {
    if (driverLocation && customerLocation) {
      // Create route from driver to customer
      const routeUrl = `https://maps.google.com/maps/dir/${driverLocation.latitude},${driverLocation.longitude}/${customerLocation.latitude},${customerLocation.longitude}`;
      Linking.openURL(routeUrl);
    }
  };

  const getStatusIcon = () => {
    switch (collectionStatus) {
      case 'assigned': return '🚛';
      case 'in-progress':
      case 'in_progress': return '🟢';
      case 'completed': return '✅';
      default: return '📍';
    }
  };

  return (
    <View style={styles.customerMapContainer}>
      {/* Map Visual Representation */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>Live Tracking Map</Text>
          <Text style={styles.mapSubtitle}>
            <Text>{getStatusIcon()}</Text> Driver: {driver?.name || 'Unknown'}
          </Text>
        </View>

        {/* Map Content */}
        <View style={styles.mapContent}>
          {mapError ? (
            <View style={styles.mapErrorContainer}>
              <Text style={styles.mapErrorText}>⚠️ {mapError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mapVisualization}>
              {/* Customer Location */}
              <View style={styles.locationPin}>
                <Text style={styles.locationEmoji}>🏠</Text>
                <Text style={styles.locationLabel}>Your Location</Text>
                {customerLocation && customerLocation.latitude && customerLocation.longitude && (
                  <Text style={styles.coordinates}>
                    {customerLocation.latitude.toFixed(4)}, {customerLocation.longitude.toFixed(4)}
                  </Text>
                )}
              </View>

              {/* Distance Line */}
              <View style={styles.routeLine}>
                <Text style={styles.routeText}>
                  {driverLocation?.distance && typeof driverLocation.distance === 'number'
                    ? `${driverLocation.distance.toFixed(1)} km`
                    : 'Calculating distance...'}
                </Text>
              </View>

              {/* Driver Location */}
              <View style={styles.locationPin}>
                <Text style={styles.locationEmoji}>🚛</Text>
                <Text style={styles.locationLabel}>Driver Location</Text>
                {driverLocation && driverLocation.latitude && driverLocation.longitude && (
                  <Text style={styles.coordinates}>
                    {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
                  </Text>
                )}
                <Text style={styles.etaText}>
                  ETA: {driverLocation?.estimatedArrival || driverLocation?.eta || 'Calculating...'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Map Actions */}
        <View style={styles.mapActions}>
          <TouchableOpacity style={styles.mapActionButton} onPress={openDirections}>
            <Text style={styles.mapActionText}>📍 View Driver</Text>
          </TouchableOpacity>
          
          {customerLocation && (
            <TouchableOpacity style={styles.mapActionButton} onPress={openRoute}>
              <Text style={styles.mapActionText}>🗺️ Show Route</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.mapActionButton} onPress={getCurrentLocation}>
            <Text style={styles.mapActionText}>📍 My Location</Text>
          </TouchableOpacity>
        </View>

        {/* Real-time Status */}
        <View style={styles.realTimeStatus}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Live tracking active</Text>
          <Text style={styles.updateTime}>
            Updated {getRelativeTime(new Date())}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function DriverTrackingScreen({ navigation }) {
  const mapRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTrackingData();
    setupWebSocket();

    return () => {
      // webSocketService.disconnect(); // Disabled temporarily
    };
  }, []);

  const setupWebSocket = () => {
    // TODO: WebSocket integration for real-time updates
    // Temporarily disabled to prevent connection errors
    console.log('WebSocket setup deferred - will implement with Socket.IO');
    
    /* 
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
    */
  };

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Loading tracking data...');
      const activeTracking = await apiService.getActiveCollectionTracking();
      console.log('📦 Received tracking data:', activeTracking ? 'YES' : 'NO');
      if (activeTracking) {
        console.log('📊 Raw tracking data keys:', Object.keys(activeTracking));
        console.log('📊 Tracking data structure:', {
          hasCollection: !!activeTracking.collection,
          hasDriver: !!activeTracking.driver,
          hasDriverLocation: !!activeTracking.driverLocation,
          scheduledTime: activeTracking.collection?.requestedDate,
          driverName: activeTracking.driver?.name,
          status: activeTracking.status,
          trackingActive: activeTracking.trackingActive
        });
      }
      setTrackingData(activeTracking);
    } catch (error) {
      console.error('Failed to load tracking data:', error);
      
      // If API fails (like 404 for no active collection), don't set it as an error
      // Let the UI handle the "no data" state gracefully
      if (error.message && error.message.includes('No active collection')) {
        setTrackingData(null);
        setError(null); // Don't treat this as an error
      } else {
        setError(error.message || 'Failed to load tracking information');
      }
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
      case 'scheduled':
        return '#8B5CF6'; // Purple for scheduled
      case 'assigned':
        return '#3B82F6';
      case 'in-progress':
      case 'in_progress':
        return '#10B981';
      case 'en-route':
      case 'on-the-way':
        return '#F59E0B'; // Orange for en route
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
      case 'scheduled':
        return 'Scheduled';
      case 'assigned':
        return 'Driver Assigned';
      case 'in-progress':
      case 'in_progress':
        return 'Collection in Progress';
      case 'en-route':
      case 'on-the-way':
        return 'Driver En Route';
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

  if (error) {
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
          <Text style={styles.errorTitle}>Error Loading Tracking</Text>
          <Text style={styles.errorMessage}>
            {error}
          </Text>
          <CustomButton
            title="Try Again"
            onPress={() => loadTrackingData()}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!trackingData) {
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
            You don't have any active waste collections to track at the moment. Schedule a pickup from your home in Kathmandu, Pokhara, or other locations across Nepal.
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
          <CustomButton
            title="🧪 Test with Sample Data"
            onPress={() => {
              // Set sample Nepal tracking data for testing
              setTrackingData({
                collection: {
                  requestId: 'WC-KTM-001',
                  status: 'in_progress',
                  requestedDate: new Date().toISOString(),
                  wasteTypes: [
                    { category: 'Organic' },
                    { category: 'Recyclable' }
                  ]
                },
                driver: {
                  name: 'Ram Bahadur Thapa',
                  phone: '+977-9851234567'
                },
                vehicle: {
                  model: 'Tata Ace',
                  licensePlate: 'बा १ च ५४३२'
                },
                driverLocation: {
                  latitude: 27.7172,
                  longitude: 85.3240,
                  distance: 2.3,
                  estimatedArrival: '15 minutes'
                },
                lastUpdate: new Date().toISOString()
              });
              setError(null);
              Alert.alert('Test Data Loaded', 'Sample tracking data from Kathmandu loaded for testing.');
            }}
            variant="outline"
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
            <Text style={styles.trackingTitle}>
              {trackingData.status === 'scheduled' ? '� Scheduled Pickup' : '�📍 Live Location'}
            </Text>
            <Text style={styles.lastUpdate}>
              Last update: {trackingData.lastUpdate 
                ? getRelativeTime(new Date(trackingData.lastUpdate))
                : 'Never'}
            </Text>
          </View>
          
          {trackingData.driverLocation ? (
            <View style={styles.locationDetails}>
              {trackingData.status === 'scheduled' ? (
                // Show scheduled pickup information
                <>
                  <View style={styles.locationRow}>
                    <Text style={styles.locationLabel}>Pickup Date:</Text>
                    <Text style={styles.locationValue}>
                      August 4th, 2025
                    </Text>
                  </View>
                  
                  <View style={styles.locationRow}>
                    <Text style={styles.locationLabel}>Pickup Time:</Text>
                    <Text style={styles.locationValue}>
                      {trackingData.driverLocation.estimatedArrival || '8:45 AM'}
                    </Text>
                  </View>
                  
                  <View style={styles.locationRow}>
                    <Text style={styles.locationLabel}>Status:</Text>
                    <Text style={[styles.locationValue, { color: '#8B5CF6' }]}>
                      🟣 Scheduled
                    </Text>
                  </View>

                  <View style={styles.locationRow}>
                    <Text style={styles.locationLabel}>Driver Location:</Text>
                    <Text style={styles.locationValue}>
                      At depot (will depart on pickup day)
                    </Text>
                  </View>
                </>
              ) : (
                // Show live tracking information
                <>
                  <View style={styles.locationRow}>
                    <Text style={styles.locationLabel}>Distance:</Text>
                    <Text style={styles.locationValue}>
                      {trackingData.driverLocation.distance && typeof trackingData.driverLocation.distance === 'number'
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
                </>
              )}

              {/* Customer Live Map - only show for active tracking */}
              {trackingData.status !== 'scheduled' && (
                <View style={styles.mapContainer}>
                  <CustomerLiveMap 
                    driverLocation={trackingData.driverLocation}
                    driver={trackingData.driver}
                    vehicle={trackingData.vehicle}
                    collectionStatus={trackingData.collection?.status}
                  />
                </View>
              )}
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
  mapContainer: {
    marginTop: SIZES.medium,
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    height: 200,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  fullMapButton: {
    position: 'absolute',
    top: SIZES.small,
    right: SIZES.small,
    backgroundColor: COLORS.surface + 'F0',
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radiusSmall,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  fullMapButtonText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.text,
    fontWeight: '600',
  },
  // Customer Live Map Styles
  customerMapContainer: {
    flex: 1,
  },
  mapPlaceholder: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    minHeight: 300,
  },
  mapHeader: {
    backgroundColor: COLORS.primary,
    padding: SIZES.medium,
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  mapSubtitle: {
    fontSize: SIZES.fontMedium,
    color: 'white',
    opacity: 0.9,
  },
  mapContent: {
    flex: 1,
    padding: SIZES.medium,
  },
  mapErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.large,
  },
  mapErrorText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SIZES.medium,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radiusSmall,
  },
  retryButtonText: {
    color: 'white',
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
  },
  mapVisualization: {
    alignItems: 'center',
    paddingVertical: SIZES.medium,
  },
  locationPin: {
    alignItems: 'center',
    marginVertical: SIZES.medium,
    padding: SIZES.medium,
    backgroundColor: 'white',
    borderRadius: SIZES.radiusMedium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 200,
  },
  locationEmoji: {
    fontSize: 32,
    marginBottom: SIZES.small,
  },
  locationLabel: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  coordinates: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  etaText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  routeLine: {
    alignItems: 'center',
    paddingVertical: SIZES.small,
  },
  routeText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.primary,
    fontWeight: '600',
    backgroundColor: 'white',
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  mapActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SIZES.medium,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: 'white',
  },
  mapActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SIZES.small,
    marginHorizontal: 4,
  },
  mapActionText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  realTimeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.small,
    backgroundColor: COLORS.success + '20',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: SIZES.small,
  },
  statusText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.success,
    fontWeight: '600',
    marginRight: SIZES.small,
  },
  updateTime: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
});
