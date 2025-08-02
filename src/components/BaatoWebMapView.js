import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

// Nepal map bounds and center
const NEPAL_BOUNDS = {
  north: 30.5,
  south: 26.3,
  east: 88.3,
  west: 80.0,
};

const NEPAL_CENTER = {
  latitude: 27.7172,
  longitude: 85.3240,
};

const BaatoWebMapView = forwardRef(({
  initialRegion = {
    latitude: NEPAL_CENTER.latitude,
    longitude: NEPAL_CENTER.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  markers = [],
  route = [],
  showUserLocation = false,
  onLocationSelect,
  onMapReady,
  style,
}, ref) => {
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [webViewRef, setWebViewRef] = useState(null);

  useEffect(() => {
    if (showUserLocation) {
      getCurrentLocation();
    }
  }, [showUserLocation]);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration = 1000) => {
      if (webViewRef) {
        const script = `
          if (window.map) {
            window.map.flyTo([${region.latitude}, ${region.longitude}], 15, {
              duration: ${duration / 1000}
            });
          }
        `;
        webViewRef.postMessage(JSON.stringify({ type: 'flyTo', data: region }));
      }
    },
    fitToCoordinates: (coordinates, options = {}) => {
      if (webViewRef && coordinates.length > 0) {
        webViewRef.postMessage(JSON.stringify({ 
          type: 'fitBounds', 
          data: coordinates 
        }));
      }
    },
  }));

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(currentLocation);

      if (webViewRef) {
        webViewRef.postMessage(JSON.stringify({
          type: 'updateUserLocation',
          data: currentLocation
        }));
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'mapReady':
          setLoading(false);
          if (onMapReady) {
            onMapReady(initialRegion);
          }
          break;
          
        case 'locationSelected':
          if (onLocationSelect) {
            onLocationSelect(data.coordinates);
          }
          break;
          
        case 'error':
          console.error('Map error:', data.message);
          Alert.alert('Map Error', data.message);
          break;
      }
    } catch (error) {
      console.error('Error parsing map message:', error);
    }
  };

  const generateMapHTML = () => {
    const markersArray = markers.map(marker => ({
      id: marker.id,
      lat: marker.latitude,
      lng: marker.longitude,
      title: marker.title || '',
      description: marker.description || '',
      color: marker.color || '#22C55E',
    }));

    const routeArray = route.map(point => [point.latitude, point.longitude]);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
        .custom-marker {
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        // Initialize map
        const map = L.map('map', {
            center: [${initialRegion.latitude}, ${initialRegion.longitude}],
            zoom: 13,
            maxBounds: [[${NEPAL_BOUNDS.south}, ${NEPAL_BOUNDS.west}], [${NEPAL_BOUNDS.north}, ${NEPAL_BOUNDS.east}]],
            maxBoundsViscosity: 1.0
        });
        
        window.map = map;

        // Add Baato tile layer
        L.tileLayer('https://api.baato.io/api/v1/styles/osm-liberty/{z}/{x}/{y}?key=bpk.vg8OVAqY3GX0KzTUc5QbBLdwkCdgRMB8oVx1fO8whN6j', {
            attribution: '© Baato Maps © OpenStreetMap contributors',
            maxZoom: 18,
            minZoom: 6
        }).addTo(map);

        // Markers array
        const markers = ${JSON.stringify(markersArray)};
        const markerLayers = [];

        // Add markers
        markers.forEach(marker => {
            const icon = L.divIcon({
                className: 'custom-marker',
                html: '<div style="background-color: ' + marker.color + '; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            const markerLayer = L.marker([marker.lat, marker.lng], { icon })
                .bindPopup('<strong>' + marker.title + '</strong><br>' + marker.description)
                .addTo(map);
                
            markerLayers.push(markerLayer);
        });

        // Add route if provided
        const routeCoords = ${JSON.stringify(routeArray)};
        if (routeCoords.length > 0) {
            L.polyline(routeCoords, {
                color: '#3B82F6',
                weight: 4,
                opacity: 0.7
            }).addTo(map);
        }

        // User location marker
        let userLocationMarker = null;

        // Handle map clicks
        map.on('click', function(e) {
            const coords = {
                latitude: e.latlng.lat,
                longitude: e.latlng.lng
            };
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationSelected',
                coordinates: coords
            }));
        });

        // Handle messages from React Native
        window.addEventListener('message', function(event) {
            try {
                const data = JSON.parse(event.data);
                
                switch(data.type) {
                    case 'flyTo':
                        map.flyTo([data.data.latitude, data.data.longitude], 15);
                        break;
                        
                    case 'fitBounds':
                        if (data.data.length > 0) {
                            const bounds = data.data.map(coord => [coord.latitude, coord.longitude]);
                            map.fitBounds(bounds, { padding: [20, 20] });
                        }
                        break;
                        
                    case 'updateUserLocation':
                        if (userLocationMarker) {
                            map.removeLayer(userLocationMarker);
                        }
                        
                        const userIcon = L.divIcon({
                            className: 'user-location-marker',
                            html: '<div style="background-color: #3B82F6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
                            iconSize: [16, 16],
                            iconAnchor: [8, 8]
                        });
                        
                        userLocationMarker = L.marker([data.data.latitude, data.data.longitude], { icon: userIcon })
                            .bindPopup('Your Location')
                            .addTo(map);
                        break;
                }
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        // Map ready callback
        map.whenReady(function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapReady'
            }));
        });

        // Error handling
        map.on('tileerror', function(e) {
            console.error('Tile loading error:', e);
        });

    </script>
</body>
</html>
    `;
  };

  return (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Loading Nepal map...</Text>
        </View>
      )}
      
      <WebView
        ref={setWebViewRef}
        source={{ html: generateMapHTML() }}
        style={[styles.webview, { opacity: loading ? 0 : 1 }]}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        scrollEnabled={false}
        onError={(error) => {
          console.error('WebView error:', error);
          setLoading(false);
        }}
        onLoadEnd={() => {
          // Map ready will be handled by the 'mapReady' message
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
});

export default BaatoWebMapView;
