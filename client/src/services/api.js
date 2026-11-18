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

export const runInitialProcess = async (payload) => {
  const response = await api.post('/process/initial', payload);
  return response.data;
};

export const runUpdateProcess = async (payload) => {
  const response = await api.post('/process/update', payload);
  return response.data;
};

export default api;
