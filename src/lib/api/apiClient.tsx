// src/lib/api/apiClient.tsx
import axios from 'axios';

// Create the API instance without setting the Authorization header initially
export const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, 
});

// Add a request interceptor to dynamically check and add the token
api.interceptors.request.use(
  config => {
    // Get the token from localStorage on each request
    const token = localStorage.getItem('token');
    
    // Only add the Authorization header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Remove Authorization header if no token exists
      delete config.headers.Authorization;
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Handle response errors - especially for invalid tokens
api.interceptors.response.use(
  response => response,
  error => {
    // Check if error is due to invalid token
    if (error.response && 
        error.response.status === 403 && 
        error.response.data?.code === 'token_not_valid') {
      
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      
      // Remove Authorization header
      delete api.defaults.headers.common['Authorization'];
    }
    
    return Promise.reject(error);
  }
);