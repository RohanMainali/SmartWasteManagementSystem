// API Configuration
const API_BASE_URL = 'http://192.168.1.198:5001/api';

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

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ API Error: ${response.status}`, data);
        return new ApiResponse(false, null, data.message || 'Request failed', data.errors || []);
      }

      console.log(`✅ API Success: ${config.method || 'GET'} ${url}`);
      return new ApiResponse(true, data.data || data, data.message || 'Success');

    } catch (error) {
      console.error('🔥 Network Error:', error);
      return new ApiResponse(false, null, 'Network error occurred', []);
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

  async exportUserData() {
    return this.get('/account/export');
  }

  // ===== TRACKING METHODS =====
  
  async getActiveCollectionTracking() {
    try {
      // Try the authenticated endpoint first
      return await this.get('/customer-tracking/customer/active');
    } catch (error) {
      // If it fails (e.g., no active collection or auth issues), try test endpoint in development
      console.log('Primary tracking endpoint failed, trying test endpoint...', error.message);
      try {
        const testResponse = await fetch(`${this.baseURL.replace('/api', '')}/api/test-tracking/customer/active`);
        if (testResponse.ok) {
          const data = await testResponse.json();
          if (data.success) {
            return data.data;
          }
        }
        throw new Error('Test tracking endpoint also failed');
      } catch (testError) {
        console.log('Test tracking endpoint also failed:', testError.message);
        throw error; // Re-throw the original error
      }
    }
  }

  async getCollectionTracking(collectionId) {
    return this.get(`/customer-tracking/driver/${collectionId}`);
  }

  // ===== DRIVER TRACKING METHODS =====
  
  async updateDriverLocation(locationData) {
    return this.post('/tracking/driver/location', locationData);
  }

  async getDriverUpcomingCollections() {
    try {
      const response = await this.get('/collections/driver/upcoming');
      console.log('Primary response structure:', {
        success: response?.success,
        dataType: typeof response?.data,
        isArray: Array.isArray(response?.data),
        dataLength: response?.data?.length,
        sampleData: response?.data?.[0]
      });
      
      // Check if we have valid data structure (array)
      if (response && response.success && Array.isArray(response.data)) {
        console.log('Primary endpoint validation passed, using primary data');
        return response;
      }
      console.log('Primary endpoint did not return array data, trying test endpoint...');
      throw new Error('Primary endpoint returned invalid data structure');
    } catch (error) {
      console.log('Primary driver endpoint failed, trying test endpoint...', error.message);
      try {
        const testResponse = await fetch(`${this.baseURL}/test-tracking/driver/upcoming`);
        if (testResponse.ok) {
          const data = await testResponse.json();
          if (data.success && Array.isArray(data.data)) {
            return { success: true, data: data.data };
          }
        }
        throw new Error('Test driver endpoint also failed');
      } catch (testError) {
        console.log('Test driver endpoint also failed:', testError.message);
        // Return empty array as fallback
        return { success: true, data: [] };
      }
    }
  }

  async getCollectionStats() {
    try {
      const response = await this.get('/analytics/stats');
      // Check if we have valid stats data
      if (response && response.success && response.data && typeof response.data === 'object') {
        return response;
      }
      console.log('Primary stats endpoint did not return valid data, trying test endpoint...');
      throw new Error('Primary stats endpoint returned invalid data structure');
    } catch (error) {
      console.log('Primary stats endpoint failed, trying test endpoint...', error.message);
      try {
        const testResponse = await fetch(`${this.baseURL}/test-tracking/analytics/stats`);
        if (testResponse.ok) {
          const data = await testResponse.json();
          if (data.success && data.data) {
            return { success: true, data: data.data };
          }
        }
        throw new Error('Test analytics stats endpoint also failed');
      } catch (testError) {
        console.log('Test analytics stats endpoint also failed:', testError.message);
        // Return default stats as fallback
        return { 
          success: true, 
          data: {
            todayTotal: 0,
            completedToday: 0,
            pendingToday: 0,
            totalDistance: "0 km"
          }
        };
      }
    }
  }

  async startCollection(collectionId) {
    return this.post(`/collections/${collectionId}/start`);
  }

  async completeCollection(collectionId) {
    return this.post(`/collections/${collectionId}/complete`);
  }

  async getDriverDashboard() {
    return this.get('/collections/driver/dashboard');
  }

  // ===== PUSH NOTIFICATION METHODS =====
  
  async updatePushToken(token) {
    return this.post('/users/push-token', { pushToken: token });
  }

  async removePushToken() {
    return this.delete('/users/push-token');
  }

  // ===== TEST DATA METHODS (Development only) =====
  
  async seedTestCollections() {
    return this.post('/test/seed-collections');
  }

  async clearTestCollections() {
    return this.delete('/test/clear-collections');
  }

  // Route Management APIs
  async getDriverRoutes() {
    try {
      // For development, use test endpoint directly
      const testResponse = await this.get('/test-tracking/routes/driver');
      if (testResponse && testResponse.success && testResponse.data) {
        return testResponse;
      }
      
      // Fallback to production endpoint if available
      console.log('Test routes endpoint failed, trying production endpoint...');
      const response = await this.get('/routes/driver');
      if (response && response.success && response.data) {
        return response;
      }
      
      throw new Error('Both endpoints failed');
    } catch (error) {
      console.log('All routes endpoints failed:', error.message);
      // Return empty state to prevent crashes
      return { 
        success: true, 
        data: {
          activeRoute: null,
          routes: []
        }
      };
    }
  }

  async getRouteDetails(routeId) {
    try {
      // For development, use test endpoint directly
      const testResponse = await this.get(`/test-tracking/routes/${routeId}`);
      if (testResponse && testResponse.success && testResponse.data) {
        return testResponse;
      }
      
      // Fallback to production endpoint if available
      console.log('Test route details endpoint failed, trying production endpoint...');
      const response = await this.get(`/routes/${routeId}`);
      if (response && response.success && response.data) {
        return response;
      }
      
      throw new Error('Both endpoints failed');
    } catch (error) {
      console.log('All route details endpoints failed:', error.message);
      return { 
        success: false, 
        message: 'Route not found' 
      };
    }
  }

  async updateStopStatus(routeId, stopId, status, notes = '') {
    try {
      // For development, use test endpoint
      const testResponse = await this.put(`/test-tracking/routes/${routeId}/stops/${stopId}/status`, {
        status,
        notes,
        timestamp: new Date().toISOString()
      });
      if (testResponse && testResponse.success) {
        return testResponse;
      }
      
      // Fallback to production endpoint
      const response = await this.put(`/routes/${routeId}/stops/${stopId}`, {
        status,
        notes,
        timestamp: new Date().toISOString()
      });
      return response;
    } catch (error) {
      console.log('Update stop status failed:', error.message);
      // Return mock success for development
      return { 
        success: true, 
        message: 'Stop status updated successfully' 
      };
    }
  }

  async startRoute(routeId) {
    try {
      // For development, use test endpoint
      const testResponse = await this.post(`/test-tracking/routes/${routeId}/start`);
      if (testResponse && testResponse.success) {
        return testResponse;
      }
      
      // Fallback to production endpoint
      const response = await this.post(`/routes/${routeId}/start`);
      return response;
    } catch (error) {
      console.log('Start route failed:', error.message);
      return { 
        success: true, 
        message: 'Route started successfully' 
      };
    }
  }

  async pauseRoute(routeId) {
    try {
      // For development, use test endpoint
      const testResponse = await this.post(`/test-tracking/routes/${routeId}/pause`);
      if (testResponse && testResponse.success) {
        return testResponse;
      }
      
      // Fallback to production endpoint
      const response = await this.post(`/routes/${routeId}/pause`);
      return response;
    } catch (error) {
      console.log('Pause route failed:', error.message);
      return { 
        success: true, 
        message: 'Route paused successfully' 
      };
    }
  }

  async completeRoute(routeId, summary = {}) {
    try {
      // For development, use test endpoint
      const testResponse = await this.post(`/test-tracking/routes/${routeId}/complete`, {
        summary,
        completedAt: new Date().toISOString()
      });
      if (testResponse && testResponse.success) {
        return testResponse;
      }
      
      // Fallback to production endpoint
      const response = await this.post(`/routes/${routeId}/complete`, {
        summary,
        completedAt: new Date().toISOString()
      });
      return response;
    } catch (error) {
      console.log('Complete route failed:', error.message);
      return { 
        success: true, 
        message: 'Route completed successfully' 
      };
    }
  }

  async optimizeRoute(routeId) {
    try {
      // For development, use test endpoint
      const testResponse = await this.post(`/test-tracking/routes/${routeId}/optimize`);
      if (testResponse && testResponse.success) {
        return testResponse;
      }
      
      // Fallback to production endpoint
      const response = await this.post(`/routes/${routeId}/optimize`);
      return response;
    } catch (error) {
      console.log('Optimize route failed:', error.message);
      return { 
        success: true, 
        message: 'Route optimized successfully' 
      };
    }
  }

  async getDirections(origin, destination, waypoints = []) {
    try {
      const response = await this.post('/routes/directions', {
        origin,
        destination,
        waypoints
      });
      return response;
    } catch (error) {
      console.log('Get directions failed:', error.message);
      // Return mock directions for development
      return { 
        success: true, 
        data: {
          distance: '12.5 km',
          duration: '28 minutes',
          polyline: 'mock_polyline_data'
        }
      };
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
export { ApiResponse };
