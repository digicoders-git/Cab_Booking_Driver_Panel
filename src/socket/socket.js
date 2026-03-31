// src/socket/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let socket = null;
let currentDriverId = null;
let lastHeading = null; // Store last known heading

export const connectSocket = (driverId) => {
  // Agar already connected hai toh naya connection mat banao
  if (socket?.connected) return socket;

  currentDriverId = driverId;

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    console.log('🔗 Joining room with driverId:', driverId);
    // Sirf room join karo — online/offline Dashboard handle karega
    socket.emit('join_room', { userId: driverId, role: 'driver' });
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err.message);
  });

  return socket;
};

// Get device heading (orientation)
const getDeviceHeading = () => {
  return new Promise((resolve) => {
    // Check if DeviceOrientationEvent is available
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ requires permission
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', (event) => {
              const heading = event.alpha; // 0-360 degrees
              lastHeading = heading;
              resolve(heading);
            }, { once: true });
          } else {
            resolve(lastHeading || null);
          }
        })
        .catch(() => resolve(lastHeading || null));
    } else if (typeof DeviceOrientationEvent !== 'undefined') {
      // Android and older iOS
      window.addEventListener('deviceorientation', (event) => {
        const heading = event.alpha; // 0-360 degrees
        lastHeading = heading;
        resolve(heading);
      }, { once: true });
    } else {
      resolve(lastHeading || null);
    }
  });
};

// Force Offline — toggle nahi, seedha offline
export const forceOffline = (driverId) => {
  if (socket?.connected) {
    socket.emit('driver_offline', { driverId });
  }
};

// Force Online
export const forceOnline = (driverId) => {
  if (socket?.connected) {
    socket.emit('driver_online', { driverId });
  }
};

// Location update via Socket (HTTP nahi!) - WITH HEADING
export const emitLocation = async (driverId, latitude, longitude, address = '', gpsHeading = null) => {
  if (socket?.connected) {
    try {
      // Use GPS heading if available, otherwise fallback to device orientation sensor
      let finalHeading = gpsHeading;
      
      if (finalHeading === null) {
        finalHeading = await getDeviceHeading();
      }

      socket.emit('update_location', { 
        driverId, 
        latitude, 
        longitude, 
        address,
        heading: finalHeading || lastHeading || 0 // Default to 0 instead of null to avoid UI issues
      });
      
      console.log('📍 Location emitted:', { latitude, longitude, heading: finalHeading });
    } catch (e) {
      console.warn('Error getting heading:', e);
      socket.emit('update_location', { 
        driverId, 
        latitude, 
        longitude, 
        address,
        heading: lastHeading || 0
      });
    }
  }
};

export const getSocket = () => socket;

export const disconnectSocket = (driverId) => {
  if (socket) {
    // Browser band → seedha offline, toggle nahi
    socket.emit('driver_offline', { driverId });
    socket.disconnect();
    socket = null;
    currentDriverId = null;
    lastHeading = null;
  }
};
