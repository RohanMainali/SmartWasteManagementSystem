import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SIZES } from '../utils/theme';
import DriverLiveTracking from '../components/DriverLiveTracking';
import apiService from '../services/apiService';

const DriverTrackingMap = ({ navigation }) => {
  const [collections, setCollections] = useState([]);
  const [currentCollection, setCurrentCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState(null);

  useEffect(() => {
    loadDriverCollections();
  }, []);

  const loadDriverCollections = async () => {
    try {
      setLoading(true);
      
      // Try to load real data from API
      const response = await apiService.getDriverUpcomingCollections();
      setCollections(response.data || []);
      
      // Find current active collection
      const active = response.data?.find(c => c.status === 'in-progress');
      setCurrentCollection(active || response.data?.[0]);
      
    } catch (error) {
      console.error('Error loading collections:', error);
      
      // Use test data with Nepal context
      const testCollections = [
        {
          id: 'col-001',
          status: 'assigned',
          customer: {
            name: 'Ram Sharma',
            phone: '+977-9841234567',
          },
          address: {
            street: 'Thamel, Ward 26',
            city: 'Kathmandu',
            coordinates: {
              latitude: 27.7056,
              longitude: 85.3178,
            },
          },
          wasteTypes: [
            { category: 'Organic', quantity: '5 kg' },
            { category: 'Recyclable', quantity: '3 kg' },
          ],
          scheduledTime: '10:00 AM',
          notes: 'Ring bell twice, gate number 12',
        },
        {
          id: 'col-002',
          status: 'assigned',
          customer: {
            name: 'Sita Devi',
            phone: '+977-9851765432',
          },
          address: {
            street: 'Patan Durbar Square',
            city: 'Lalitpur',
            coordinates: {
              latitude: 27.6710,
              longitude: 85.3107,
            },
          },
          wasteTypes: [
            { category: 'Organic', quantity: '8 kg' },
          ],
          scheduledTime: '11:30 AM',
          notes: 'Near temple entrance',
        },
        {
          id: 'col-003',
          status: 'assigned',
          customer: {
            name: 'Hari Bahadur',
            phone: '+977-9861987654',
          },
          address: {
            street: 'Boudhanath Stupa Area',
            city: 'Kathmandu',
            coordinates: {
              latitude: 27.7215,
              longitude: 85.3619,
            },
          },
          wasteTypes: [
            { category: 'Mixed', quantity: '12 kg' },
          ],
          scheduledTime: '2:00 PM',
          notes: 'Commercial collection',
        },
      ];
      
      setCollections(testCollections);
      setCurrentCollection(testCollections[0]);
      
      Alert.alert(
        'Test Mode',
        'Loading sample collection data from Kathmandu area. Real API integration pending.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLocationUpdate = (location) => {
    setDriverLocation(location);
    console.log('Driver location updated:', location);
  };

  const handleCollectionStatusChange = (collectionId, newStatus) => {
    setCollections(prev => 
      prev.map(c => 
        c.id === collectionId 
          ? { ...c, status: newStatus }
          : c
      )
    );
    
    if (newStatus === 'completed') {
      // Move to next collection
      const nextCollection = collections.find(c => 
        c.id !== collectionId && c.status === 'assigned'
      );
      setCurrentCollection(nextCollection || null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading collections...</Text>
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
        <Text style={styles.title}>Live Tracking</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadDriverCollections}
        >
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          📍 Collections: {collections.filter(c => c.status === 'completed').length}/{collections.length}
        </Text>
        {currentCollection && (
          <Text style={styles.currentText}>
            📍 Current: {currentCollection.customer.name}
          </Text>
        )}
      </View>

      {/* Live Tracking Component */}
      <DriverLiveTracking
        collections={collections}
        currentCollection={currentCollection}
        onLocationUpdate={handleLocationUpdate}
        onCollectionStatusChange={handleCollectionStatusChange}
        style={styles.trackingContainer}
      />

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('RouteManagement')}
        >
          <Text style={styles.actionButtonText}>🗺️ Routes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.success }]}
          onPress={() => navigation.navigate('CollectionHistory')}
        >
          <Text style={styles.actionButtonText}>📊 History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.warning }]}
          onPress={() => navigation.navigate('BreakManagement')}
        >
          <Text style={styles.actionButtonText}>⏸️ Break</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.medium,
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
  refreshButton: {
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.medium,
  },
  refreshButtonText: {
    fontSize: SIZES.fontLarge,
  },
  statusBar: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.small,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  currentText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  trackingContainer: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
    backgroundColor: COLORS.surface,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: SIZES.small,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.radiusMedium,
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.surface,
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
  },
});

export default DriverTrackingMap;
