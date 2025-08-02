import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS, SIZES } from '../utils/theme';

const LocationPicker = ({
  onLocationSelect,
  initialLocation,
  placeholder = "Search for location in Nepal...",
  style,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef(null);

  const searchLocations = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await BaatoMapView.searchLocation(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    
    // Debounce search
    clearTimeout(searchTimeout);
    const searchTimeout = setTimeout(() => {
      searchLocations(text);
    }, 500);
  };

  const selectLocation = (location) => {
    setSelectedLocation(location);
    setSearchQuery(location.address);
    setSearchResults([]);
    
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const handleMapLocationSelect = (location) => {
    // Reverse geocode to get address
    reverseGeocode(location.latitude, location.longitude);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.baato.io/api/v1/reverse?lat=${lat}&lng=${lng}&key=bpk.vg8OVAqY3GX0KzTUc5QbBLdwkCdgRMB8oVx1fO8whN6j`
      );
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const address = data.data[0].name;
        const location = {
          latitude: lat,
          longitude: lng,
          address: address,
        };
        selectLocation(location);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
      // Fallback to coordinates
      const location = {
        latitude: lat,
        longitude: lng,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      };
      selectLocation(location);
    }
  };

  const predefinedLocations = [
    { address: 'Kathmandu Durbar Square', latitude: 27.7045, longitude: 85.3077 },
    { address: 'Thamel, Kathmandu', latitude: 27.7172, longitude: 85.3240 },
    { address: 'Patan Durbar Square', latitude: 27.6728, longitude: 85.3269 },
    { address: 'Bhaktapur Durbar Square', latitude: 27.6710, longitude: 85.4298 },
    { address: 'Pokhara Lakeside', latitude: 28.2096, longitude: 83.9856 },
    { address: 'Chitwan National Park', latitude: 27.5291, longitude: 84.3542 },
  ];

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          value={searchQuery}
          onChangeText={handleSearchChange}
          onFocus={() => setShowMap(false)}
        />
        
        <TouchableOpacity
          style={styles.mapToggleButton}
          onPress={() => setShowMap(!showMap)}
        >
          <Text style={styles.mapToggleText}>
            {showMap ? '📝' : '🗺️'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && !showMap && (
        <ScrollView style={styles.resultsContainer} keyboardShouldPersistTaps="handled">
          {searchResults.map((result, index) => (
            <TouchableOpacity
              key={index}
              style={styles.resultItem}
              onPress={() => selectLocation(result)}
            >
              <Text style={styles.resultAddress}>{result.address}</Text>
              <Text style={styles.resultCoords}>
                {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Predefined Locations */}
      {!showMap && searchQuery === '' && (
        <ScrollView style={styles.predefinedContainer}>
          <Text style={styles.predefinedTitle}>Popular Locations in Nepal</Text>
          {predefinedLocations.map((location, index) => (
            <TouchableOpacity
              key={index}
              style={styles.predefinedItem}
              onPress={() => selectLocation(location)}
            >
              <Text style={styles.predefinedAddress}>{location.address}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Map View */}
      {showMap && (
        <View style={styles.mapContainer}>
          <BaatoMapView
            ref={mapRef}
            initialRegion={selectedLocation || {
              latitude: 27.7172,
              longitude: 85.3240,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            onLocationSelect={handleMapLocationSelect}
            markers={selectedLocation ? [{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
              title: selectedLocation.address,
              color: COLORS.primary,
            }] : []}
            style={styles.map}
          />
          
          <View style={styles.mapInstructions}>
            <Text style={styles.instructionsText}>
              Tap on the map to select a location
            </Text>
          </View>
        </View>
      )}

      {/* Selected Location Display */}
      {selectedLocation && (
        <View style={styles.selectedLocationContainer}>
          <Text style={styles.selectedLocationTitle}>Selected Location:</Text>
          <Text style={styles.selectedLocationAddress}>
            {selectedLocation.address}
          </Text>
          <Text style={styles.selectedLocationCoords}>
            📍 {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.medium,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMedium,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    fontSize: SIZES.fontMedium,
    backgroundColor: COLORS.surface,
  },
  mapToggleButton: {
    marginLeft: SIZES.small,
    backgroundColor: COLORS.primary,
    padding: SIZES.small,
    borderRadius: SIZES.radiusSmall,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapToggleText: {
    fontSize: 18,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.medium,
  },
  loadingText: {
    marginLeft: SIZES.small,
    color: COLORS.textSecondary,
  },
  resultsContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMedium,
    backgroundColor: COLORS.surface,
  },
  resultItem: {
    padding: SIZES.medium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultAddress: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
  },
  resultCoords: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  predefinedContainer: {
    maxHeight: 300,
  },
  predefinedTitle: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  predefinedItem: {
    padding: SIZES.medium,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusSmall,
    marginBottom: SIZES.small,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  predefinedAddress: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
  },
  mapContainer: {
    flex: 1,
    minHeight: 300,
  },
  map: {
    flex: 1,
  },
  mapInstructions: {
    position: 'absolute',
    top: SIZES.large,
    left: SIZES.large,
    right: SIZES.large,
    backgroundColor: COLORS.surface + 'E6',
    padding: SIZES.small,
    borderRadius: SIZES.radiusSmall,
  },
  instructionsText: {
    textAlign: 'center',
    fontSize: SIZES.fontSmall,
    color: COLORS.text,
  },
  selectedLocationContainer: {
    backgroundColor: COLORS.primary + '20',
    padding: SIZES.medium,
    borderRadius: SIZES.radiusMedium,
    marginTop: SIZES.medium,
  },
  selectedLocationTitle: {
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  selectedLocationAddress: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
  },
  selectedLocationCoords: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default LocationPicker;
