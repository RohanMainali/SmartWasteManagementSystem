import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS, SIZES } from '../utils/theme';
import BaatoWebMapView from './BaatoWebMapView';
import apiService from '../services/apiService';

const DriverLiveTracking = ({
  collections = [],
  currentCollection,
  onLocationUpdate,
  onCollectionStatusChange,
  style,
}) => {
  const [driverLocation, setDriverLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [route, setRoute] = useState([]);
  const [navigationMode, setNavigationMode] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [distance, setDistance] = useState(null);
  const watchRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (isTracking) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }

    return () => stopLocationTracking();
  }, [isTracking]);

  useEffect(() => {
    // Auto-start tracking if there's a current collection
    if (currentCollection && currentCollection.status === 'in-progress') {
      setIsTracking(true);
    }
  }, [currentCollection]);

  const startLocationTracking = async () => {
    if (watchRef.current) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission Required', 'Please enable location permissions for tracking.');
        return;
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 5, // Update every 5 meters
        },
        (location) => {
          const { latitude, longitude, accuracy, heading, speed } = location.coords;
          const newLocation = {
            latitude,
            longitude,
            accuracy: accuracy || 10,
            heading: heading || 0,
            speed: speed || 0,
            timestamp: new Date().toISOString(),
          };

          setDriverLocation(newLocation);
          
          // Update route trail
          setRoute(prev => [...prev.slice(-50), newLocation]); // Keep last 50 points

          // Send location to backend
          updateLocationOnServer(newLocation);

          // Calculate distance and time to destination
          if (currentCollection && navigationMode) {
            calculateRouteMetrics(newLocation, currentCollection.address);
          }

          // Callback for parent component
          if (onLocationUpdate) {
            onLocationUpdate(newLocation);
          }
        }
      );
    } catch (error) {
      console.error('Location tracking error:', error);
      Alert.alert('Location Error', 'Unable to track location. Please check GPS settings.');
    }
  };

  const stopLocationTracking = () => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  };

  const updateLocationOnServer = async (location) => {
    try {
      await apiService.updateDriverLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed,
        currentCollection: currentCollection?.id,
        status: 'active',
      });
    } catch (error) {
      console.error('Error updating location on server:', error);
    }
  };

  const calculateRouteMetrics = async (from, to) => {
    try {
      // Use Baato Route API for Nepal
      const response = await fetch(
        `https://api.baato.io/api/v1/directions?points=${from.latitude},${from.longitude};${to.coordinates.latitude},${to.coordinates.longitude}&key=bpk.vg8OVAqY3GX0KzTUc5QbBLdwkCdgRMB8oVx1fO8whN6j&mode=car`
      );
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const routeData = data.data[0];
        setDistance(routeData.distanceText);
        setEstimatedTime(routeData.timeText);

        // Update route on map
        if (routeData.geometry) {
          const routeCoordinates = decodePolyline(routeData.geometry);
          setRoute(routeCoordinates);
        }
      }
    } catch (error) {
      console.error('Route calculation error:', error);
    }
  };

  const decodePolyline = (encoded) => {
    // Simple polyline decoder for route coordinates
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat * 1e-5,
        longitude: lng * 1e-5,
      });
    }

    return points;
  };

  const startNavigation = (collection) => {
    setNavigationMode(true);
    setIsTracking(true);
    
    if (driverLocation) {
      calculateRouteMetrics(driverLocation, collection.address);
    }

    // Center map on route
    if (mapRef.current) {
      mapRef.current.fitToCoordinates([
        driverLocation,
        collection.address.coordinates,
      ], {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const stopNavigation = () => {
    setNavigationMode(false);
    setRoute([]);
    setEstimatedTime(null);
    setDistance(null);
  };

  const startCollection = async (collection) => {
    try {
      await apiService.startCollection(collection.id);
      
      if (onCollectionStatusChange) {
        onCollectionStatusChange(collection.id, 'in-progress');
      }
      
      Alert.alert('Collection Started', `Started collection at ${collection.address.street}`);
      setIsTracking(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to start collection');
    }
  };

  const completeCollection = async (collection) => {
    try {
      await apiService.completeCollection(collection.id);
      
      if (onCollectionStatusChange) {
        onCollectionStatusChange(collection.id, 'completed');
      }
      
      Alert.alert('Collection Completed', `Completed collection at ${collection.address.street}`);
      stopNavigation();
    } catch (error) {
      Alert.alert('Error', 'Failed to complete collection');
    }
  };

  // Create markers for all collections
  const markers = collections.map((collection, index) => ({
    id: collection.id,
    latitude: collection.address.coordinates.latitude,
    longitude: collection.address.coordinates.longitude,
    title: collection.customer.name,
    description: `${collection.address.street}, ${collection.wasteTypes.map(w => w.category).join(', ')}`,
    color: collection.status === 'completed' ? COLORS.success : 
           collection.status === 'in-progress' ? COLORS.warning : COLORS.primary,
    onPress: () => {
      Alert.alert(
        collection.customer.name,
        `Address: ${collection.address.street}\nWaste: ${collection.wasteTypes.map(w => w.category).join(', ')}\nStatus: ${collection.status}`,
        [
          { text: 'Navigate', onPress: () => startNavigation(collection) },
          collection.status === 'assigned' ? 
            { text: 'Start Collection', onPress: () => startCollection(collection) } :
          collection.status === 'in-progress' ?
            { text: 'Complete Collection', onPress: () => completeCollection(collection) } : null,
          { text: 'Cancel', style: 'cancel' },
        ].filter(Boolean)
      );
    },
  }));

  // Add driver location marker
  if (driverLocation) {
    markers.push({
      id: 'driver',
      latitude: driverLocation.latitude,
      longitude: driverLocation.longitude,
      title: 'Your Location',
      description: 'Driver Location',
      color: COLORS.info,
    });
  }

  return (
    <View style={[styles.container, style]}>
      {/* Map View */}
      <BaatoWebMapView
        ref={mapRef}
        initialRegion={{
          latitude: 27.7172,
          longitude: 85.3240,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        markers={markers}
        route={route}
        showUserLocation={true}
        style={styles.map}
      >
        {/* Tracking Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[
              styles.trackingButton,
              { backgroundColor: isTracking ? COLORS.error : COLORS.success }
            ]}
            onPress={() => setIsTracking(!isTracking)}
          >
            <Text style={styles.trackingButtonText}>
              {isTracking ? '⏸️ Stop' : '▶️ Start'} Tracking
            </Text>
          </TouchableOpacity>

          {navigationMode && (
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: COLORS.warning }]}
              onPress={stopNavigation}
            >
              <Text style={styles.controlButtonText}>🛑 Stop Navigation</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation Info */}
        {navigationMode && (estimatedTime || distance) && (
          <View style={styles.navigationInfo}>
            <Text style={styles.navigationTitle}>🧭 Navigation</Text>
            {distance && (
              <Text style={styles.navigationText}>📏 Distance: {distance}</Text>
            )}
            {estimatedTime && (
              <Text style={styles.navigationText}>⏱️ ETA: {estimatedTime}</Text>
            )}
          </View>
        )}

        {/* Location Status */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isTracking ? COLORS.success : COLORS.error }
          ]} />
          <Text style={styles.statusText}>
            {isTracking ? 'Live Tracking' : 'Tracking Stopped'}
          </Text>
          {driverLocation && (
            <Text style={styles.statusDetails}>
              📍 {driverLocation.latitude.toFixed(6)}, {driverLocation.longitude.toFixed(6)}
            </Text>
          )}
        </View>
      </BaatoWebMapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: SIZES.large,
    left: SIZES.large,
    right: SIZES.large,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trackingButton: {
    flex: 1,
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    borderRadius: SIZES.radiusMedium,
    marginRight: SIZES.small,
  },
  trackingButtonText: {
    color: COLORS.surface,
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    textAlign: 'center',
  },
  controlButton: {
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    borderRadius: SIZES.radiusMedium,
  },
  controlButtonText: {
    color: COLORS.surface,
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
  },
  navigationInfo: {
    position: 'absolute',
    top: SIZES.large,
    left: SIZES.large,
    backgroundColor: COLORS.surface + 'F0',
    padding: SIZES.medium,
    borderRadius: SIZES.radiusMedium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  navigationTitle: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  navigationText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  statusContainer: {
    position: 'absolute',
    top: SIZES.large,
    right: SIZES.large,
    backgroundColor: COLORS.surface + 'F0',
    padding: SIZES.small,
    borderRadius: SIZES.radiusSmall,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusDetails: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
});

export default DriverLiveTracking;
