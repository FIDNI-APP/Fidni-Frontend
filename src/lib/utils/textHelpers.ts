/**
 * Text Helper Functions
 * Consolidated text manipulation utilities
 */

/**
 * Truncate text to a maximum length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 100)
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Truncate title specifically for cards
 * @param title - Title to truncate
 * @param maxLength - Maximum length (default: 60)
 * @returns Truncated title
 */
export const truncateTitle = (title: string, maxLength: number = 60): string => {
  return truncateText(title, maxLength);
};

/**
 * Strip HTML tags from a string
 * @param html - HTML string
 * @returns Plain text without HTML tags
 */
export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Get excerpt from HTML content
 * @param html - HTML content
 * @param maxLength - Maximum length of excerpt (default: 160)
 * @returns Plain text excerpt
 */
export const getExcerpt = (html: string, maxLength: number = 160): string => {
  const plainText = stripHtml(html);
  return truncateText(plainText, maxLength);
};

/**
 * Pluralize a word based on count
 * @param count - Number to check
 * @param singular - Singular form
 * @param plural - Plural form (optional, defaults to singular + 's')
 * @returns Pluralized word
 */
export const pluralize = (count: number, singular: string, plural?: string): string => {
  if (count <= 1) return singular;
  return plural || `${singular}s`;
};

/**
 * Format a count with label (e.g., "5 exercices", "1 leçon")
 * @param count - Number
 * @param singular - Singular label
 * @param plural - Plural label (optional)
 * @returns Formatted string
 */
export const formatCount = (count: number, singular: string, plural?: string): string => {
  return `${count} ${pluralize(count, singular, plural)}`;
};

/**
 * Capitalize first letter of a string
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export const capitalize = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Convert string to title case
 * @param text - Text to convert
 * @returns Title cased text
 */
export const toTitleCase = (text: string): string => {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};
