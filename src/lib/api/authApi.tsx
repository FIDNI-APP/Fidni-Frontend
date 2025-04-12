import api from './apiClient';

export const login = async (identifier: string, password: string) => {
  try {
    console.log(`Tentative de connexion avec: ${identifier}`);
    
    const response = await api.post('/token/', { 
      username: identifier,
      password 
    });
    
    if (response.data.access) {
      console.log('Connexion réussie, token obtenu');
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
    } else {
      console.warn('Réponse de connexion sans token d\'accès:', response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error('Erreur de connexion détaillée:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Réponse d\'erreur:', error.response.data);
      console.error('Status:', error.response.status);
    }
    throw error;
  }
};

export const logout = async () => {
  const response = await api.post('/auth/logout/');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  return response.data;
};

export const register = async (username: string, email: string, password: string) => {
  try {
    console.log(`Tentative d'inscription avec: ${username}, ${email}`);
    
    const response = await api.post('/auth/register/', { 
      username, 
      email, 
      password 
    });
    
    console.log('Inscription réussie:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erreur d\'inscription détaillée:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Réponse d\'erreur:', error.response.data);
      console.error('Status:', error.response.status);
    }
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return null; // Return null without making API call if no token exists
    }
    
    // Make sure the Authorization header is set correctly before making the request
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    const response = await api.get('/auth/user/');
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Token is invalid or expired, try to refresh
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const refreshResponse = await api.post('/token/refresh/', { 
            refresh: refreshToken 
          });
          
          if (refreshResponse.data.access) {
            localStorage.setItem('token', refreshResponse.data.access);
            api.defaults.headers.common['Authorization'] = `Bearer ${refreshResponse.data.access}`;
            
            // Retry the original request with new token
            const retryResponse = await api.get('/auth/user/');
            return retryResponse.data;
          }
        }
      } catch (refreshError) {
        // If refresh fails, clean up tokens
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
      }
    }
    return null;
  }
};

// Fix missing axios import
import axios from 'axios';