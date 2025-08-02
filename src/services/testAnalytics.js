// Test file to debug analytics service issue
import analyticsService from './analyticsService';
import userService from './userService';

// Test function to debug the analytics issue
export const testAnalytics = async () => {
  console.log('🧪 Testing Analytics Service...');
  
  try {
    // Test userService.getUsers first
    console.log('1️⃣ Testing userService.getUsers...');
    const usersResponse = await userService.getUsers({ limit: 100 });
    console.log('Users Response:', JSON.stringify(usersResponse, null, 2));
    
    // Test analytics service
    console.log('2️⃣ Testing analyticsService.getDashboardAnalytics...');
    const analytics = await analyticsService.getDashboardAnalytics();
    console.log('Analytics Response:', JSON.stringify(analytics, null, 2));
    
    return analytics;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

// Test individual components
export const testUserAnalysis = (users) => {
  console.log('🧪 Testing user analysis with users:', users);
  try {
    const result = analyticsService.analyzeUsers(users);
    console.log('Analysis result:', result);
    return result;
  } catch (error) {
    console.error('❌ User analysis failed:', error);
    throw error;
  }
};
