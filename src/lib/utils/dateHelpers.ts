/**
 * Date Helper Functions
 * Consolidated from multiple components (ExamDetail, ExerciseDetail, ExamCard, ContentCard, etc.)
 */

/**
 * Format a date string to a human-readable format
 * @param dateString - ISO date string or null
 * @returns Formatted date string like "12 janvier 2024" or "Date non spécifiée"
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Date non spécifiée';

  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Convert date to relative time (e.g., "il y a 2 jours")
 * @param dateString - ISO date string
 * @returns Relative time string in French
 */
export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'à l\'instant';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} jour${days > 1 ? 's' : ''}`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;

  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;

  const years = Math.floor(days / 365);
  return `il y a ${years} an${years > 1 ? 's' : ''}`;
};

/**
 * Alternative implementation of time ago (used in some card components)
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export const getTimeAgo = (dateString: string): string => {
  return formatTimeAgo(dateString);
};

/**
 * Format time in seconds to human-readable format (e.g., "1h 23min")
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
};

/**
 * Format seconds to MM:SS format for timers
 * @param seconds - Time in seconds
 * @returns Formatted time string like "05:30"
 */
export const formatTimerDisplay = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Check if a date is in the future
 * @param dateString - ISO date string
 * @returns True if date is in the future
 */
export const isFutureDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  return date.getTime() > now.getTime();
};

/**
 * Check if a date is in the past
 * @param dateString - ISO date string
 * @returns True if date is in the past
 */
export const isPastDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  return date.getTime() < now.getTime();
};
