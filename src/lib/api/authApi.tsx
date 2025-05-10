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
    
    // Si la connexion automatique est incluse dans la réponse d'inscription
    if (response.data.access) {
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
    }
    
    return response.data;
  } catch (error) {
    console.error('Erreur d\'inscription détaillée:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  // First check if we have a token at all
  const token = localStorage.getItem('token');
  
  // If no token exists, return null immediately
  if (!token) {
    return null;
  }
  
  try {
    const response = await api.get('/auth/user/');
    return response.data;
  } catch (error: any) {
    // If token is invalid, clear it
    if (error.response?.status === 403 && 
        error.response?.data?.code === 'token_not_valid') {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      // Also remove the Authorization header
      delete api.defaults.headers.common['Authorization'];
    }
    console.error("Error getting current user:", error);
    return null;
  }
};

// Nouvelle fonction pour vérifier si l'utilisateur doit compléter son profil
export const shouldCompleteProfile = async () => {
  // D'abord vérifier si nous avons un token
  const token = localStorage.getItem('token');
  if (!token) {
    return false; // Pas de token, donc pas besoin de compléter le profil
  }
  
  try {
    // Obtenir les informations de l'utilisateur actuel
    const userData = await getCurrentUser();
    
    // Vérifier si l'utilisateur doit compléter son profil
    // Retourner true si l'utilisateur existe mais n'a pas encore complété son onboarding
    return userData && userData.profile && !userData.profile.onboarding_completed;
  } catch (error) {
    console.error('Erreur lors de la vérification du statut du profil:', error);
    return false;
  }
};