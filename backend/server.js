const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const http = require('http');
const os = require('os');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const accountRoutes = require('./routes/account');
const collectionRoutes = require('./routes/collections');
const issueRoutes = require('./routes/issues');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const customerTrackingRoutes = require('./routes/customerTracking');

// Import new advanced services
const routeOptimizationRoutes = require('./routes/routeOptimization');
const trackingRoutes = require('./routes/tracking');
const advancedAnalyticsRoutes = require('./routes/advancedAnalytics');
const notificationServiceRoutes = require('./routes/notificationService');
const testDataRoutes = require('./routes/testData');
const testTrackingRoutes = require('./routes/testTracking');
const healthRoutes = require('./routes/health');
const webSocketService = require('./services/webSocketService');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());

// Get local IP address
const getLocalIPAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const localIP = getLocalIPAddress();
const port = process.env.PORT || 8081;

app.use(cors({
  origin: [
    `http://localhost:${port}`,
    `http://${localIP}:${port}`,
    `exp://${localIP}:${port}`,
    `exp://localhost:${port}`,
    // Allow any local network IP for development
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:8081$/,
    /^exp:\/\/192\.168\.\d{1,3}\.\d{1,3}:8081$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:8081$/,
    /^exp:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:8081$/,
    /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:8081$/,
    /^exp:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:8081$/
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/safacycle', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'SafaCycle Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT || 5001,
    services: {
      database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      webSocket: webSocketService.io ? 'Active' : 'Inactive',
      connectedUsers: webSocketService.getConnectedUsers().length,
      routeOptimization: 'Active',
      realTimeTracking: 'Active',
      advancedAnalytics: 'Active',
      notificationService: 'Active'
    },
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      account: '/api/account',
      vehicles: '/api/vehicles',
      collections: '/api/collections',
      analytics: '/api/analytics',
      advancedAnalytics: '/api/advanced-analytics',
      routeOptimization: '/api/route-optimization',
      tracking: '/api/tracking',
      customerTracking: '/api/customer-tracking',
      notifications: '/api/notification-service'
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/customer-tracking', customerTrackingRoutes);

// Health check route
app.use('/api/health', healthRoutes);

// Advanced service routes
app.use('/api/route-optimization', routeOptimizationRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/advanced-analytics', advancedAnalyticsRoutes);
app.use('/api/notification-service', notificationServiceRoutes);

// Test data routes (development only)
if (process.env.NODE_ENV === 'development') {
  app.use('/api/test', testDataRoutes);
  app.use('/api/test-tracking', testTrackingRoutes);
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Default error
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5001;

// Initialize WebSocket service
const io = webSocketService.initialize(server);

server.listen(PORT, () => {
  console.log(`🚀 SafaCycle Backend API running on port ${PORT}`);
  console.log(`🌐 Local IP: ${localIP}`);
  console.log(`📱 Expo Dev URL: exp://${localIP}:8081`);
  console.log(`🌍 Web URL: http://${localIP}:${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔌 WebSocket server initialized`);
  console.log(`📊 Advanced Analytics: http://localhost:${PORT}/api/advanced-analytics/operational-dashboard`);
  console.log(`🚛 Route Optimization: http://localhost:${PORT}/api/route-optimization/optimize`);
  console.log(`📍 Real-time Tracking: http://localhost:${PORT}/api/tracking/locations`);
  console.log(`🔔 Notification Service: http://localhost:${PORT}/api/notification-service/send`);
});
