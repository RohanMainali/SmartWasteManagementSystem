import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { COLORS, SIZES } from "../utils/theme";
import { formatTime } from "../utils/helpers";
import webSocketService from "../services/webSocketService";
import apiService from "../services/apiService";

export default function RealTimeTrackingScreen({ navigation, route }) {
  const { collectionId } = route.params;
  const [collection, setCollection] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadCollectionDetails();
    setupWebSocket();
    startPulseAnimation();

    return () => {
      cleanup();
    };
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadCollectionDetails = async () => {
    try {
      const response = await apiService.getCollection(collectionId);
      setCollection(response.collection);
    } catch (error) {
      console.error('Error loading collection details:', error);
      Alert.alert('Error', 'Failed to load collection details');
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    // Connect to WebSocket
    webSocketService.connect();

    // Set up event listeners
    webSocketService.on('connected', handleWebSocketConnected);
    webSocketService.on('disconnected', handleWebSocketDisconnected);
    webSocketService.on('driverLocation', handleDriverLocationUpdate);
    webSocketService.on('collectionStatus', handleCollectionStatusUpdate);
  };

  const handleWebSocketConnected = () => {
    setConnectionStatus('connected');
    // Subscribe to driver location updates for this collection
    webSocketService.requestDriverLocation(collectionId);
    webSocketService.subscribeToCollection(collectionId);
  };

  const handleWebSocketDisconnected = () => {
    setConnectionStatus('disconnected');
  };

  const handleDriverLocationUpdate = (locationData) => {
    if (locationData.collectionId === collectionId) {
      setDriverLocation({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timestamp: locationData.timestamp,
        estimatedArrival: locationData.estimatedArrival,
        distance: locationData.distance,
      });
    }
  };

  const handleCollectionStatusUpdate = (statusData) => {
    if (statusData.collectionId === collectionId) {
      setCollection(prev => ({
        ...prev,
        status: statusData.status,
        actualStartTime: statusData.actualStartTime,
        actualEndTime: statusData.actualEndTime,
      }));

      // Show status change notification
      if (statusData.status === 'in_progress') {
        Alert.alert('Driver Arrived', 'Your driver has arrived and started the collection!');
      } else if (statusData.status === 'completed') {
        Alert.alert('Collection Complete', 'Your waste collection has been completed successfully!');
        navigation.goBack();
      }
    }
  };

  const cleanup = () => {
    webSocketService.stopDriverLocation(collectionId);
    webSocketService.unsubscribeFromCollection(collectionId);
    webSocketService.off('connected', handleWebSocketConnected);
    webSocketService.off('disconnected', handleWebSocketDisconnected);
    webSocketService.off('driverLocation', handleDriverLocationUpdate);
    webSocketService.off('collectionStatus', handleCollectionStatusUpdate);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
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
      case 'scheduled':
        return 'Driver on the way';
      case 'in_progress':
        return 'Collection in progress';
      case 'completed':
        return 'Collection completed';
      case 'cancelled':
        return 'Collection cancelled';
      default:
        return 'Unknown status';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading collection details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Real-Time Tracking</Text>
      </View>

      {/* Connection Status */}
      <View style={styles.connectionStatus}>
        <View style={[
          styles.connectionDot,
          { backgroundColor: connectionStatus === 'connected' ? '#10B981' : '#EF4444' }
        ]} />
        <Text style={styles.connectionText}>
          {connectionStatus === 'connected' ? 'Real-time tracking active' : 'Connecting...'}
        </Text>
      </View>

      {/* Collection Info */}
      {collection && (
        <View style={styles.collectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Collection Details</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(collection.status) }]}>
              <Text style={styles.statusText}>{getStatusText(collection.status)}</Text>
            </View>
          </View>

          <View style={styles.collectionInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Scheduled Time:</Text>
              <Text style={styles.infoValue}>{formatTime(collection.scheduledTime)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Waste Types:</Text>
              <Text style={styles.infoValue}>
                {Array.isArray(collection.wasteTypes) 
                  ? collection.wasteTypes.join(', ') 
                  : collection.wasteTypes}
              </Text>
            </View>
            {collection.driver && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Driver:</Text>
                <Text style={styles.infoValue}>{collection.driver}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Driver Location Card */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <Animated.View style={[
            styles.locationIcon,
            { transform: [{ scale: pulseAnim }] }
          ]}>
            <Text style={styles.locationEmoji}>🚛</Text>
          </Animated.View>
          <Text style={styles.locationTitle}>Driver Location</Text>
        </View>

        {driverLocation ? (
          <View style={styles.locationInfo}>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>Distance:</Text>
              <Text style={styles.locationValue}>
                {driverLocation.distance ? `${driverLocation.distance.toFixed(1)} km away` : 'Calculating...'}
              </Text>
            </View>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>ETA:</Text>
              <Text style={styles.locationValue}>
                {driverLocation.estimatedArrival || 'Calculating...'}
              </Text>
            </View>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>Last Update:</Text>
              <Text style={styles.locationValue}>
                {driverLocation.timestamp 
                  ? formatTime(new Date(driverLocation.timestamp))
                  : 'No updates yet'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noLocationContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.noLocationText}>
              {connectionStatus === 'connected' 
                ? 'Waiting for driver location...'
                : 'Connecting to tracking service...'}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadCollectionDetails}
        >
          <Text style={styles.refreshButtonText}>Refresh Details</Text>
        </TouchableOpacity>

        {collection?.status === 'scheduled' && (
          <TouchableOpacity
            style={styles.cancelButton}
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
                        await apiService.cancelCollection(collectionId);
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
          >
            <Text style={styles.cancelButtonText}>Cancel Collection</Text>
          </TouchableOpacity>
        )}
      </View>
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
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  collectionCard: {
    backgroundColor: COLORS.white,
    margin: SIZES.padding,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  collectionInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  locationCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.padding,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationIcon: {
    marginRight: 12,
  },
  locationEmoji: {
    fontSize: 32,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  locationInfo: {
    gap: 8,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  locationValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  noLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noLocationText: {
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    padding: SIZES.padding,
    gap: 12,
  },
  refreshButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
