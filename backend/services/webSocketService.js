const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CollectionRequest = require('../models/CollectionRequest');
const Vehicle = require('../models/Vehicle');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket
    this.userRooms = new Map(); // userId -> Set of rooms
    this.driverLocations = new Map(); // driverId -> location data
    this.collectionUpdates = new Map(); // collectionId -> update data
  }

  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('WebSocket service initialized');
    return this.io;
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.userRole = user.role;
        socket.userName = user.name;
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userName} (${socket.userRole}) connected: ${socket.id}`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket);
      this.userRooms.set(socket.userId, new Set());

      // Join user to their personal room
      socket.join(`user_${socket.userId}`);
      this.addUserToRoom(socket.userId, `user_${socket.userId}`);

      // Join role-based rooms
      socket.join(`role_${socket.userRole}`);
      this.addUserToRoom(socket.userId, `role_${socket.userRole}`);

      // Handle different user types
      this.handleUserTypeSpecificJoins(socket);

      // Set up event listeners
      this.setupSocketEventListeners(socket);

      // Send initial data
      this.sendInitialData(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userName} disconnected: ${socket.id}`);
        this.handleDisconnection(socket);
      });
    });
  }

  handleUserTypeSpecificJoins(socket) {
    switch (socket.userRole) {
      case 'driver':
        socket.join('drivers');
        this.addUserToRoom(socket.userId, 'drivers');
        this.handleDriverConnection(socket);
        break;
      case 'admin':
        socket.join('admins');
        this.addUserToRoom(socket.userId, 'admins');
        break;
      case 'customer':
        this.handleCustomerConnection(socket);
        break;
    }
  }

  async handleDriverConnection(socket) {
    try {
      // Get driver's assigned collections
      const collections = await CollectionRequest.find({
        assignedDriver: socket.userId,
        status: { $in: ['assigned', 'in_progress'] }
      });

      // Join collection rooms
      collections.forEach(collection => {
        const roomName = `collection_${collection._id}`;
        socket.join(roomName);
        this.addUserToRoom(socket.userId, roomName);
      });

      // Initialize driver location if not exists
      if (!this.driverLocations.has(socket.userId)) {
        this.driverLocations.set(socket.userId, {
          latitude: null,
          longitude: null,
          heading: null,
          speed: null,
          lastUpdated: new Date(),
          isOnline: true
        });
      }

    } catch (error) {
      console.error('Error handling driver connection:', error);
    }
  }

  async handleCustomerConnection(socket) {
    try {
      // Get customer's active collections
      const collections = await CollectionRequest.find({
        customer: socket.userId,
        status: { $in: ['pending', 'assigned', 'in_progress'] }
      });

      // Join collection rooms
      collections.forEach(collection => {
        const roomName = `collection_${collection._id}`;
        socket.join(roomName);
        this.addUserToRoom(socket.userId, roomName);
      });

    } catch (error) {
      console.error('Error handling customer connection:', error);
    }
  }

  setupSocketEventListeners(socket) {
    // Location updates (for drivers)
    socket.on('location_update', (data) => {
      this.handleLocationUpdate(socket, data);
    });

    // Collection status updates
    socket.on('collection_update', (data) => {
      this.handleCollectionUpdate(socket, data);
    });

    // Join specific rooms
    socket.on('join_room', (roomName) => {
      socket.join(roomName);
      this.addUserToRoom(socket.userId, roomName);
      socket.emit('room_joined', { room: roomName });
    });

    // Leave specific rooms
    socket.on('leave_room', (roomName) => {
      socket.leave(roomName);
      this.removeUserFromRoom(socket.userId, roomName);
      socket.emit('room_left', { room: roomName });
    });

    // Real-time chat/messaging
    socket.on('send_message', (data) => {
      this.handleMessage(socket, data);
    });

    // Driver availability updates
    socket.on('driver_availability', (data) => {
      this.handleDriverAvailability(socket, data);
    });

    // Request tracking updates
    socket.on('request_tracking', (collectionId) => {
      this.handleTrackingRequest(socket, collectionId);
    });

    // Emergency alerts
    socket.on('emergency_alert', (data) => {
      this.handleEmergencyAlert(socket, data);
    });
  }

  handleLocationUpdate(socket, data) {
    if (socket.userRole !== 'driver') {
      return socket.emit('error', { message: 'Only drivers can send location updates' });
    }

    const { latitude, longitude, heading, speed } = data;

    if (!latitude || !longitude) {
      return socket.emit('error', { message: 'Latitude and longitude are required' });
    }

    // Update driver location
    const locationData = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      heading: heading ? parseFloat(heading) : null,
      speed: speed ? parseFloat(speed) : null,
      lastUpdated: new Date(),
      isOnline: true
    };

    this.driverLocations.set(socket.userId, locationData);

    // Broadcast to relevant rooms
    this.broadcastDriverLocation(socket.userId, locationData);

    // Acknowledge receipt
    socket.emit('location_updated', { timestamp: locationData.lastUpdated });
  }

  async handleCollectionUpdate(socket, data) {
    try {
      const { collectionId, status, updates } = data;

      if (!collectionId) {
        return socket.emit('error', { message: 'Collection ID is required' });
      }

      // Verify user has permission to update this collection
      const collection = await CollectionRequest.findById(collectionId);
      if (!collection) {
        return socket.emit('error', { message: 'Collection not found' });
      }

      const canUpdate = (
        (socket.userRole === 'driver' && collection.assignedDriver?.toString() === socket.userId) ||
        (socket.userRole === 'admin') ||
        (socket.userRole === 'customer' && collection.customer.toString() === socket.userId)
      );

      if (!canUpdate) {
        return socket.emit('error', { message: 'Permission denied' });
      }

      // Update collection if status is provided
      if (status) {
        await CollectionRequest.findByIdAndUpdate(collectionId, { 
          status,
          [`statusHistory.${status}`]: new Date(),
          ...updates
        });
      }

      // Store and broadcast the update
      const updateData = {
        collectionId,
        status,
        updates,
        updatedBy: socket.userId,
        updatedAt: new Date(),
        userRole: socket.userRole
      };

      this.collectionUpdates.set(collectionId, updateData);

      // Broadcast to collection room
      this.io.to(`collection_${collectionId}`).emit('collection_updated', updateData);

      // Send specific notifications based on status
      this.handleCollectionStatusNotifications(collection, status, socket);

    } catch (error) {
      console.error('Error handling collection update:', error);
      socket.emit('error', { message: 'Failed to update collection' });
    }
  }

  handleMessage(socket, data) {
    const { room, message, type = 'text' } = data;

    if (!room || !message) {
      return socket.emit('error', { message: 'Room and message are required' });
    }

    const messageData = {
      id: Date.now().toString(),
      senderId: socket.userId,
      senderName: socket.userName,
      senderRole: socket.userRole,
      message,
      type,
      timestamp: new Date(),
      room
    };

    // Broadcast to room
    this.io.to(room).emit('new_message', messageData);
  }

  handleDriverAvailability(socket, data) {
    if (socket.userRole !== 'driver') {
      return socket.emit('error', { message: 'Only drivers can update availability' });
    }

    const { isAvailable, location } = data;

    // Update driver location with availability
    const currentLocation = this.driverLocations.get(socket.userId) || {};
    this.driverLocations.set(socket.userId, {
      ...currentLocation,
      isAvailable: Boolean(isAvailable),
      ...(location && { latitude: location.latitude, longitude: location.longitude }),
      lastUpdated: new Date()
    });

    // Broadcast to admins
    this.io.to('admins').emit('driver_availability_changed', {
      driverId: socket.userId,
      driverName: socket.userName,
      isAvailable: Boolean(isAvailable),
      timestamp: new Date()
    });

    socket.emit('availability_updated', { isAvailable: Boolean(isAvailable) });
  }

  async handleTrackingRequest(socket, collectionId) {
    try {
      const collection = await CollectionRequest.findById(collectionId)
        .populate('assignedDriver', 'name phone')
        .populate('assignedVehicle', 'licensePlate model');

      if (!collection) {
        return socket.emit('error', { message: 'Collection not found' });
      }

      // Check permission
      const canTrack = (
        collection.customer.toString() === socket.userId ||
        collection.assignedDriver?._id.toString() === socket.userId ||
        socket.userRole === 'admin'
      );

      if (!canTrack) {
        return socket.emit('error', { message: 'Permission denied' });
      }

      // Join tracking room
      const trackingRoom = `tracking_${collectionId}`;
      socket.join(trackingRoom);
      this.addUserToRoom(socket.userId, trackingRoom);

      // Send current tracking data
      const trackingData = {
        collection: {
          id: collection._id,
          status: collection.status,
          scheduledDate: collection.scheduledDate,
          estimatedArrival: collection.estimatedArrival
        },
        driver: collection.assignedDriver ? {
          id: collection.assignedDriver._id,
          name: collection.assignedDriver.name,
          phone: collection.assignedDriver.phone
        } : null,
        vehicle: collection.assignedVehicle ? {
          id: collection.assignedVehicle._id,
          licensePlate: collection.assignedVehicle.licensePlate,
          model: collection.assignedVehicle.model
        } : null,
        location: collection.assignedDriver ? 
          this.driverLocations.get(collection.assignedDriver._id.toString()) : null
      };

      socket.emit('tracking_data', trackingData);

    } catch (error) {
      console.error('Error handling tracking request:', error);
      socket.emit('error', { message: 'Failed to start tracking' });
    }
  }

  handleEmergencyAlert(socket, data) {
    const { type, message, location } = data;

    const alertData = {
      id: Date.now().toString(),
      type: type || 'general',
      message,
      location,
      reportedBy: {
        id: socket.userId,
        name: socket.userName,
        role: socket.userRole
      },
      timestamp: new Date()
    };

    // Send to all admins immediately
    this.io.to('admins').emit('emergency_alert', alertData);

    // Send to nearby drivers if location is provided
    if (location && socket.userRole === 'customer') {
      this.broadcastToNearbyDrivers(location, 'emergency_alert', alertData);
    }

    socket.emit('alert_sent', { id: alertData.id });
  }

  broadcastDriverLocation(driverId, locationData) {
    // Broadcast to admins for monitoring
    this.io.to('admins').emit('driver_location', {
      driverId,
      ...locationData
    });

    // Broadcast to customers tracking this driver
    const trackingRooms = Array.from(this.userRooms.get(driverId) || [])
      .filter(room => room.startsWith('tracking_'));
    
    trackingRooms.forEach(room => {
      this.io.to(room).emit('driver_location', {
        driverId,
        ...locationData
      });
    });
  }

  broadcastToNearbyDrivers(location, event, data, radiusKm = 10) {
    this.driverLocations.forEach((driverLocation, driverId) => {
      if (driverLocation.latitude && driverLocation.longitude) {
        const distance = this.calculateDistance(
          location.latitude, location.longitude,
          driverLocation.latitude, driverLocation.longitude
        );
        
        if (distance <= radiusKm) {
          const socket = this.connectedUsers.get(driverId);
          if (socket) {
            socket.emit(event, { ...data, distance });
          }
        }
      }
    });
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  async handleCollectionStatusNotifications(collection, status, socket) {
    switch (status) {
      case 'assigned':
        this.io.to(`user_${collection.customer}`).emit('notification', {
          type: 'collection_assigned',
          title: 'Collection Assigned',
          message: `Driver ${socket.userName} has been assigned to your collection`,
          collectionId: collection._id
        });
        break;
      
      case 'in_progress':
        this.io.to(`user_${collection.customer}`).emit('notification', {
          type: 'collection_started',
          title: 'Collection Started',
          message: 'Your waste collection is now in progress',
          collectionId: collection._id
        });
        break;
      
      case 'completed':
        this.io.to(`user_${collection.customer}`).emit('notification', {
          type: 'collection_completed',
          title: 'Collection Completed',
          message: 'Your waste collection has been completed successfully',
          collectionId: collection._id
        });
        break;
    }
  }

  sendInitialData(socket) {
    // Send user's unread notification count
    this.sendUnreadNotificationCount(socket);
    
    // Send role-specific initial data
    switch (socket.userRole) {
      case 'driver':
        this.sendDriverInitialData(socket);
        break;
      case 'customer':
        this.sendCustomerInitialData(socket);
        break;
      case 'admin':
        this.sendAdminInitialData(socket);
        break;
    }
  }

  async sendDriverInitialData(socket) {
    try {
      const assignments = await CollectionRequest.find({
        assignedDriver: socket.userId,
        status: { $in: ['assigned', 'in_progress'] }
      }).populate('customer', 'name phone');

      socket.emit('initial_data', {
        type: 'driver',
        assignments: assignments.length,
        pendingCollections: assignments.filter(a => a.status === 'assigned').length,
        inProgressCollections: assignments.filter(a => a.status === 'in_progress').length
      });
    } catch (error) {
      console.error('Error sending driver initial data:', error);
    }
  }

  async sendCustomerInitialData(socket) {
    try {
      const collections = await CollectionRequest.find({
        customer: socket.userId,
        status: { $in: ['pending', 'assigned', 'in_progress'] }
      });

      socket.emit('initial_data', {
        type: 'customer',
        activeCollections: collections.length,
        nextCollection: collections.find(c => c.status === 'assigned')
      });
    } catch (error) {
      console.error('Error sending customer initial data:', error);
    }
  }

  async sendAdminInitialData(socket) {
    try {
      const [pendingCollections, activeDrivers, totalCustomers] = await Promise.all([
        CollectionRequest.countDocuments({ status: 'pending' }),
        User.countDocuments({ role: 'driver', isActive: true }),
        User.countDocuments({ role: 'customer', isActive: true })
      ]);

      socket.emit('initial_data', {
        type: 'admin',
        pendingCollections,
        activeDrivers,
        totalCustomers,
        onlineDrivers: this.driverLocations.size
      });
    } catch (error) {
      console.error('Error sending admin initial data:', error);
    }
  }

  async sendUnreadNotificationCount(socket) {
    try {
      const Notification = require('../models/Notification');
      const unreadCount = await Notification.countDocuments({
        recipient: socket.userId,
        readAt: { $exists: false }
      });

      socket.emit('unread_notifications', { count: unreadCount });
    } catch (error) {
      console.error('Error sending unread notification count:', error);
    }
  }

  handleDisconnection(socket) {
    // Remove from connected users
    this.connectedUsers.delete(socket.userId);
    
    // Clean up rooms
    this.userRooms.delete(socket.userId);
    
    // Update driver status to offline
    if (socket.userRole === 'driver') {
      const driverLocation = this.driverLocations.get(socket.userId);
      if (driverLocation) {
        this.driverLocations.set(socket.userId, {
          ...driverLocation,
          isOnline: false,
          lastSeen: new Date()
        });
      }
      
      // Notify admins
      this.io.to('admins').emit('driver_offline', {
        driverId: socket.userId,
        driverName: socket.userName,
        timestamp: new Date()
      });
    }
  }

  addUserToRoom(userId, roomName) {
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId).add(roomName);
  }

  removeUserFromRoom(userId, roomName) {
    if (this.userRooms.has(userId)) {
      this.userRooms.get(userId).delete(roomName);
    }
  }

  // Public methods for external use
  sendNotificationToUser(userId, notification) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit('notification', notification);
      return true;
    }
    return false;
  }

  sendNotificationToRole(role, notification) {
    this.io.to(`role_${role}`).emit('notification', notification);
  }

  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  getDriverLocations() {
    return Object.fromEntries(this.driverLocations);
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}

// Export singleton instance
const webSocketService = new WebSocketService();
module.exports = webSocketService;
