import {api} from './apiClient';

export const login = async (identifier : string, password : string) => {
  try {
    const response = await api.post('/token/', { 
      username: identifier,
      password 
    });
    
    if (response.data.access) {
      // Store tokens
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      
      // Ensure proper format with space after "Bearer"
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
    }
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
export const logout = async () => {
  const response = await api.post('/auth/logout/');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  return response.data;
};

// In src/lib/api/authApi.tsx
export const register = async (username: string, email: string, password: string) => {
  try {
    // Remove any existing Authorization header for registration
    delete api.defaults.headers.common['Authorization'];
    
    const response = await api.post('/auth/register/', { 
      username, 
      email, 
      password 
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur d\'inscription détaillée:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  // First check if we have a token at all
  const token = localStorage.getItem('token');
  
  // If no token exists, return null or a "not authenticated" response
  if (!token) {
    return null; // Or { authenticated: false } or whatever makes sense for your app
  }
  
  try {
    const response = await api.get('/auth/user/');
    return response.data;
  } catch (error: any) {
    // If token is invalid, clear it
    if (error.response?.status === 403 && 
        error.response?.data?.code === 'token_not_valid') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
    console.error("Error getting current user:", error);
    return null; // Indicate not authenticated
  }
};

