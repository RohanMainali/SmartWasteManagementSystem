// Utility functions for the Smart Waste Management App

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
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with isValid and message
 */
export const validatePassword = (password) => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long",
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }
  if (!/\d/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one number",
    };
  }
  return { isValid: true, message: "Password is strong" };
};

/**
 * Formats date for display
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Formats time for display
 * @param {Date|string} date - Date/time to format
 * @returns {string} - Formatted time string
 */
export const formatTime = (date) => {
  const dateObj = new Date(date);
  return dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Gets user role color
 * @param {string} role - User role (admin, driver, customer)
 * @returns {string} - Color code for the role
 */
export const getRoleColor = (role) => {
  const roleColors = {
    admin: "#8E44AD",
    driver: "#3498DB",
    customer: "#E67E22",
  };
  return roleColors[role.toLowerCase()] || "#2E8B57";
};

/**
 * Generates a unique ID
 * @returns {string} - Unique identifier
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Capitalizes first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Gets color based on status
 * @param {string} status - Status (active, inactive, completed, etc.)
 * @returns {string} - Color hex code
 */
export const getStatusColor = (status) => {
  const statusColors = {
    active: "#27AE60",
    inactive: "#F39C12",
    suspended: "#E74C3C",
    completed: "#27AE60",
    pending: "#F39C12",
    cancelled: "#E74C3C",
    "in-progress": "#3498DB",
    online: "#27AE60",
    offline: "#F39C12",
    failed: "#E74C3C",
  };
  return statusColors[status.toLowerCase()] || "#7F8C8D";
};

/**
 * Formats a date string to a readable format
 * @param {string} dateString - ISO date string or date string
 * @returns {string} - Formatted date string
 */
export const formatDateString = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Formats a date and time string to a readable format
 * @param {string} dateString - ISO date string or date string
 * @returns {string} - Formatted date and time string
 */
export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Truncates text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

/**
 * Gets relative time string (e.g., "2 hours ago")
 * @param {string|Date} dateString - Date to compare
 * @returns {string} - Relative time string
 */
export const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000)
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

/**
 * Formats currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

/**
 * Formats duration in minutes to readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration string
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Test network connectivity to backend
 * @param {string} baseUrl - Base URL to test (optional)
 * @returns {Promise<boolean>} - True if backend is reachable
 */
export const testNetworkConnectivity = async (baseUrl = 'http://192.168.1.198:5001') => {
  try {
    console.log('🌐 Testing network connectivity to:', baseUrl);
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ Network connectivity test passed');
      return true;
    } else {
      console.log('❌ Network connectivity test failed - server responded with error');
      return false;
    }
  } catch (error) {
    console.log('❌ Network connectivity test failed:', error.message);
    return false;
  }
};
