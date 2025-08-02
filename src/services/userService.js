import apiService from './apiService';

// User Service for handling user management API calls (Admin functionality)
class UserService {
  // Get all users (Admin only)
  async getUsers(params = {}) {
    try {
      console.log('🔍 UserService: Getting users with params:', params);
      
      const queryParams = new URLSearchParams();
      
      // Add query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });
      
      const queryString = queryParams.toString();
      const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
      
      console.log('🌐 UserService: Calling API endpoint:', endpoint);
      
      const response = await apiService.get(endpoint);
      
      console.log('📊 UserService: API response:', response);
      
      return response;
    } catch (error) {
      console.error('❌ Get users error:', error);
      return {
        success: false,
        message: 'Failed to fetch users',
        data: null,
        error: error.message
      };
    }
  }

  // Get user statistics (Admin only)
  async getUserStats() {
    try {
      return await apiService.get('/users/stats');
    } catch (error) {
      console.error('Get user stats error:', error);
      return {
        success: false,
        message: 'Failed to fetch user statistics',
        data: null
      };
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      return await apiService.get(`/users/${userId}`);
    } catch (error) {
      console.error('Get user by ID error:', error);
      return {
        success: false,
        message: 'Failed to fetch user',
        data: null
      };
    }
  }

  // Update user
  async updateUser(userId, userData) {
    try {
      return await apiService.put(`/users/${userId}`, userData);
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        message: 'Failed to update user',
        data: null
      };
    }
  }

  // Delete user (Admin only)
  async deleteUser(userId) {
    try {
      return await apiService.delete(`/users/${userId}`);
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        success: false,
        message: 'Failed to delete user',
        data: null
      };
    }
  }

  // Update user status (Admin only)
  async updateUserStatus(userId, status) {
    try {
      return await apiService.put(`/users/${userId}/status`, { status });
    } catch (error) {
      console.error('Update user status error:', error);
      return {
        success: false,
        message: 'Failed to update user status',
        data: null
      };
    }
  }

  // Update user role (Admin only)
  async updateUserRole(userId, role) {
    try {
      return await apiService.put(`/users/${userId}/role`, { role });
    } catch (error) {
      console.error('Update user role error:', error);
      return {
        success: false,
        message: 'Failed to update user role',
        data: null
      };
    }
  }

  // Bulk update users (Admin only)
  async bulkUpdateUsers(userIds, updates) {
    try {
      return await apiService.post('/users/bulk-update', {
        userIds,
        updates
      });
    } catch (error) {
      console.error('Bulk update users error:', error);
      return {
        success: false,
        message: 'Failed to update users',
        data: null
      };
    }
  }

  // Helper methods for common operations

  // Activate user
  async activateUser(userId) {
    return this.updateUserStatus(userId, 'active');
  }

  // Deactivate user
  async deactivateUser(userId) {
    return this.updateUserStatus(userId, 'inactive');
  }

  // Suspend user
  async suspendUser(userId) {
    return this.updateUserStatus(userId, 'suspended');
  }

  // Promote user to admin
  async promoteToAdmin(userId) {
    return this.updateUserRole(userId, 'admin');
  }

  // Assign driver role
  async assignDriverRole(userId) {
    return this.updateUserRole(userId, 'driver');
  }

  // Assign customer role
  async assignCustomerRole(userId) {
    return this.updateUserRole(userId, 'customer');
  }

  // Bulk activate users
  async bulkActivateUsers(userIds) {
    return this.bulkUpdateUsers(userIds, { status: 'active' });
  }

  // Bulk deactivate users
  async bulkDeactivateUsers(userIds) {
    return this.bulkUpdateUsers(userIds, { status: 'inactive' });
  }

  // Bulk suspend users
  async bulkSuspendUsers(userIds) {
    return this.bulkUpdateUsers(userIds, { status: 'suspended' });
  }

  // Search users
  async searchUsers(searchTerm, filters = {}) {
    const params = {
      search: searchTerm,
      ...filters
    };
    return this.getUsers(params);
  }

  // Get users by role
  async getUsersByRole(role, params = {}) {
    return this.getUsers({ ...params, role });
  }

  // Get users by status
  async getUsersByStatus(status, params = {}) {
    return this.getUsers({ ...params, status });
  }

  // Get active users
  async getActiveUsers(params = {}) {
    return this.getUsersByStatus('active', params);
  }

  // Get drivers
  async getDrivers(params = {}) {
    return this.getUsersByRole('driver', params);
  }

  // Get customers
  async getCustomers(params = {}) {
    return this.getUsersByRole('customer', params);
  }

  // Get admins
  async getAdmins(params = {}) {
    return this.getUsersByRole('admin', params);
  }
}

// Create singleton instance
const userService = new UserService();

export default userService;
