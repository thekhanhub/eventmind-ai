import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getPlan = async () => {
  const response = await api.get('/plan');
  return response.data;
};

export const getTrace = async () => {
  const response = await api.get('/trace');
  return response.data;
};

export const getRejected = async () => {
  const response = await api.get('/rejected');
  return response.data;
};

export const getEvidence = async () => {
  const response = await api.get('/evidence');
  return response.data;
};

export const getHistory = async () => {
  const response = await api.get('/history');
  return response.data;
};

export const runInitialProcess = async (payload) => {
  const response = await api.post('/process/initial', payload);
  return response.data;
};

export const runUpdateProcess = async (payload) => {
  const response = await api.post('/process/update', payload);
  return response.data;
};

export const appendMessageAndProcess = async (messageText) => {
  const response = await api.post('/messages/append', { messageText });
  return response.data;
};

export default api;
