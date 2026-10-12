/* eslint-disable react-refresh/only-export-components -- module de construction de la feuille (fonctions + petits composants) */
/**
 * Blocs de la feuille FIDNI (12/10/2026) : ce qui compose une feuille imprimée (exercices, devoirs, leçons,
 * corrigé), découpé en blocs jamais coupés d'une page à l'autre. Partagé par l'aperçu PDF (PaperExport) et
 * l'écriture sur la feuille dans « Ajouter un contenu » : les deux mettent en page exactement pareil.
 */
import React, { useMemo } from 'react';
import { renderContentHtml } from '@/components/editor/TipTapRenderer';
import { ROMAN } from '@/lib/paperFont';
import type { SheetBlock } from './PagedSheet';

export type SolutionsMode = 'none' | 'end' | 'inline';

export interface RichText { html?: string }
export interface SubQuestion { id: string; content?: RichText; points?: number; hint?: RichText; solution?: RichText }
export interface Block {
  id: string;
  type: 'context' | 'question' | 'section' | string;
  content?: RichText;
  points?: number;
  hint?: RichText;
  solution?: RichText;
  subQuestions?: SubQuestion[];
}

export interface LessonSub { id: string; title?: string; content?: RichText }
export interface LessonSection { id: string; title?: string; content?: RichText; subSections?: LessonSub[] }

export interface PaperItem {
  key: string;
  kind: 'exercise' | 'exam' | 'lesson';
  title: string;
  blocks: Block[];
  /** Leçon : ses parties. */
  sections?: LessonSection[];
  /** Cahier : chapitre ouvert par cette leçon, et notes de l'élève sur ce chapitre. */
  chapterHeading?: string;
  chapterNotes?: string;
  subject?: string;
  level?: string;
  difficulty?: string;
  nationalYear?: number;
  durationMinutes?: number;
}

export interface PaperData {
  title: string;
  description?: string;
  kindLabel: string;
  items: PaperItem[];
  /** Leçon ou cahier : pas de barème ni de cases « Nom, classe » par défaut. */
  reading?: boolean;
  isNotebook?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toItem = (c: any, key: string): PaperItem => ({
  key,
  kind: c.type === 'exam' ? 'exam' : c.type === 'lesson' ? 'lesson' : 'exercise',
  title: c.title || 'Sans titre',
  blocks: Array.isArray(c.structure?.blocks) ? c.structure.blocks : [],
  sections: Array.isArray(c.structure?.sections) ? c.structure.sections : undefined,
  subject: typeof c.subject === 'string' ? c.subject : c.subject?.name,
  level: c.class_levels?.[0] ? (typeof c.class_levels[0] === 'string' ? c.class_levels[0] : c.class_levels[0].name) : undefined,
  difficulty: c.difficulty,
  nationalYear: c.is_national_exam ? c.national_year : undefined,
  durationMinutes: c.duration_minutes || undefined,
});

/** « 0,5 pt », « 2 pts » : notation française des barèmes. */
export const formatPoints = (n: number) => `${String(n).replace('.', ',')} pt${n > 1 ? 's' : ''}`;

const blockPoints = (b: Block) =>
  b.subQuestions?.length ? b.subQuestions.reduce((s, sq) => s + (Number(sq.points) || 0), 0) : Number(b.points) || 0;

export const itemPoints = (item: PaperItem) =>
  item.blocks.filter((b) => b.type === 'question').reduce((s, b) => s + blockPoints(b), 0);

export const hasSolutions = (item: PaperItem) =>
  item.blocks.some((b) => b.solution?.html || b.subQuestions?.some((sq) => sq.solution?.html));

export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`;
};

export const uniq = (values: (string | undefined)[]) => [...new Set(values.filter(Boolean))] as string[];


export const Rich: React.FC<{ content?: RichText; className?: string }> = ({ content, className }) => {
  const html = useMemo(() => renderContentHtml(content?.html || ''), [content?.html]);
  if (!html) return null;
  // Déjà filtré par sanitizeHtml dans renderContentHtml.
  return <div className={`fp-rich ${className || ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
};

/**
 * Contenu riche découpé en ses paragraphes (et encadrés, listes, formules centrées) : une leçon longue
 * peut changer de page entre deux paragraphes. HTML déjà rendu et filtré (renderContentHtml).
 */
export const richParts = (html?: string): string[] => {
  const rendered = renderContentHtml(html || '');
  if (!rendered || typeof DOMParser === 'undefined') return rendered ? [rendered] : [];
  const doc = new DOMParser().parseFromString(`<div>${rendered}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return [rendered];
  const out: string[] = [];
  root.childNodes.forEach((n) => {
    if (n.nodeType === 1) out.push((n as Element).outerHTML);
    else if (n.textContent?.trim()) out.push(`<p>${n.textContent}</p>`);
  });
  return out.length ? out : [rendered];
};
export const RichPart: React.FC<{ html: string; className?: string }> = ({ html, className }) => (
  <div className={`fp-rich ${className || ''}`} dangerouslySetInnerHTML={{ __html: html }} />
);

/** Corrigé imprimé : l'indication (la méthode, bouton à part sur le site) reprend sa place en tête de la solution. */
const withMethod = (q: { hint?: RichText; solution?: RichText }): RichText | undefined => {
  if (!q.solution?.html || !q.hint?.html) return q.solution;
  const raw = q.hint.html.trim().replace(/^<p>([\s\S]*)<\/p>$/, '$1');
  // « On factorise… » reprend en minuscule après « Méthode : » (comme dans la rédaction d'origine).
  const idea = /^[A-ZÀ-Ý][a-zà-ÿ]/.test(raw) ? raw[0].toLowerCase() + raw.slice(1) : raw;
  return { html: `<p><strong>Méthode :</strong> ${idea}</p>${q.solution.html}` };
};

const Solution: React.FC<{ content?: RichText }> = ({ content }) =>
  content?.html ? (
    <div className="fp-sol">
      <span className="fp-sol-label">Solution</span>
      <Rich content={content} />
    </div>
  ) : null;

export const letter = (i: number) => String.fromCharCode(97 + (i % 26));

/** Énoncé d'un exercice : un bloc par question, sous-question, partie, texte d'introduction. */
export const exerciseBlocks = (item: PaperItem, inlineSolutions: boolean): SheetBlock[] => {
  const out: SheetBlock[] = [];
  let q = 0;
  const k = (s: string) => `${item.key}:${s}`;
  item.blocks.forEach((b, bi) => {
    if (b.type === 'context') {
      richParts(b.content?.html).forEach((h, i) => out.push({ key: k(`c${bi}.${i}`), node: <RichPart html={h} className="fp-context" /> }));
      return;
    }
    if (b.type === 'section') {
      q = 0; // chaque partie d'un examen renumérote ses questions
      out.push({ key: k(`s${bi}`), keepWithNext: true, node: (
        <div className="fp-part">
          <Rich content={b.content} />
          <span className="fp-pts">{Number(b.points) > 0 ? `(${formatPoints(Number(b.points))})` : ''}</span>
        </div>
      ) });
      return;
    }
    q += 1;
    const subs = b.subQuestions || [];
    const lastOfGroup = (i: number) => i === subs.length - 1 && !inlineSolutions;
    out.push({ key: k(`q${bi}`), keepWithNext: subs.length > 0, node: (
      <div className={`fp-q ${!subs.length && !inlineSolutions ? 'fp-q-last' : ''}`}>
        <span className="fp-num">{q}.</span>
        <Rich content={b.content} />
        <span className="fp-pts">{!subs.length && Number(b.points) > 0 ? `(${formatPoints(Number(b.points))})` : ''}</span>
      </div>
    ) });
    if (!subs.length && inlineSolutions && b.solution?.html) out.push({ key: k(`q${bi}sol`), node: <Solution content={withMethod(b)} /> });
    subs.forEach((sq, i) => {
      out.push({ key: k(`q${bi}.${i}`), node: (
        <div className={`fp-q fp-sq ${lastOfGroup(i) ? 'fp-q-last' : ''}`}>
          <span className="fp-num">{letter(i)})</span>
          <Rich content={sq.content} />
          <span className="fp-pts">{Number(sq.points) > 0 ? `(${formatPoints(Number(sq.points))})` : ''}</span>
        </div>
      ) });
      if (inlineSolutions && sq.solution?.html) out.push({ key: k(`q${bi}.${i}sol`), node: <div className="fp-sq-sol"><Solution content={withMethod(sq)} /></div> });
    });
  });
  return out;
};

export const stripHtml = (h?: string) => (h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** Leçon : parties numérotées I, II… et sous-parties 1, 2…, encadrés (définitions, théorèmes) conservés. */
export const lessonBlocks = (item: PaperItem): SheetBlock[] => {
  const out: SheetBlock[] = [];
  (item.sections || []).forEach((sec, i) => {
    if (sec.title) out.push({ key: `${item.key}:h${i}`, keepWithNext: true, node: <h2 className="fp-l-h2"><span>{ROMAN[i] || i + 1}.</span> {stripHtml(sec.title)}</h2> });
    richParts(sec.content?.html).forEach((h, k) => out.push({ key: `${item.key}:s${i}.${k}`, node: <RichPart html={h} /> }));
    (sec.subSections || []).forEach((sub, j) => {
      if (sub.title) out.push({ key: `${item.key}:h${i}.${j}`, keepWithNext: true, node: <h3 className="fp-l-h3 fp-l-indent"><span>{j + 1}.</span> {stripHtml(sub.title)}</h3> });
      richParts(sub.content?.html).forEach((h, k) => out.push({ key: `${item.key}:s${i}.${j}.${k}`, node: <RichPart html={h} className="fp-l-indent" /> }));
    });
  });
  return out;
};

/** Corrigé regroupé en fin de document, sur une nouvelle page. */
export const answerKeyBlocks = (items: PaperItem[]): SheetBlock[] => {
  const out: SheetBlock[] = [{ key: 'key:title', breakBefore: true, keepWithNext: true, node: <h2 className="fp-key-title">Corrigé</h2> }];
  items.forEach((item, idx) => {
    if (!hasSolutions(item)) return;
    out.push({ key: `key:${item.key}`, keepWithNext: true, node: (
      <h3 className="fp-key-ex-title">{item.kind === 'exam' ? 'Examen' : 'Exercice'} {idx + 1} <span>— {item.title}</span></h3>
    ) });
    let q = 0;
    item.blocks.forEach((b, bi) => {
      if (b.type === 'section') {
        q = 0;
        out.push({ key: `key:${item.key}:s${bi}`, keepWithNext: true, node: <Rich content={b.content} className="fp-part" /> });
        return;
      }
      if (b.type !== 'question') return;
      q += 1;
      const n = q;
      const subs = b.subQuestions || [];
      if (!subs.length) {
        if (b.solution?.html) out.push({ key: `key:${item.key}:q${bi}`, node: <div className="fp-q fp-key-q"><span className="fp-num">{n}.</span><Rich content={withMethod(b)} /><span /></div> });
        return;
      }
      subs.forEach((sq, i) => {
        if (sq.solution?.html) out.push({ key: `key:${item.key}:q${bi}.${i}`, node: <div className="fp-q fp-key-q"><span className="fp-num">{n}.{letter(i)})</span><Rich content={withMethod(sq)} /><span /></div> });
      });
    });
  });
  return out;
};


export interface SheetHeader {
  kindLabel: string;
  subjects: string[];
  levels: string[];
  title: string;
  description?: string;
  facts: (string | null | false | undefined)[];
  school: string;
  teacher: string;
  className: string;
  schoolYear: string;
  instructions: string;
  studentLine: boolean;
}

/** En-tête de la feuille : bandeau Fidni, établissement et classe, titre, cases « Nom et prénom ». */
export const sheetHeaderBlocks = (h: SheetHeader): SheetBlock[] => {
  const custom = h;
  const { subjects, levels } = h;
  const paperTitle = h.title;
  const facts = h.facts.filter(Boolean) as string[];
  const data = { kindLabel: h.kindLabel, description: h.description };
  const blocks: SheetBlock[] = [];
  blocks.push({ key: 'top', node: (
    <header className="fp-top">
      <div className="fp-brand">
        <img src="/android-chrome-192x192.png" alt="" />
        <div><strong>Fidni</strong><small>fidni.fr</small></div>
      </div>
      <div className="fp-top-right">
        <strong>{data.kindLabel}</strong>
        {(subjects.length === 1 || (levels.length === 1 && !custom.className)) && (
          <small>{[subjects.length === 1 ? subjects[0] : null, levels.length === 1 && !custom.className ? levels[0] : null].filter(Boolean).join(' · ')}</small>
        )}
      </div>
    </header>
  ) });
  if (custom.school || custom.teacher || custom.schoolYear || custom.className) {
    blocks.push({ key: 'info', node: (
      <div className="fp-info">
        <div>
          {custom.school && <p><b>Établissement :</b> {custom.school}</p>}
          {custom.teacher && <p><b>Professeur :</b> {custom.teacher}</p>}
        </div>
        <div className="fp-info-right">
          {custom.schoolYear && <p><b>Année scolaire :</b> {custom.schoolYear}</p>}
          {custom.className && <p><b>Classe :</b> {custom.className}</p>}
        </div>
      </div>
    ) });
  }
  blocks.push({ key: 'title', keepWithNext: true, node: (
    <>
      <h1 className="fp-title">{paperTitle}</h1>
      {data.description && <p className="fp-desc">{data.description}</p>}
      <p className="fp-facts">{facts.join('  ·  ')}</p>
    </>
  ) });
  if (custom.instructions.trim()) {
    blocks.push({ key: 'instructions', node: <div className="fp-instructions"><b>Consignes.</b> {custom.instructions.trim()}</div> });
  }
  if (custom.studentLine) {
    blocks.push({ key: 'student', node: (
      <div className="fp-student">
        <span>Nom et prénom : <i /></span>
        <span>{custom.className ? 'N° :' : 'Classe :'} <i /></span>
      </div>
    ) });
  }
  return blocks;
};
