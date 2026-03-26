import axios from 'axios';

const _baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API_BASE_URL = _baseUrl.endsWith('/api') ? _baseUrl : `${_baseUrl.replace(/\/$/, '')}/api`;
const driverApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

driverApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('driver_token') || localStorage.getItem('driverToken');
  console.log('Driver API Request Interceptor - URL:', config.url, 'Token:', token ? token.substring(0, 15) + '...' : 'NONE');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const driverService = {
  register: async (formData) => {
    const response = await driverApi.post('/drivers/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  login: async (email, password) => {
    const response = await driverApi.post('/drivers/login', { email, password });
    return response.data;
  },
  getProfile: async () => {
    const response = await driverApi.get('/drivers/profile');
    return response.data;
  },
  updateProfile: async (formData) => {
    const response = await driverApi.put('/drivers/profile-update', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  // Hamesha Online karo — no toggle, no profile check
  setOnline: async (latitude, longitude) => {
    const body = { isOnline: true };
    if (latitude && longitude) {
      body.latitude = latitude;
      body.longitude = longitude;
    }
    const response = await driverApi.put('/drivers/update-location', {
      latitude, longitude, address: ''
    }).catch(() => {});
    // toggleOnline sirf tab karo jab offline ho — frontend track karta hai
    return { success: true };
  },
  // Hamesha Offline karo — no toggle, no profile check  
  setOffline: async () => {
    return { success: true };
  },
  updateLocation: async (latitude, longitude, address = '') => {
    console.log('📡 updateLocation called with:', { latitude, longitude, address });
    if (!latitude || !longitude) {
      console.warn('⚠️ updateLocation skipped — lat/lng null hai');
      return;
    }
    const response = await driverApi.put('/drivers/update-location', { latitude, longitude, address });
    console.log('✅ updateLocation response:', response.data);
    return response.data;
  },
  getPendingRequests: async () => {
    const response = await driverApi.get('/trips/requests/pending');
    return response.data;
  },
  respondToRequest: async (requestId, action) => {
    // Backend expects "Accept" or "Reject" with capital letter
    const formattedAction = action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
    const response = await driverApi.put(`/trips/requests/${requestId}/respond`, { action: formattedAction });
    return response.data;
  },
  startTrip: async (bookingId, otp) => {
    const response = await driverApi.put(`/trips/execute/${bookingId}/start`, { otp });
    return response.data;
  },
  endTrip: async (bookingId, paymentMethod = 'Cash') => {
    const response = await driverApi.put(`/trips/execute/${bookingId}/end`, { paymentMethod });
    return response.data;
  },
  getTripDetail: async (bookingId) => {
    const response = await driverApi.get(`/trips/driver/my-trips`);
    const trips = response.data?.trips || response.data || [];
    return trips.find(t => t._id === bookingId) || null;
  },
  getMyTrips: async () => {
    const response = await driverApi.get('/trips/driver/my-trips');
    return response.data;
  },
  getWalletBalance: async () => {
    const response = await driverApi.get('/wallet/my-wallet');
    return response.data;
  },
  withdraw: async (amount, description = '') => {
    const response = await driverApi.post('/wallet/withdraw', { amount, description });
    return response.data;
  },
  getNotifications: async () => {
    const response = await driverApi.get('/notifications/my-notifications');
    return response.data;
  },
  createSupportTicket: async (subject, message) => {
    const response = await driverApi.post('/support/create', { subject, message });
    return response.data;
  },
  getMyTickets: async () => {
    const response = await driverApi.get('/support/my-tickets');
    return response.data;
  },
  getSupportSummary: async () => {
    const response = await driverApi.get('/support/report-summary');
    return response.data;
  }
};

export default driverService;
