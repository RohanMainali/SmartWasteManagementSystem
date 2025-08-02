/**
 * Network Configuration
 * 
 * To use this app on your local network:
 * 1. Find your computer's IP address:
 *    - On macOS: System Preferences > Network, or run `ifconfig` in terminal
 *    - On Windows: ipconfig in Command Prompt
 *    - On Linux: ifconfig or ip addr show
 * 
 * 2. Update the MANUAL_IP below with your computer's IP address
 * 3. Make sure your mobile device is on the same WiFi network
 * 
 * The app will automatically try to detect the IP when using Expo Dev Tools,
 * but you can override it here if needed.
 */

// Set this to your computer's IP address on your local network
// Example: '192.168.1.100', '10.0.0.5', '172.16.1.10'
export const MANUAL_IP = '192.168.1.198'; // Update this with your IP

// Backend port (usually 5001)
export const BACKEND_PORT = 5001;

// Expo dev port (usually 8081)
export const EXPO_PORT = 8081;

/**
 * Get the API base URL with automatic or manual IP detection
 */
export const getApiBaseUrl = () => {
  if (__DEV__) {
    try {
      // Try to get IP from Expo Constants (automatic detection)
      const Constants = require('expo-constants').default;
      if (Constants.expoConfig?.hostUri) {
        const hostUri = Constants.expoConfig.hostUri.split(':')[0];
        console.log('🌐 Using auto-detected IP:', hostUri);
        return `http://${hostUri}:${BACKEND_PORT}`;
      }
    } catch (error) {
      console.log('📱 Expo Constants not available, using manual IP');
    }
  }
  
  console.log('🌐 Using manual IP:', MANUAL_IP);
  return `http://${MANUAL_IP}:${BACKEND_PORT}`;
};

/**
 * Get the WebSocket URL
 */
export const getWebSocketUrl = (token) => {
  const baseUrl = getApiBaseUrl();
  const wsUrl = baseUrl.replace('http://', 'ws://');
  return `${wsUrl}/ws?token=${token}`;
};

/**
 * Get the health check URL
 */
export const getHealthCheckUrl = () => {
  return `${getApiBaseUrl()}/health`;
};
