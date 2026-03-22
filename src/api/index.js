// src/api/index.js
import axios from "axios";
import { API_BASE_URL } from "./config";

// Base API instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Optionally add interceptors here to automatically attach the driver_token to headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("driver_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==========================================
// DRIVER APIs
// ==========================================

export const driverLogin = async (email, password) => {
  const response = await api.post("/api/drivers/login", { email, password });
  return response.data;
};

// Add other APIs here as needed:
// export const getDriverProfile = async () => { ... }
