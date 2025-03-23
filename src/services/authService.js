import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Fonction pour configurer axios avec le token JWT
const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Service d'authentification
const authService = {
  // Enregistrement d'un nouvel utilisateur
  register: async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register/`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Une erreur est survenue lors de l\'inscription' };
    }
  },

  // Connexion utilisateur
  login: async (credentials) => {
    try {
      const response = await axios.post(`${API_URL}/auth/token/`, credentials);
      if (response.data.access) {
        localStorage.setItem('token', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setAuthToken(response.data.access);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Identifiants invalides' };
    }
  },

  // Déconnexion
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await axios.post(`${API_URL}/auth/logout/`, { refresh: refreshToken });
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setAuthToken(null);
    }
  },

  // Rafraîchir le token JWT
  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('Pas de token de rafraîchissement');

      const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
        refresh: refreshToken
      });

      if (response.data.access) {
        localStorage.setItem('token', response.data.access);
        setAuthToken(response.data.access);
      }
      
      return response.data;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setAuthToken(null);
      throw error;
    }
  },

  // Vérifier si l'utilisateur est connecté
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Obtenir l'utilisateur actuellement connecté
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Réinitialisation du mot de passe
  requestPasswordReset: async (email) => {
    try {
      const response = await axios.post(`${API_URL}/auth/password/reset/`, { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Erreur lors de la demande de réinitialisation' };
    }
  },

  // Confirmation de réinitialisation du mot de passe
  confirmPasswordReset: async (uid, token, newPassword, confirmPassword) => {
    try {
      const response = await axios.post(`${API_URL}/auth/password/reset/confirm/`, {
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Erreur lors de la réinitialisation du mot de passe' };
    }
  },

  // Vérification d'email
  verifyEmail: async (uid, token) => {
    try {
      const response = await axios.post(`${API_URL}/auth/email/verify/`, { uid, token });
      if (response.data.access) {
        localStorage.setItem('token', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setAuthToken(response.data.access);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Erreur lors de la vérification de l\'email' };
    }
  },

  // Changement de mot de passe
  changePassword: async (oldPassword, newPassword, confirmPassword) => {
    try {
      const response = await axios.put(`${API_URL}/auth/password/change/`, {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Erreur lors du changement de mot de passe' };
    }
  }
};

// Configurer l'intercepteur pour rafraîchir le token
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si l'erreur est 401 (non autorisé) et que nous n'avons pas déjà essayé de rafraîchir
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await authService.refreshToken();
        // Réessayer la requête originale avec le nouveau token
        return axios(originalRequest);
      } catch (refreshError) {
        // Si le rafraîchissement échoue, déconnecter l'utilisateur
        authService.logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Initialiser avec le token existant au démarrage de l'application
const token = localStorage.getItem('token');
if (token) {
  setAuthToken(token);
}

export default authService; 