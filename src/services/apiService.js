// API Configuration
// Get local IP from network config or use fallback
const getApiBaseUrl = () => {
  // Try to use dynamic IP detection in development
  if (__DEV__) {
    try {
      // Try to get IP from Expo Constants (automatic detection)
      const Constants = require('expo-constants').default;
      if (Constants.expoConfig?.hostUri) {
        const hostUri = Constants.expoConfig.hostUri.split(':')[0];
        console.log('🌐 Using auto-detected IP:', hostUri);
        return `http://${hostUri}:5001/api`;
      }
    } catch (error) {
      console.log('📱 Expo Constants not available, using manual IP');
    }
  }
  
  // Fallback to manual IP - users can change this
  const MANUAL_IP = '192.168.1.198';
  console.log('🌐 Using manual IP:', MANUAL_IP);
  return `http://${MANUAL_IP}:5001/api`;
};

const API_BASE_URL = getApiBaseUrl();

// API Response interface for better error handling
class ApiResponse {
  constructor(success, data = null, message = '', errors = []) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.errors = errors;
  }
}

// API Service class for handling all backend communication
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  // Set authentication token
  setAuthToken(token) {
    this.token = token;
  }

  // Remove authentication token
  removeAuthToken() {
    this.token = null;
  }

  // Get default headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config = {
        headers: this.getHeaders(),
        ...options,
      };

      console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
      console.log(`🔑 Auth Token: ${this.token ? 'Present' : 'Missing'}`);
      console.log(`📋 Headers:`, config.headers);

      const response = await fetch(url, config);
      const data = await response.json();

      console.log(`📡 Response Status: ${response.status}`);
      console.log(`📄 Response Data:`, data);

      if (!response.ok) {
        console.error(`❌ API Error: ${response.status}`, data);
        return new ApiResponse(false, null, data.message || 'Request failed', data.errors || []);
      }

      console.log(`✅ API Success: ${config.method || 'GET'} ${url}`);
      return new ApiResponse(true, data.data || data, data.message || 'Success');

    } catch (error) {
      console.error('🔥 Network Error:', error);
      return new ApiResponse(false, null, 'Network error occurred', [error.message]);
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
      const data = await response.json();
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // ===== AUTHENTICATION METHODS =====
  
  async register(userData) {
    return this.post('/auth/register', userData);
  }

  async login(credentials) {
    const response = await this.post('/auth/login', credentials);
    if (response.success && response.data.token) {
      this.setAuthToken(response.data.token);
    }
    return response;
  }

  async logout() {
    this.removeAuthToken();
    return new ApiResponse(true, null, 'Logged out successfully');
  }

  // ===== COLLECTION METHODS =====
  
  async getCollections(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/collections?${queryParams}` : '/collections';
    return this.get(endpoint);
  }

  async createCollection(collectionData) {
    return this.post('/collections', collectionData);
  }

  async getCollectionById(id) {
    return this.get(`/collections/${id}`);
  }

  async updateCollection(id, updateData) {
    return this.put(`/collections/${id}`, updateData);
  }

  async cancelCollection(id, reason) {
    return this.put(`/collections/${id}/cancel`, { reason });
  }

  async rescheduleCollection(id, newDate, newTime) {
    return this.put(`/collections/${id}/reschedule`, { 
      requestedDate: newDate, 
      requestedTime: newTime 
    });
  }

  async getUpcomingCollections() {
    return this.get('/collections/upcoming');
  }

  async getCollectionStats() {
    return this.get('/collections/stats');
  }

  // Get active collection tracking data
  async getActiveCollectionTracking() {
    // For development, always use fake data instead of API calls
    console.log('🧪 Using fake tracking data directly (skipping API)');
    const fakeResponse = this.getFakeTrackingData();
    // Return the actual data, not the ApiResponse wrapper
    return fakeResponse.data;
  }

  // Generate fake tracking data for development/testing
  getFakeTrackingData() {
    // August 4, 2025 at 8:45 AM - exactly as requested
    const august4 = new Date('2025-08-04T08:45:00');
    
    // Create a fake active collection for Thamel
    const fakeCollection = {
      _id: 'fake-collection-thamel-001',
      requestId: 'CR-THAMEL-8045',
      customerId: 'customer-thamel-123',
      customerName: 'Test Customer',
      address: {
        street: 'Thamel Marg',
        city: 'Kathmandu',
        state: 'Bagmati Province',
        zipCode: '44600',
        landmark: 'Near Thamel Chowk',
        fullAddress: 'Thamel Marg, Near Thamel Chowk, Kathmandu 44600'
      },
      pickupLocation: {
        coordinates: [85.3081, 27.7115] // [longitude, latitude] for Thamel
      },
      wasteTypes: [
        { category: 'general', estimatedWeight: 3, description: 'Household general waste' },
        { category: 'recyclable', estimatedWeight: 2, description: 'Paper and plastic items' }
      ],
      totalEstimatedWeight: 5,
      requestedDate: august4.toISOString(),
      requestedTime: 'morning',
      preferredTimeRange: { start: '08:45', end: '09:15' },
      status: 'scheduled',
      assignedDriver: {
        _id: 'driver-ram-456',
        name: 'Ram Sharma',
        phone: '+977-9851234567',
        vehicleInfo: 'BA 1 KHA 2345 - Tata Ace'
      },
      assignedVehicle: {
        _id: 'vehicle-tata-789',
        plateNumber: 'BA 1 KHA 2345',
        licensePlate: 'BA 1 KHA 2345',
        model: 'Tata Ace',
        brand: 'Tata',
        capacity: '1000 kg'
      },
      contactPhone: '+977-9841234567',
      priority: 'normal',
      scheduledTime: '8:45 AM',
      estimatedDuration: '30 minutes'
    };

    // For future scheduled pickup - driver is not currently en route
    const routePoints = [
      { latitude: 27.7000, longitude: 85.3200, timestamp: august4.toISOString(), location: 'Will start from depot on August 4th' },
      { latitude: 27.7050, longitude: 85.3150, timestamp: new Date(august4.getTime() + 10*60*1000).toISOString(), location: 'Will pass through New Road area' },
      { latitude: 27.7100, longitude: 85.3100, timestamp: new Date(august4.getTime() + 20*60*1000).toISOString(), location: 'Will approach Thamel' },
      { latitude: 27.7115, longitude: 85.3081, timestamp: new Date(august4.getTime() + 30*60*1000).toISOString(), location: 'Will arrive at Thamel destination' }
    ];

    return new ApiResponse(true, {
      collection: fakeCollection,
      driver: fakeCollection.assignedDriver,
      vehicle: fakeCollection.assignedVehicle,
      driverLocation: {
        latitude: 27.7000, // Driver at depot, not en route yet
        longitude: 85.3200,
        timestamp: new Date().toISOString(),
        heading: 0,
        speed: 0, // Stationary - not currently driving
        accuracy: 10,
        distance: null, // Not applicable for future pickups
        estimatedArrival: 'August 4th at 8:45 AM',
        eta: 'Scheduled for August 4th',
        currentStatus: 'Scheduled for pickup on August 4th at 8:45 AM'
      },
      route: routePoints,
      estimatedArrival: august4.toISOString(),
      status: 'scheduled',
      trackingActive: false, // Not actively tracking until pickup day
      lastUpdate: new Date().toISOString(),
      eta: 'Scheduled for August 4th at 8:45 AM',
      distanceRemaining: 'Not applicable for scheduled pickup',
      pickupWindow: '8:45 AM - 9:15 AM',
      location: 'Thamel, Kathmandu',
      driverNotes: 'Collection scheduled for August 4th at 8:45 AM. Driver Ram Sharma will arrive on time with Tata Ace vehicle BA 1 KHA 2345.'
    }, 'Fake tracking data for Thamel pickup at 8:45 AM on August 4th, 2025');
  }

  // ===== ISSUE REPORTING METHODS =====
  
  async getIssues(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/issues?${queryParams}` : '/issues';
    return this.get(endpoint);
  }

  async createIssue(issueData) {
    return this.post('/issues', issueData);
  }

  async reportIssue(issueData) {
    return this.createIssue(issueData);
  }

  async getIssueById(id) {
    return this.get(`/issues/${id}`);
  }

  async addIssueComment(id, comment) {
    return this.post(`/issues/${id}/comments`, { text: comment });
  }

  async uploadIssuePhoto(id, photoData) {
    // This will be implemented when we add file upload functionality
    return this.post(`/issues/${id}/photos`, photoData);
  }

  // ===== NOTIFICATION METHODS =====
  
  async getNotifications(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/notifications?${queryParams}` : '/notifications';
    return this.get(endpoint);
  }

  async markNotificationAsRead(id) {
    return this.put(`/notifications/${id}/read`);
  }

  async markAllNotificationsAsRead() {
    return this.put('/notifications/mark-all-read');
  }

  async getUnreadNotificationCount() {
    return this.get('/notifications/unread-count');
  }

  // ===== ANALYTICS METHODS =====
  
  async getCustomerDashboard() {
    return this.get('/analytics/dashboard');
  }

  async getEnvironmentalImpact() {
    return this.get('/analytics/environmental-impact');
  }

  async getCollectionHistory() {
    return this.get('/analytics/collection-history');
  }

  async getRewardsData() {
    return this.get('/analytics/rewards');
  }

  async getPersonalizedInsights() {
    return this.get('/analytics/insights');
  }

  // ===== USER PROFILE METHODS =====
  
  async getUserProfile() {
    return this.get('/users/profile');
  }

  async updateUserProfile(profileData) {
    return this.put('/users/profile', profileData);
  }

  async changePassword(passwordData) {
    return this.post('/users/change-password', passwordData);
  }

  // ===== PUSH NOTIFICATION METHODS =====
  
  async updatePushToken(token) {
    return this.post('/users/push-token', { pushToken: token });
  }

  async removePushToken() {
    return this.delete('/users/push-token');
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
export { ApiResponse };
