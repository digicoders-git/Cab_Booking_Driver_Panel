// src/socket/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let socket = null;
let currentDriverId = null;

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

// Location update via Socket (HTTP nahi!)
export const emitLocation = (driverId, latitude, longitude, address = '') => {
  if (socket?.connected) {
    socket.emit('update_location', { driverId, latitude, longitude, address });
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
  }
};
