/**
 * Texte simple avec formules $…$ (transcription d'une copie, commentaires de correction) affiché comme le reste du
 * site : formules rendues par KaTeX (TipTapRenderer), une ligne = un paragraphe. Le texte est échappé avant : rien
 * de ce qu'a écrit l'élève ou l'IA n'est interprété comme du HTML.
 */
import TipTapRenderer from '@/components/editor/TipTapRenderer';

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Filet de sécurité : un morceau de LaTeX écrit sans $…$ par l'IA (« Σ_{k=1}^{n} », « H_{n+1} », « \frac{1}{k} »)
// est encadré pour être rendu au lieu de s'afficher brut. Seulement hors des $…$ déjà présents.
const LATEX_NU = /_\{|\^\{|\\[a-zA-Z]|[A-Za-z)]_[A-Za-z0-9]|[A-Za-z0-9)]\^[A-Za-z0-9(]/;

function encadrerLatexNu(ligne: string): string {
  if ((ligne.match(/\$/g) || []).length % 2) return ligne; // $ non appariés : on ne touche à rien
  return ligne.split('$').map((morceau, i) => (i % 2 ? morceau : morceau.split(/(\s+)/).map((mot) =>
    LATEX_NU.test(mot) ? `$${mot.replace(/Σ/g, '\\sum')}$` : mot).join(''))).join('$');
}

export function texteEnHtml(texte: string): string {
  return texte.split('\n').map((l) => l.trim()).filter(Boolean)
    .map((l) => `<p>${echapper(encadrerLatexNu(l))}</p>`).join('');
}

export default function TexteMaths({ texte, className = '' }: { texte: string; className?: string }) {
  if (!texte.trim()) return null;
  return <div dir="auto" className={className}><TipTapRenderer content={texteEnHtml(texte)} /></div>;
}
