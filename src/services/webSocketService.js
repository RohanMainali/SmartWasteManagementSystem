import AsyncStorage from '@react-native-async-storage/async-storage';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.listeners = new Map();
    this.isConnecting = false;
  }

  async connect() {
    // WebSocket temporarily disabled - will be implemented with socket.io-client
    console.log('WebSocket temporarily disabled for customer-only testing');
    return;
    
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      this.isConnecting = true;
      const token = await AsyncStorage.getItem('safacycle_auth_token');
      
      if (!token) {
        console.error('No auth token found for WebSocket connection');
        this.isConnecting = false;
        return;
      }

      // Connect to WebSocket server (adjust URL as needed)
      const wsUrl = `ws://192.168.1.198:5001`;
      this.ws = new WebSocket(wsUrl, [], {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // For socket.io client, we need to send auth in handshake
      // But since we're using raw WebSocket, let's send token after connection
      this.pendingToken = token;

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.emit('disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.isConnecting = false;
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Stop reconnection attempts
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  handleMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'notification':
        this.emit('notification', payload);
        break;
      case 'collection_update':
        this.emit('collectionUpdate', payload);
        break;
      case 'driver_location':
        this.emit('driverLocation', payload);
        break;
      case 'collection_status':
        this.emit('collectionStatus', payload);
        break;
      default:
        this.emit('message', data);
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected. Message not sent:', data);
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Request real-time driver location for active collection
  requestDriverLocation(collectionId) {
    this.send({
      type: 'subscribe_driver_location',
      collectionId
    });
  }

  // Stop receiving driver location updates
  stopDriverLocation(collectionId) {
    this.send({
      type: 'unsubscribe_driver_location',
      collectionId
    });
  }

  // Subscribe to collection status updates
  subscribeToCollection(collectionId) {
    this.send({
      type: 'subscribe_collection',
      collectionId
    });
  }

  // Unsubscribe from collection updates
  unsubscribeFromCollection(collectionId) {
    this.send({
      type: 'unsubscribe_collection',
      collectionId
    });
  }
}

// Export singleton instance
export default new WebSocketService();
