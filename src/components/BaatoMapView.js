import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS, SIZES } from '../utils/theme';

const BAATO_API_KEY = 'bpk.vg8OVAqY3GX0KzTUc5QbBLdwkCdgRMB8oVx1fO8whN6j';

// Nepal bounds for map constraints
const NEPAL_BOUNDS = {
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Kathmandu center as default
const KATHMANDU_CENTER = {
  latitude: 27.7172,
  longitude: 85.3240,
  ...NEPAL_BOUNDS,
};

const BaatoMapView = ({
  initialRegion = KATHMANDU_CENTER,
  markers = [],
  route = [],
  showUserLocation = true,
  onLocationSelect,
  onMapReady,
  style,
  children,
  customMapStyle,
}) => {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(initialRegion);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setPermissionGranted(true);
        getCurrentLocation();
      } else {
        setPermissionGranted(false);
        setLoading(false);
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to use map features.'
        );
      }
    } catch (err) {
      console.warn('Permission error:', err);
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude, longitude } = location.coords;
      const currentLocation = {
        latitude,
        longitude,
        ...NEPAL_BOUNDS,
      };
      
      setUserLocation({ latitude, longitude });
      
      // If user is in Nepal, center on their location
      if (isLocationInNepal(latitude, longitude)) {
        setRegion(currentLocation);
      }
      
      setLoading(false);
      
      if (onMapReady) {
        onMapReady(currentLocation);
      }
    } catch (error) {
      console.error('Location error:', error);
      setLoading(false);
      
      // Fallback to Nepal center
      const fallbackLocation = {
        latitude: NEPAL_CENTER.latitude,
        longitude: NEPAL_CENTER.longitude,
        ...NEPAL_BOUNDS,
      };
      setRegion(fallbackLocation);
      
      if (onMapReady) {
        onMapReady(fallbackLocation);
      }
    }
  };

  const isLocationInNepal = (lat, lng) => {
    // Nepal approximate bounds
    return lat >= 26.3 && lat <= 30.5 && lng >= 80.0 && lng <= 88.3;
  };

  const handleMapPress = (event) => {
    if (onLocationSelect) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      onLocationSelect({ latitude, longitude });
    }
  };

  const centerOnUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        ...NEPAL_BOUNDS,
      }, 1000);
    } else {
      getCurrentLocation();
    }
  };

  const searchLocation = async (query) => {
    try {
      // Use Baato Geocoding API for Nepal locations
      const response = await fetch(
        `https://api.baato.io/api/v1/search?q=${encodeURIComponent(query)}&key=${BAATO_API_KEY}&limit=5`
      );
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const location = data.data[0];
        const newRegion = {
          latitude: location.centroid.lat,
          longitude: location.centroid.lng,
          ...NEPAL_BOUNDS,
        };
        
        setRegion(newRegion);
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
        
        return {
          latitude: location.centroid.lat,
          longitude: location.centroid.lng,
          address: location.name,
        };
      }
      
      throw new Error('Location not found');
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Could not find the specified location in Nepal.');
      return null;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={styles.errorText}>Location permission is required</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestLocationPermission}>
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
        showsUserLocation={showUserLocation && permissionGranted}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        customMapStyle={customMapStyle}
        mapType="standard"
      >
        {/* Custom markers */}
        {markers.map((marker, index) => (
          <Marker
            key={marker.id || index}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title}
            description={marker.description}
            pinColor={marker.color || COLORS.primary}
            onPress={marker.onPress}
          >
            {marker.customMarker}
          </Marker>
        ))}

        {/* Route polyline */}
        {route.length > 1 && (
          <Polyline
            coordinates={route}
            strokeColor={COLORS.primary}
            strokeWidth={4}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      {/* Location button */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={centerOnUserLocation}
      >
        <Text style={styles.locationButtonText}>📍</Text>
      </TouchableOpacity>

      {children}
    </View>
  );
};

// Expose search function for external use
BaatoMapView.searchLocation = async (query) => {
  try {
    const response = await fetch(
      `https://api.baato.io/api/v1/search?q=${encodeURIComponent(query)}&key=${BAATO_API_KEY}&limit=5`
    );
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return data.data.map(location => ({
        latitude: location.centroid.lat,
        longitude: location.centroid.lng,
        address: location.name,
        placeId: location.placeId,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.medium,
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.large,
  },
  errorText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SIZES.large,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.radiusMedium,
  },
  retryButtonText: {
    color: COLORS.surface,
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
  },
  locationButton: {
    position: 'absolute',
    top: SIZES.large,
    right: SIZES.large,
    backgroundColor: COLORS.surface,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  locationButtonText: {
    fontSize: 20,
  },
});

export default BaatoMapView;
