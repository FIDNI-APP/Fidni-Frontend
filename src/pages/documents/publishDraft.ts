/**
 * « Publier sur FIDNI » (12/10/2026) : un document (écrit ici ou importé de Word) découpé en brouillon de
 * l'assistant « Ajouter un contenu », qui s'ouvre prérempli ; le prof y choisit niveau, chapitre et
 * difficulté, vérifie le découpage, puis publie.
 *
 *  - Exercice / devoir : une liste numérotée = une question par élément ; une liste dans un élément = ses
 *    sous-questions. Sans liste, « 1) », « 2. »… en début de paragraphe ouvrent une question, « a) » une
 *    sous-question. Le reste (énoncé, données) devient un bloc de contexte. « (1 pt) » en fin de question
 *    devient son barème. Devoir : chaque titre (« Exercice 2 », « Problème ») ouvre une partie.
 *  - Leçon : chaque titre ouvre une partie, les sous-titres des sous-parties.
 */
import type { ExerciseBlock, SubQuestionBlock } from '@/components/content/editor/FlexibleExerciseEditor';
import type { SectionBlock } from '@/components/content/editor/FlexibleLessonEditor';
import type { WizardContentType } from '@/lib/api/contentWriteApi';

export interface ContentPrefill {
  type: WizardContentType;
  title: string;
  durationMinutes?: number | null;
  blocks?: ExerciseBlock[];
  sections?: SectionBlock[];
  /** Nom du document d'origine (bandeau de l'assistant). */
  from: string;
  /** Le document lui-même : changer de type dans l'assistant le redécoupe. */
  source: { html: string; duree?: unknown };
}

const newId = () => Math.random().toString(36).slice(2, 9);
const text = (el: Element | null) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
const outer = (els: Element[]) => els.map((e) => e.outerHTML).join('');
const QUESTION_RE = /^\s*(\d{1,2})\s*[).°-]\s+/;
const SUB_RE = /^\s*([a-h])\s*[)-]\s+/;
const POINTS_RE = /\(\s*(\d+(?:[.,]\d+)?)\s*(?:pts?|points?)\s*\)\s*$/i;

/** « … (1,5 pt) » en fin de texte → barème, retiré du HTML. */
function takePoints(html: string): { html: string; points?: number } {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if ((n.textContent || '').trim()) last = n as Text;
  const m = last?.textContent?.match(POINTS_RE);
  if (!last || !m) return { html };
  last.textContent = (last.textContent || '').replace(POINTS_RE, '').replace(/\s+$/, '');
  return { html: doc.body.firstElementChild?.innerHTML ?? html, points: Number(m[1].replace(',', '.')) };
}

/** Retire « 1) » / « a) » du début du premier texte d'un paragraphe. */
function stripLead(el: Element, re: RegExp): string {
  const clone = el.cloneNode(true) as Element;
  const walker = clone.ownerDocument.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!(n.textContent || '').trim()) continue;
    n.textContent = (n.textContent || '').replace(re, '');
    break;
  }
  return clone.outerHTML;
}

const question = (html: string, subs: SubQuestionBlock[] = []): ExerciseBlock => {
  const p = takePoints(html);
  return { id: newId(), type: 'question', content: { type: 'text', html: p.html }, subQuestions: subs, ...(p.points ? { points: p.points } : {}) };
};
const sub = (html: string): SubQuestionBlock => {
  const p = takePoints(html);
  return { id: newId(), content: { type: 'text', html: p.html }, ...(p.points ? { points: p.points } : {}) };
};

/** Les blocs d'une partie (entre deux titres). */
function exerciseBlocksOf(els: Element[]): ExerciseBlock[] {
  const out: ExerciseBlock[] = [];
  let context: Element[] = [];
  let current: { html: string[]; subs: string[][] } | null = null;
  const flushContext = () => {
    if (context.some((e) => text(e) || e.querySelector('img'))) out.push({ id: newId(), type: 'context', content: { type: 'text', html: outer(context) }, subQuestions: [] });
    context = [];
  };
  const flushQuestion = () => {
    if (!current) return;
    out.push(question(current.html.join(''), current.subs.map((s) => sub(s.join('')))));
    current = null;
  };
  // Dernière question venue d'une liste : une liste « a), b) » ou une formule centrée qui la suit s'y rattache.
  let lastListQ: ExerciseBlock | null = null;
  const alpha = (ol: Element) => /^[aA]$/.test(ol.getAttribute('type') || '') || /alpha/.test((ol as HTMLElement).style?.listStyleType || '');
  const items = (ol: Element) => Array.from(ol.children).filter((c) => c.tagName === 'LI');
  for (const el of els) {
    if (el.tagName === 'OL' && alpha(el) && lastListQ) {
      lastListQ.subQuestions = [...(lastListQ.subQuestions || []), ...items(el).map((s) => sub(s.innerHTML))];
      continue;
    }
    if (el.tagName === 'OL') {
      flushQuestion();
      flushContext();
      for (const li of items(el)) {
        const nested = Array.from(li.children).filter((c) => c.tagName === 'OL');
        const own = Array.from(li.childNodes).filter((c) => !(c instanceof Element && c.tagName === 'OL'));
        const ownHtml = own.map((c) => (c instanceof Element ? c.outerHTML : (c.textContent || '').trim() ? `<p>${c.textContent}</p>` : '')).join('');
        const subs = nested.flatMap((ol) => items(ol).map((x) => sub(x.innerHTML)));
        out.push(question(ownHtml, subs));
      }
      lastListQ = out[out.length - 1] ?? null;
      continue;
    }
    const onlyFormulaOrFigure = el.tagName === 'P' && (/^\$\$[\s\S]*\$\$$/.test(text(el)) || (!text(el) && !!el.querySelector('img')));
    if (lastListQ && !current && !context.length && onlyFormulaOrFigure) {
      const subs = lastListQ.subQuestions || [];
      const target = subs.length ? subs[subs.length - 1] : lastListQ;
      target.content = { type: 'text', html: (target.content?.html || '') + el.outerHTML };
      continue;
    }
    lastListQ = null;
    const t = text(el);
    if (el.tagName === 'P' && QUESTION_RE.test(t)) {
      flushQuestion();
      flushContext();
      current = { html: [stripLead(el, QUESTION_RE)], subs: [] };
    } else if (el.tagName === 'P' && current && SUB_RE.test(t)) {
      current.subs.push([stripLead(el, SUB_RE)]);
    } else if (current) {
      // Suite de la question (formule centrée, figure, liste à puces…) : dans sa dernière partie.
      if (current.subs.length) current.subs[current.subs.length - 1].push(el.outerHTML);
      else current.html.push(el.outerHTML);
    } else {
      context.push(el);
    }
  }
  flushQuestion();
  flushContext();
  return out;
}

const topLevel = (html: string): Element[] => {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  return Array.from(doc.body.firstElementChild?.children ?? [])
    .filter((e) => !e.hasAttribute('data-page-break') && e.tagName !== 'HR');
};
const isHeading = (e: Element) => /^H[1-6]$/.test(e.tagName);

/** Durée de l'en-tête (« 2 h », « 1h30 », « 90 min ») en minutes. */
export function parseDuration(s: unknown): number | null {
  const v = String(s || '').toLowerCase().replace(/\s+/g, '');
  const hm = v.match(/^(\d{1,2})h(\d{1,2})?/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2] || 0);
  const m = v.match(/^(\d{2,3})(min|mn)/);
  return m ? Number(m[1]) : null;
}

export function documentToPrefill(html: string, type: WizardContentType, title: string, duree?: unknown): ContentPrefill {
  const els = topLevel(html);
  if (type === 'lesson') {
    const sections: SectionBlock[] = [];
    let cur: SectionBlock | null = null;
    let level = 0;
    let buf: Element[] = [];
    const flush = () => {
      if (!cur) {
        if (buf.some((e) => text(e) || e.querySelector('img'))) sections.push({ id: newId(), title: '', content: { type: 'text', html: outer(buf) }, subSections: [] });
      } else {
        const target = cur.subSections?.length ? cur.subSections[cur.subSections.length - 1] : cur;
        target.content = { type: 'text', html: (target.content.html || '') + outer(buf) };
      }
      buf = [];
    };
    for (const el of els) {
      if (!isHeading(el)) { buf.push(el); continue; }
      flush();
      const lv = Number(el.tagName[1]);
      if (cur && lv > level) {
        cur.subSections = [...(cur.subSections || []), { id: newId(), title: text(el), content: { type: 'text', html: '' } }];
      } else {
        cur = { id: newId(), title: text(el), content: { type: 'text', html: '' }, subSections: [] };
        sections.push(cur);
        level = lv;
      }
    }
    flush();
    return { type, title, from: title, source: { html, duree }, sections: sections.length ? sections : [{ id: newId(), title: '', content: { type: 'text', html: '' }, subSections: [] }] };
  }
  // Exercice : les titres sont gardés comme contexte ; devoir : ils ouvrent les parties.
  const blocks: ExerciseBlock[] = [];
  let part: Element[] = [];
  for (const el of els) {
    if (type === 'exam' && isHeading(el)) {
      blocks.push(...exerciseBlocksOf(part));
      part = [];
      blocks.push({ id: newId(), type: 'section', content: { type: 'text', html: text(el) } });
    } else {
      part.push(el);
    }
  }
  blocks.push(...exerciseBlocksOf(part));
  if (!blocks.some((b) => b.type === 'question')) blocks.push(question(''));
  return { type, title, from: title, source: { html, duree }, blocks, durationMinutes: type === 'exam' ? parseDuration(duree) ?? 120 : null };
}

/** Résumé du découpage pour la fenêtre « Publier sur FIDNI ». */
export function describePrefill(p: ContentPrefill): string {
  if (p.type === 'lesson') {
    const n = p.sections?.length ?? 0;
    return `${n} partie${n > 1 ? 's' : ''}`;
  }
  const blocks = p.blocks ?? [];
  const q = blocks.filter((b) => b.type === 'question');
  const subs = q.reduce((s, b) => s + (b.subQuestions?.length ?? 0), 0);
  const parts = blocks.filter((b) => b.type === 'section').length;
  return [
    parts && `${parts} partie${parts > 1 ? 's' : ''}`,
    `${q.length} question${q.length > 1 ? 's' : ''}`,
    subs && `${subs} sous-question${subs > 1 ? 's' : ''}`,
  ].filter(Boolean).join(', ');
}
