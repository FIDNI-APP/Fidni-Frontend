// src/lib/api/apiClient.tsx
import axios from 'axios';

const ACCESS_KEY = 'token';
const REFRESH_KEY = 'refresh_token';

// Create the API instance without setting the Authorization header initially
export const api = axios.create({
  baseURL: 'https://api.fidni.fr/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export function storeTokens(access: string, refresh?: string) {
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  delete api.defaults.headers.common['Authorization'];
}

/** Émis quand la session ne peut plus être renouvelée : l'AuthContext repasse en visiteur. */
export const SESSION_EXPIRED_EVENT = 'fidni:session-expired';

// Add a request interceptor to dynamically check and add the token
api.interceptors.request.use(
  config => {
    // Get the token from localStorage on each request
    const token = localStorage.getItem(ACCESS_KEY);

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

let refreshing: Promise<string | null> | null = null;

/**
 * Renouvelle le jeton d'accès (valable 1 h) avec le jeton de rafraîchissement (14 jours).
 * Plusieurs requêtes qui échouent en même temps partagent un seul renouvellement.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    const refresh = localStorage.getItem(REFRESH_KEY);
    refreshing = (refresh
      ? axios.post(`${api.defaults.baseURL}/token/refresh/`, { refresh })
          .then((r) => { storeTokens(r.data.access, r.data.refresh); return r.data.access as string; })
          .catch(() => null)
      : Promise.resolve(null)
    ).finally(() => { refreshing = null; });
  }
  return refreshing;
}

// 401 = jeton expiré ou invalide : on le renouvelle en silence, puis on rejoue la requête.
// Un 403 (« pas le droit ») ne touche PAS à la session : avant, il déconnectait l'élève.
api.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 &&
        originalRequest?.headers?.Authorization &&
        !originalRequest._retry) {
      originalRequest._retry = true;

      const fresh = await refreshAccessToken();
      if (fresh) {
        originalRequest.headers.Authorization = `Bearer ${fresh}`;
        return api(originalRequest);
      }

      // Session terminée : on repasse en visiteur et on rejoue sans jeton (lecture publique).
      clearTokens();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      delete originalRequest.headers.Authorization;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);
