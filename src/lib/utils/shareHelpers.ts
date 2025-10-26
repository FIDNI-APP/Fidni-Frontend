/**
 * Share Helper Functions
 * Consolidated from multiple header components
 */

/**
 * Share content using Web Share API or fallback to clipboard
 * @param title - Content title
 * @param contentType - Type of content (exercise, exam, lesson)
 * @param url - Optional custom URL (defaults to current URL)
 * @returns Promise that resolves when sharing is complete
 */
export const handleShare = async (
  title: string,
  contentType: 'exercise' | 'exam' | 'lesson' | 'learning-path',
  url?: string
): Promise<void> => {
  const shareUrl = url || window.location.href;
  const contentTypeLabel = {
    exercise: 'exercice',
    exam: 'examen',
    lesson: 'leçon',
    'learning-path': 'parcours d\'apprentissage',
  }[contentType];

  const shareData = {
    title: `${title} - Fidni`,
    text: `Découvrez cet ${contentTypeLabel} de mathématiques sur Fidni`,
    url: shareUrl,
  };

  try {
    // Try Web Share API first (mobile-friendly)
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    // Fallback to clipboard
    await navigator.clipboard.writeText(shareUrl);

    // You can dispatch a custom event or call a toast notification here
    // For now, we'll just log success
    console.log('Lien copié dans le presse-papier!');

    // If you have a toast system, trigger it here:
    // toast.success('Lien copié dans le presse-papier!');
  } catch (error) {
    console.error('Erreur lors du partage:', error);
    throw error;
  }
};

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when copy is complete
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

/**
 * Generate share URLs for different platforms
 */
export const getShareUrls = (url: string, title: string) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
  };
};
