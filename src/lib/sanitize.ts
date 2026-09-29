// src/lib/sanitize.ts
import DOMPurify from 'dompurify';

/**
 * Nettoie du HTML avant de l'injecter dans la page (dangerouslySetInnerHTML).
 *
 * Les contenus, solutions et commentaires sont écrits par les utilisateurs : sans ce
 * filtre, un `<img onerror=…>` ou un lien `javascript:` exécuterait du code chez chaque
 * lecteur et pourrait voler sa session. On garde la mise en forme (titres, listes,
 * tableaux, images, couleurs, encadrés `data-*`) et le rendu KaTeX ; tout ce qui peut
 * exécuter du code (scripts, attributs `on*`, `javascript:`, iframes, formulaires) est retiré.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true, mathMl: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed'],
  });
}

// Les liens qui ouvrent un nouvel onglet ne doivent pas pouvoir piloter la page d'origine.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node instanceof Element && node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
