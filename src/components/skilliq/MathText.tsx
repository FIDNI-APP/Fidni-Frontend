// Texte d'un quiz (écrit à la main, peut contenir $…$) : échappé puis rendu avec KaTeX et filtré.
import React from 'react';
import { renderContentHtml } from '@/components/editor/TipTapRenderer';

const mathHtml = (s: string) => renderContentHtml(s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));

export const MathText: React.FC<{ text: string; className?: string }> = ({ text, className }) => (
  <span className={className} dangerouslySetInnerHTML={{ __html: mathHtml(text) }} />
);
