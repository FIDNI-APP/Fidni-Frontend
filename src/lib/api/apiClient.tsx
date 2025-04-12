import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add a request interceptor to handle authentication
api.interceptors.request.use(
  (config) => {
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

// Simplified response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    
    // Special handling for auth endpoints
    if (error.config.url === '/auth/user/' && (error.response?.status === 401 || error.response?.status === 403)) {
      console.log("User not authenticated, returning null");
      return Promise.resolve({ data: null });
    }
    
    return Promise.reject(error);
  }
);

export default api;