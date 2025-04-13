// src/lib/api/apiClient.tsx - Update your interceptor

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Update the request interceptor
api.interceptors.request.use(
  (config) => {
    // Clear any existing Authorization headers first
    delete config.headers['Authorization'];
    
    // Only add token if it exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;