// src/lib/api/apiClient.tsx
import axios from 'axios';

// Create the API instance without setting the Authorization header initially
export const api = axios.create({
  baseURL: 'https://api.fidni.fr/api',
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
  async (error) => {
    const originalRequest = error.config;

    if (error.response &&
        (error.response.status === 401 || error.response.status === 403) &&
        originalRequest?.headers?.Authorization &&
        !originalRequest._retry) {
      // Token was sent but rejected — clear it
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      delete api.defaults.headers.common['Authorization'];

      // Retry the request without the token (allows anonymous read access)
      originalRequest._retry = true;
      delete originalRequest.headers.Authorization;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);