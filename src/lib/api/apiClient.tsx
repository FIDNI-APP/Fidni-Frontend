// src/lib/api/apiClient.tsx
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // This might be causing issues
});

// src/lib/api/apiClient.tsx
api.interceptors.request.use(
  (config) => {
    // Clear any existing Authorization headers first
    delete config.headers['Authorization'];
    
    // Only add token if it exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Add a custom header to identify anonymous requests
      config.headers['X-Anonymous-Request'] = 'true';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);