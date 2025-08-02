/**
 * Utility helper functions for the SafaCycle app
 */

/**
 * Formats a date to a readable string
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return "N/A";
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Formats a time to a readable string
 * @param {Date|string} time - Time to format
 * @returns {string} - Formatted time string
 */
export const formatTime = (time) => {
  if (!time) return "N/A";
  const timeObj = new Date(time);
  return timeObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if email is valid
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if phone is valid
 */
export const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
};

/**
 * Test network connectivity to backend
 * @param {string} baseUrl - Base URL to test (optional)
 * @returns {Promise<boolean>} - True if backend is reachable
 */
export const testNetworkConnectivity = async (baseUrl = 'http://192.168.1.198:5001') => {
  try {
    console.log('🌐 Testing network connectivity to:', baseUrl);
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ Backend is reachable');
      return true;
    } else {
      console.log('❌ Backend responded with error:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Network connectivity test failed:', error.message);
    return false;
  }
};
