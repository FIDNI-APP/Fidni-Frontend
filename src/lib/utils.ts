import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import katex from 'katex';


// Utility function to merge Tailwind CSS classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
// lib/utils.ts

/**
 * Combines multiple class names into a single string
 * @param inputs - Class names to combine
 * @returns Combined class string
 */

/**
 * Formats a date string to a readable format
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Formats a date string to a relative time (e.g., "2 days ago")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 30) {
    return formatDate(dateString);
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}

/**
 * Helper to safely render HTML content
 * @param content - HTML content
 * @returns Object with __html property
 */
export function createMarkup(content: string) {
  return { __html: content };
}


export const truncateText = (text: string, maxLength: number): string => {
  let truncatedText = '';
  let currentLength = 0;
  const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
  let match;

  // Iterate over the text and find LaTeX expressions
  while ((match = regex.exec(text)) !== null) {
    const [latexExpr] = match;
    const startIndex = match.index;
    const endIndex = startIndex + latexExpr.length;

    // Add text before the LaTeX expression
    if (currentLength < maxLength) {
      const textBefore = text.slice(currentLength, startIndex);
      truncatedText += textBefore.slice(0, maxLength - currentLength);
      currentLength += textBefore.length;
    }

    // Add the LaTeX expression if it fits
    if (currentLength < maxLength) {
      truncatedText += latexExpr;
      currentLength += latexExpr.length;
    }

    // Stop if we've reached the max length
    if (currentLength >= maxLength) {
      break;
    }
  }

  // Add remaining text if there's space
  if (currentLength < maxLength) {
    truncatedText += text.slice(currentLength, maxLength);
  }

  return truncatedText + (currentLength > maxLength ? '......' : '');
};

export function renderLatexContent(content: string): string {
  // Replace inline math: $...$ with rendered LaTeX
  content = content.replace(/\$([^\$]+)\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex, { displayMode: false });
    } catch (error) {
      console.error('LaTeX parsing error:', error);
      return match;
    }
  });

  // Replace display math: $$...$$
  content = content.replace(/\$\$([^\$]+)\$\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex, { displayMode: true });
    } catch (error) {
      console.error('LaTeX parsing error:', error);
      return match;
    }
  });

  return content;
}
