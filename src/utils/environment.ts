/**
 * Environment utility functions
 */

/**
 * Check if the application is running in development mode
 */
export const isDevelopment = (): boolean => {
    return import.meta.env.DEV;
  };
  
  /**
   * Check if the application is running in production mode
   */
  export const isProduction = (): boolean => {
    return import.meta.env.PROD;
  };
  
  /**
   * Get the current API URL based on the environment
   */
  export const getApiUrl = (): string => {
    return import.meta.env.VITE_API_URL as string;
  };
  
  /**
   * Get the base URL for the application
   */
  export const getBaseUrl = (): string => {
    return import.meta.env.BASE_URL;
  };
  
  /**
   * Log messages only in development mode
   */
  export const devLog = (...args: unknown[]): void => {
    if (isDevelopment()) {
      console.log(...args);
    }
  };
  
  /**
   * Get environment variables with fallbacks
   */
  export const getEnvVar = (key: string, fallback: string = ''): string => {
    const value = import.meta.env[`VITE_${key}`] as string | undefined;
    return value || fallback;
  };