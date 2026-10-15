/**
 * Texte simple avec formules $…$ (transcription d'une copie, commentaires de correction) affiché comme le reste du
 * site : formules rendues par KaTeX (TipTapRenderer), une ligne = un paragraphe. Le texte est échappé avant : rien
 * de ce qu'a écrit l'élève ou l'IA n'est interprété comme du HTML.
 */
import TipTapRenderer from '@/components/editor/TipTapRenderer';

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function texteEnHtml(texte: string): string {
  return texte.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => `<p>${echapper(l)}</p>`).join('');
}

export default function TexteMaths({ texte, className = '' }: { texte: string; className?: string }) {
  if (!texte.trim()) return null;
  return <div dir="auto" className={className}><TipTapRenderer content={texteEnHtml(texte)} /></div>;
}
