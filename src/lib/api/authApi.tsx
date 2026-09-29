import {api, clearTokens, storeTokens} from './apiClient';


/** Connexion par e-mail OU nom d'utilisateur. Renvoie { access, refresh, user }. */
export const login = async (identifier : string, password : string) => {
  const response = await api.post('/auth/login/', {
    identifier: identifier.trim(),
    password,
  });
  storeTokens(response.data.access, response.data.refresh);
  return response.data;
};

export const logout = async () => {
  // Les jetons sont effacés même si le serveur ne répond pas : se déconnecter doit toujours marcher.
  try {
    // Le serveur révoque ce jeton : il ne pourra plus rouvrir de session.
    await api.post('/auth/logout/', { refresh: localStorage.getItem('refresh_token') || undefined });
  } finally {
    clearTokens();
  }
};

// In src/lib/api/authApi.tsx
/** Cases de l'inscription (RGPD) : conditions acceptées, et 15 ans ou plus / accord d'un parent. */
export interface SignupConsents { accept_terms: boolean; age_ok: boolean }

export const register = async (username: string, email: string, password: string, consents: SignupConsents) => {
  try {
    // Remove any existing Authorization header for registration
    delete api.defaults.headers.common['Authorization'];
    
    const response = await api.post('/auth/register/', {
      username,
      email,
      password,
      ...consents,
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur d\'inscription détaillée:', error);
    throw error;
  }
};

// Confirm an email address from the link sent on signup.
export const verifyEmail = async (token: string) => {
  const response = await api.post('/auth/verify-email/', { token });
  return response.data;
};

// « Mot de passe oublié » : le serveur répond pareil que l'adresse existe ou non.
export const requestPasswordReset = async (email: string) => {
  const response = await api.post('/auth/password-reset/', { email: email.trim() });
  return response.data;
};

// Nouveau mot de passe depuis le lien reçu par e-mail (uid + token dans l'URL).
export const confirmPasswordReset = async (uid: string, token: string, password: string) => {
  const response = await api.post('/auth/password-reset/confirm/', { uid, token, password });
  return response.data;
};

// Re-send the verification email. Backend always responds generically.
export const resendVerification = async (email: string) => {
  const response = await api.post('/auth/resend-verification/', { email });
  return response.data;
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
    // Jeton refusé et non renouvelable : l'intercepteur de apiClient a déjà vidé la session.
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