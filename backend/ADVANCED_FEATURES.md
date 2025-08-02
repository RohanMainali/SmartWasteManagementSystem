# SafaCycle Backend - Advanced Features Documentation

## Overview

The SafaCycle backend has been enhanced with advanced features including real-time tracking, route optimization, sophisticated analytics, and comprehensive notification systems. This document outlines the new capabilities and how to use them.

## New Features

### 1. Route Optimization Service (`/api/route-optimization`)

Advanced algorithms to optimize collection routes for maximum efficiency.

#### Endpoints:

- **POST /api/route-optimization/optimize**
  - Optimizes routes for multiple collections
  - Uses Traveling Salesman Problem algorithms
  - Returns optimized route with distance and time estimates

- **GET /api/route-optimization/suggestions/:vehicleId**
  - Get route suggestions for a specific vehicle
  - Considers vehicle capacity and driver assignments

- **POST /api/route-optimization/assign**
  - Assign optimized routes to drivers and vehicles
  - Updates collection requests with assignments

#### Example Usage:
```javascript
// Optimize routes
const response = await fetch('/api/route-optimization/optimize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    collections: [collectionIds],
    startLocation: { latitude: 40.7128, longitude: -74.0060 },
    constraints: { maxDistance: 100, maxCollections: 15 }
  })
});
```

### 2. Real-time Tracking Service (`/api/tracking`)

Live tracking of drivers, vehicles, and collection progress.

#### Endpoints:

- **POST /api/tracking/locations**
  - Update driver/vehicle location
  - Real-time position tracking

- **GET /api/tracking/locations**
  - Get all active driver locations
  - Admin and customer access with different data

- **POST /api/tracking/collection-start/:id**
  - Mark collection as started
  - Triggers real-time notifications

- **POST /api/tracking/collection-complete/:id**
  - Mark collection as completed
  - Updates analytics and notifications

#### Example Usage:
```javascript
// Update driver location
await fetch('/api/tracking/locations', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    latitude: 40.7128,
    longitude: -74.0060,
    heading: 45,
    speed: 25
  })
});
```

### 3. Advanced Analytics Service (`/api/advanced-analytics`)

Comprehensive analytics with predictive insights and environmental impact analysis.

#### Endpoints:

- **GET /api/advanced-analytics/operational-dashboard**
  - Complete operational overview
  - Collection performance, vehicle efficiency, driver stats
  - Regional performance analysis

- **GET /api/advanced-analytics/predictive-insights**
  - AI-powered predictions
  - Demand forecasting, capacity planning
  - Resource optimization recommendations

- **GET /api/advanced-analytics/environmental-impact**
  - Carbon footprint reduction calculations
  - Recycling rate analysis
  - Environmental achievements and comparisons

#### Example Response:
```javascript
{
  "success": true,
  "data": {
    "summary": {
      "collections": {
        "total": 1250,
        "completed": 1180,
        "completionRate": 94
      },
      "waste": {
        "totalWeight": 8500.5,
        "carbonReduction": 2550.2,
        "recyclingRate": 72.5
      }
    },
    "predictions": {
      "nextWeek": {
        "collections": 75,
        "weight": 450.2,
        "revenue": 1250.0
      }
    }
  }
}
```

### 4. Notification Service (`/api/notification-service`)

Advanced notification system with multiple channels and user preferences.

#### Endpoints:

- **POST /api/notification-service/send**
  - Send notifications to users
  - Support for bulk sending
  - Template-based messaging

- **GET /api/notification-service**
  - Get user notifications
  - Filtering and pagination support

- **PUT /api/notification-service/preferences**
  - Update notification preferences
  - Channel-specific settings

#### Notification Types:
- `collection_scheduled` - Collection appointment scheduled
- `collection_reminder` - Reminder before collection
- `collection_started` - Collection in progress
- `collection_completed` - Collection finished
- `driver_assigned` - Driver assigned to route
- `payment_due` - Payment notification
- `issue_reported` - Issue tracking
- `analytics_report` - Weekly/monthly reports

### 5. WebSocket Service (Real-time Communication)

Real-time communication for live updates and tracking.

#### Features:

- **Real-time Location Updates**
  - Driver location broadcasting
  - Customer tracking of assigned collections

- **Live Notifications**
  - Instant delivery of important updates
  - Role-based message routing

- **Collection Status Updates**
  - Real-time progress tracking
  - Status change notifications

- **Emergency Alerts**
  - Immediate emergency communication
  - Location-based alert routing

#### Client Usage:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5001', {
  auth: { token: userToken }
});

// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
});

// Track driver location
socket.on('driver_location', (data) => {
  updateDriverPosition(data.latitude, data.longitude);
});

// Send location update (for drivers)
socket.emit('location_update', {
  latitude: 40.7128,
  longitude: -74.0060,
  heading: 45,
  speed: 25
});
```

## Installation and Setup

### 1. Install Dependencies

```bash
cd backend
npm install socket.io
```

### 2. Environment Variables

Add to your `.env` file:

```env
# Existing variables...
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_here
MONGODB_URI=mongodb://localhost:27017/safacycle
```

### 3. Database Models

The following new fields have been added to existing models:

#### User Model Enhancements:
```javascript
notificationPreferences: {
  push: { type: Boolean, default: true },
  email: { type: Boolean, default: true },
  sms: { type: Boolean, default: false },
  in_app: { type: Boolean, default: true },
  categories: {
    collections: { type: Boolean, default: true },
    issues: { type: Boolean, default: true },
    analytics: { type: Boolean, default: false },
    maintenance: { type: Boolean, default: true }
  }
}
```

#### CollectionRequest Model Enhancements:
```javascript
statusHistory: {
  pending: Date,
  assigned: Date,
  in_progress: Date,
  completed: Date,
  cancelled: Date
},
routeOptimization: {
  routeId: String,
  sequence: Number,
  estimatedDistance: Number,
  estimatedTime: Number
},
tracking: {
  startedAt: Date,
  completedAt: Date,
  actualRoute: [{ latitude: Number, longitude: Number, timestamp: Date }]
}
```

### 4. Start the Server

```bash
npm run dev
```

The server will start with all advanced services active:

```
🚀 SafaCycle Backend API running on port 5001
📝 API Documentation: http://localhost:5001/health
🌍 Environment: development
🔌 WebSocket server initialized
📊 Advanced Analytics: http://localhost:5001/api/advanced-analytics/operational-dashboard
🚛 Route Optimization: http://localhost:5001/api/route-optimization/optimize
📍 Real-time Tracking: http://localhost:5001/api/tracking/locations
🔔 Notification Service: http://localhost:5001/api/notification-service/send
```

## API Testing

### Health Check

Test that all services are running:

```bash
curl http://localhost:5001/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "SafaCycle Backend API is running",
  "services": {
    "database": "Connected",
    "webSocket": "Active",
    "connectedUsers": 0,
    "routeOptimization": "Active",
    "realTimeTracking": "Active",
    "advancedAnalytics": "Active",
    "notificationService": "Active"
  }
}
```

### Test Route Optimization

```bash
curl -X POST http://localhost:5001/api/route-optimization/optimize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "collections": ["collection_id_1", "collection_id_2"],
    "startLocation": {"latitude": 40.7128, "longitude": -74.0060}
  }'
```

### Test Advanced Analytics

```bash
curl -X GET "http://localhost:5001/api/advanced-analytics/operational-dashboard?period=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend Integration

### Install Socket.IO Client

```bash
cd frontend
npm install socket.io-client
```

### Create WebSocket Service

```javascript
// services/webSocketService.js
import io from 'socket.io-client';
import { getAuthToken } from './authService';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect() {
    const token = getAuthToken();
    
    this.socket = io(process.env.REACT_APP_API_URL, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('Connected to server');
    });

    this.socket.on('notification', this.handleNotification);
    this.socket.on('driver_location', this.handleDriverLocation);
    this.socket.on('collection_updated', this.handleCollectionUpdate);
  }

  handleNotification = (notification) => {
    // Show notification to user
    console.log('New notification:', notification);
  };

  handleDriverLocation = (location) => {
    // Update driver position on map
    console.log('Driver location update:', location);
  };

  handleCollectionUpdate = (update) => {
    // Update collection status in UI
    console.log('Collection update:', update);
  };

  sendLocationUpdate(location) {
    if (this.socket && this.connected) {
      this.socket.emit('location_update', location);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }
}

export default new WebSocketService();
```

## Performance Optimizations

### 1. Route Optimization
- Implements efficient Traveling Salesman Problem algorithms
- Caches optimization results for similar requests
- Considers real-world constraints (traffic, capacity, time windows)

### 2. Real-time Tracking
- Uses in-memory storage for fast location updates
- Implements geofencing for automatic status updates
- Batches location updates to reduce network overhead

### 3. Analytics Engine
- Aggregated queries with MongoDB pipelines
- Cached results for frequently accessed data
- Incremental updates for real-time metrics

### 4. WebSocket Management
- Efficient room-based message routing
- Connection pooling and cleanup
- Rate limiting for location updates

## Security Considerations

### 1. Authentication
- JWT token validation for all WebSocket connections
- Role-based access control for sensitive endpoints
- Rate limiting on location updates

### 2. Data Privacy
- Location data encryption in transit
- Automatic cleanup of old tracking data
- User consent for location sharing

### 3. API Security
- Input validation on all optimization parameters
- Sanitization of user-provided coordinates
- Protection against location spoofing

## Monitoring and Logging

### 1. WebSocket Monitoring
- Connection count tracking
- Message volume metrics
- Error rate monitoring

### 2. Performance Metrics
- Route optimization execution time
- Database query performance
- Real-time update latency

### 3. Alert System
- High error rate notifications
- Performance degradation alerts
- Service availability monitoring

## Future Enhancements

### 1. Machine Learning
- Demand prediction algorithms
- Route optimization using historical data
- Anomaly detection for unusual patterns

### 2. Advanced Analytics
- Customer behavior analysis
- Predictive maintenance for vehicles
- Environmental impact modeling

### 3. Integration Capabilities
- Third-party mapping services
- Payment gateway integration
- Government reporting systems

---

This enhanced backend provides a robust foundation for a modern smart waste management system with real-time capabilities, advanced analytics, and intelligent routing. The modular architecture allows for easy scaling and future feature additions.
