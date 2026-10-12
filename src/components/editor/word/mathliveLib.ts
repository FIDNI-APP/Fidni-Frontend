/**
 * MathLive et ses polices, chargés ensemble à la demande par `loadMathLive()` (mathlive.ts).
 * Passer par ce fichier du projet est voulu : en production, l'obfuscation passe avant Vite et un
 * `import('mathlive')` (nom de paquet) restait tel quel dans le code livré (« Failed to resolve module
 * specifier ») ; un import relatif, comme ceux des pages, est bien résolu.
 */
import 'mathlive/fonts.css';

export { MathfieldElement } from 'mathlive';
