import axios from 'axios';
import Cookies from 'js-cookie';
import { SortOption, ClassLevelModel, SubjectModel, ChapterModel, Solution, Difficulty, Theorem, Subfield } from '../types';

// Vérifier si nous sommes en mode production (preview) ou développement
const isProduction = import.meta.env.PROD;
const apiBaseUrl = isProduction 
  ? 'http://127.0.0.1:8000/api' // URL absolue en production
  : '/api'; // Chemin relatif en développement pour le proxy Vite

// Configurer Axios avec le bon baseURL selon le mode
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Demandes en attente de rafraîchissement du token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
  config: any;
}> = [];

// Traite les demandes en file d'attente une fois le token rafraîchi
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Intercepteur de requête pour ajouter le token CSRF
api.interceptors.request.use((config) => {
  const csrfToken = Cookies.get('csrftoken');
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }
  
  // Ajouter le token JWT s'il existe
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
});

// Intercepteur de réponse pour gérer les erreurs et le rafraîchissement du token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si l'erreur n'est pas 401 ou si la demande a déjà été retentée, rejeter directement
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    
    // Si nous sommes déjà en train de rafraîchir le token, mettre la demande en file d'attente
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject, config: originalRequest });
      })
        .then(token => {
          return api(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
    }
    
    originalRequest._retry = true;
    isRefreshing = true;
    
    // Tenter de rafraîchir le token
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      // Utiliser notre instance API configurée plutôt qu'axios directement
      const response = await api.post('/auth/token/refresh/', {
        refresh: refreshToken
      });
      
      if (response.status === 200) {
        localStorage.setItem('token', response.data.access);
        originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
        
        // Traiter la file d'attente avec le nouveau token
        processQueue(null, response.data.access);
        return api(originalRequest);
      }
    } catch (refreshError) {
      // En cas d'échec du rafraîchissement, déconnecter l'utilisateur
      processQueue(refreshError, null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      // Rediriger vers la page de connexion si nécessaire
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Add these functions to your existing lib/api.ts file

import { User, Content } from "@/types";

/**
 * Get user profile by ID or username
 * @param userId - User ID or username
 * @returns User object
 */
// Add these functions to your existing lib/api.ts file


/**
 * Get user profile by ID or username
 * This works with your current backend but uses the current user endpoint
 * for now since there's no specific endpoint for getting other users
 * 
 * @param userId - User ID or username
 * @returns User object
 */
export async function getUserById(userId: string): Promise<User> {
  try {
    // Currently your backend doesn't have a specific endpoint to get user by ID
    // You should use your current user endpoint for the logged-in user
    // For other users, we'll need to add that endpoint
    const response = await api.get('/auth/user');
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching user:", error);
    
    // Fallback for development - remove when backend is updated
    return {
      id: userId,
      username: "user_" + userId.substring(0, 5),
      email: `user${userId.substring(0, 5)}@example.com`,
      isAuthenticated: false,
      joinedAt: new Date().toISOString(),
      contributionsCount: 0,
      reputation: 0,
      bio: "This is a temporary user profile until the backend endpoint is implemented."
    };
  }
}

/**
 * Get exercises created by a specific user
 * @param userId - User ID or username
 * @returns Object containing results array of Content
 */
export async function getUserContributions(userId: string): Promise<{ results: Content[] }> {
  try {
    // You need to create this endpoint in your Django backend
    const response = await api.get(`/exercises?author=${userId}`);
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch user contributions: ${response.statusText}`);
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching user contributions:", error);
    
    // Return empty results array until backend is implemented
    return {
      results: []
    };
  }
}

/**
 * Get exercises saved by the current user
 * Note: This requires authentication
 * @returns Object containing results array of Content
 */
export async function getSavedContents(): Promise<{ results: Content[] }> {
  try {
    // This would use the user history endpoint for upvoted content
    // since you don't have a specific "saved" functionality yet
    const response = await api.get('/users/history');
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch saved content: ${response.statusText}`);
    }
    
    const data = response.data;
    
    // Use the upvoted content from history as "saved" for now
    return {
      results: data.upvoted || []
    };
  } catch (error) {
    console.error("Error fetching saved content:", error);
    
    // Return empty results array until backend is implemented
    return {
      results: []
    };
  }
}

/**
 * Get user statistics (works with your current backend)
 * @returns User statistics
 */

type VoteValue = 1 | -1 | 0;  // Matches Vote.UP, Vote.DOWN, Vote.UNVOTE
type VoteTarget = 'exercise' | 'solution' | 'comment';

const voteContent = async (contentId: string, value: VoteValue, target: VoteTarget) => {
  const endpoints = {
    exercise: `/exercises/${contentId}/vote/`,
    solution: `/solutions/${contentId}/vote/`,
    comment: `/comments/${contentId}/vote/`,
  };

  const response = await api.post(endpoints[target], { value });
  return response.data;
};

export const voteExercise = async (id: string, value: VoteValue) => {
  return voteContent(id, value, 'exercise');
};

export const voteSolution = async (id: string, value: VoteValue) => {
  return voteContent(id, value, 'solution');
};

export const voteComment = async (id: string, value: VoteValue) => {
  return voteContent(id, value, 'comment');
};

// Auth API
export const login = async (identifier: string, password: string) => {
  try {
    const response = await api.post('/auth/login/', { identifier, password });
    
    // Stocker les tokens JWT
    if (response.data.access) {
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
    }
    
    return {
      success: true,
      user: response.data.user,
      token: response.data.access
    };
  } catch (error) {
    console.error('Erreur de connexion:', error);
    
    // Formater un message d'erreur convivial
    let errorMessage = 'Une erreur s\'est produite lors de la connexion';
    
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 401) {
        errorMessage = 'Identifiant ou mot de passe incorrect';
      } else if (status === 400 && data.detail) {
        errorMessage = data.detail;
      } else if (data.non_field_errors) {
        errorMessage = data.non_field_errors[0];
      }
    }
    
    return {
      success: false,
      message: errorMessage
    };
  }
};

export const register = async (username: string, email: string, password: string) => {
  try {
    const response = await api.post('/auth/register/', { username, email, password });
    
    return {
      success: true,
      user: response.data.user,
      message: response.data.message || 'Inscription réussie ! Veuillez vérifier votre email pour activer votre compte.'
    };
  } catch (error) {
    console.error('Erreur d\'inscription:', error);
    
    // Formater un message d'erreur convivial
    let errorMessage = 'Une erreur s\'est produite lors de l\'inscription';
    let fieldErrors: Record<string, string> = {};
    
    if (axios.isAxiosError(error) && error.response) {
      const data = error.response.data;
      
      if (data.detail) {
        errorMessage = data.detail;
      } else {
        // Collecter les erreurs de champ
        if (data.username) fieldErrors.username = data.username[0];
        if (data.email) fieldErrors.email = data.email[0];
        if (data.password) fieldErrors.password = data.password[0];
        
        if (Object.keys(fieldErrors).length === 0 && data.non_field_errors) {
          errorMessage = data.non_field_errors[0];
        }
      }
    }
    
    return {
      success: false,
      message: errorMessage,
      fieldErrors
    };
  }
};

export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout/', { refresh: refreshToken });
    }
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la déconnexion', error);
    return { success: false, error };
  } finally {
    // Toujours nettoyer les tokens, même en cas d'erreur
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }
};

export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Utiliser notre instance API configurée plutôt qu'une URL relative
    const response = await api.post('/auth/token/refresh/', {
      refresh: refreshToken
    });
    
    if (response.data.access) {
      localStorage.setItem('token', response.data.access);
      return { success: true, token: response.data.access };
    } else {
      throw new Error('No access token in response');
    }
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token', error);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return { success: false, error };
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/user/');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur actuel', error);
    throw error;
  }
};

// Content API
export const getContents = async (params: {
  classLevels?: string[];
  subjects?: string[];
  chapters?: string[];
  difficulties?: Difficulty[];
  subfields?: Subfield[];
  theorems?: Theorem[];
  sort?: SortOption;
  page?: number;
  type?: string;
  per_page?: number;
}) => {
  const response = await api.get('/exercises/', { 
    params: {
      class_levels: params.classLevels,
      subjects: params.subjects,
      chapters: params.chapters,
      difficulties: params.difficulties,
      subfields : params.subfields,
      theorems : params.theorems
    } 
  });
  console.log(response.data.results)
  return {
    results: response.data.results || [],
    count: response.data.count || 0,
    next: response.data.next,
    previous: response.data.previous,
  };
};

export const createContent = async (data: {
  title: string;
  content: string;
  type: string;
  class_level: string[];
  subject: string;
  chapters: string[];
  difficulty: string;
  solution_content?: string;
}) => {
  const response = await api.post('/exercises/', data);
  return response.data;
};

export const getContentById = async (id: string) => {
  const response = await api.get(`/exercises/${id}/`);
  return response.data;
};

export const updateContent = async (id: string, data: {
  title: string;
  content: string;
  class_levels: string;
  subject: string;
  chapters: string[];
  difficulty: string;
  solution_content?: string;
}) => {
  const response = await api.put(`/exercises/${id}/`, data);
  return response.data;
};

export const deleteContent = async (id: string) => {
  await api.delete(`/exercises/${id}/`);
};

// Solution API
export const getSolution = async (id: string) => {
  const response = await api.get(`/solutions/${id}/`);
  return response.data;
};

export const updateSolution = async (id: string, data: { content: string }) => {
  const response = await api.put(`/solutions/${id}/`, data);
  return response.data;
};

export const deleteSolution = async (id: string) => {
  await api.delete(`/solutions/${id}/`);
};



export const addSolution = async (exerciseId: string, data: { content: string }): Promise<Solution> => {
  const response = await api.post(`/exercises/${exerciseId}/solution/`, data);
  return response.data;
};

// Comment API

export const addComment = async (exerciseId: string, content: string, parentId?: string) => {
  const response = await api.post(`/exercises/${exerciseId}/comment/`, { 
    content,
    parent: parentId
  });
  return response.data;
};

export const updateComment = async (commentId: string, content: string) => {
  const response = await api.put(`/comments/${commentId}/`, { content });
  return response.data;
};

export const deleteComment = async (commentId: string) => {
  await api.delete(`/comments/${commentId}/`);
};

// Content Tracking
export const markContentViewed = async (contentId: string) => {
  const response = await api.post(`/content/${contentId}/view/`);
  return response.data;
};

export const markContentCompleted = async (contentId: string) => {
  const response = await api.post(`/content/${contentId}/complete/`);
  return response.data;
};

// Hierarchical Data API
export const getClassLevels = async (): Promise<ClassLevelModel[]> => {
  const response = await api.get('/class-levels/');
  return response.data.results || [];
};

export const getSubjects = async (classLevelId?: string | string[]): Promise<SubjectModel[]> => {
  const params = classLevelId ? { class_level: classLevelId } : {};  // Si pas de classLevelId, params est vide
  const response = await api.get('/subjects/', { params });
  return response.data.results || [];
};




export const getSubfields = async (subjectId: string, classLevelIds: string[]): Promise<Subfield[]> => {
  const params = classLevelIds ? { class_level: classLevelIds, subject : subjectId } : {};  // Si pas de classLevelId, params est vide
  const response = await api.get('/subfields/', { params });
  return response.data.results || [];

};

export const getChapters = async (subjectId: string, classLevelIds: string[], subfieldId : string[]): Promise<ChapterModel[]> => {
  const params = classLevelIds ? { class_level: classLevelIds, subject : subjectId, subfields : subfieldId } : {};  // Si pas de classLevelId, params est vide
  const response = await api.get('/chapters/', { params });
  return response.data.results || [];

};

export const getTheorems = async (subjectId: string, classLevelIds: string[], subfieldId : string[], chaptersId : string[]): Promise<Theorem[]> => {
  const params = classLevelIds ? { class_level: classLevelIds, subject : subjectId, subfields : subfieldId, chapters: chaptersId } : {};  // Si pas de classLevelId, params est vide
  const response = await api.get('/theorems/', { params });
  return response.data.results || [];

};




// User Profile API
export const getUserProfile = async (username: string) => {
  const response = await api.get(`/users/${username}/`);
  return response.data;
};

export const updateUserProfile = async (data: any) => {
  const response = await api.put('/users/profile/', data);
  return response.data;
};



// User History and Stats
export const getUserHistory = async () => {
  const response = await api.get('/users/history/');
  return response.data;
};

export const getUserStats = async () => {
  const response = await api.get('/users/stats/');
  return response.data;
};

// Image Upload
export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post('/upload/image/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.url;
};


