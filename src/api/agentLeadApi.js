import axios from 'axios';

const _baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API_BASE_URL = _baseUrl.endsWith('/api') ? _baseUrl : `${_baseUrl.replace(/\/$/, '')}/api`;

const agentLeadApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

agentLeadApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('driver_token') || localStorage.getItem('driverToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getMarketplaceLeads = async () => {
    const response = await agentLeadApi.get("/agent-leads/marketplace");
    return response.data;
};

export const getMyAcceptedLeads = async () => {
    const response = await agentLeadApi.get("/agent-leads/driver/my-accepted-leads");
    return response.data;
};

export const initiateAcceptAgentLeadPayment = async (leadId) => {
    const response = await agentLeadApi.post(`/agent-leads/${leadId}/initiate-payment`);
    return response.data;
};

export const completeAgentLead = async (leadId) => {
    const response = await agentLeadApi.post(`/agent-leads/${leadId}/complete`);
    return response.data;
};

export const downloadAgentLeadReceipt = async (leadId) => {
    const response = await agentLeadApi.get(`/agent-leads/receipt/${leadId}`, {
        responseType: 'blob'
    });
    return response.data;
};

export const downloadDriverCommissionReceipt = async (leadId) => {
    const response = await agentLeadApi.get(`/agent-leads/driver-receipt/${leadId}`, {
        responseType: 'blob'
    });
    return response.data;
};
