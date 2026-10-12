/**
 * Pagination en direct d'une feuille qu'on écrit (12/10/2026) : assistant « Ajouter un contenu » et
 * éditeur de documents. Rien n'est déplacé : on insère des espaces (« pg-spacer ») pour qu'un élément qui
 * déborderait commence en haut de la page suivante, et les feuilles sont dessinées derrière.
 *
 * Unités de coupe (« atomes ») : chaque rangée `[data-pg-row]` de la feuille et, dans une rangée marquée
 * `data-pg-split` (un champ de texte), chaque paragraphe, encadré, liste ou formule centrée du champ. Une
 * rangée `data-pg-kwn` (titre) reste avec ce qui la suit.
 *
 * Mesure stable : la position « naturelle » d'un atome = sa position actuelle moins les espaces déjà
 * insérés avant lui ; la hauteur d'un atome = l'écart jusqu'au suivant (marges comprises). Le calcul ne
 * dépend donc pas des espaces déjà posés : il converge en un passage.
 */
import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────── Espaces dans un éditeur (décorations)

type Spacers = Map<number, number>; // index du nœud de premier niveau → hauteur (px)

export const pageSpacersKey = new PluginKey<{ spacers: Spacers; deco: DecorationSet }>('pageSpacers');

function spacerWidget(height: number) {
  const el = document.createElement('div');
  el.className = 'pg-spacer';
  el.setAttribute('aria-hidden', 'true');
  el.contentEditable = 'false';
  el.style.height = `${height}px`;
  return el;
}

function buildDeco(doc: PMNode, spacers: Spacers) {
  if (!spacers.size) return DecorationSet.empty;
  const decos: Decoration[] = [];
  let pos = 0;
  doc.forEach((child, _offset, index) => {
    const h = spacers.get(index);
    if (h && h > 0.5) {
      decos.push(Decoration.widget(pos, () => spacerWidget(h), { side: -1, key: `pg${index}-${Math.round(h * 10)}`, ignoreSelection: true }));
    }
    pos += child.nodeSize;
  });
  return DecorationSet.create(doc, decos);
}

/** Extension TipTap : reçoit les espaces à poser (méta de transaction) et les dessine. */
export const PageSpacers = Extension.create({
  name: 'pageSpacers',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: pageSpacersKey,
      state: {
        init: () => ({ spacers: new Map(), deco: DecorationSet.empty }),
        apply(tr, prev, _old, state) {
          const meta = tr.getMeta(pageSpacersKey) as Spacers | undefined;
          if (meta) return { spacers: meta, deco: buildDeco(state.doc, meta) };
          if (tr.docChanged) return { spacers: prev.spacers, deco: buildDeco(state.doc, prev.spacers) };
          return prev;
        },
      },
      props: { decorations: (state) => pageSpacersKey.getState(state)?.deco ?? DecorationSet.empty },
    })];
  },
});

function setEditorSpacers(editor: Editor, spacers: Spacers) {
  if (editor.isDestroyed) return;
  const cur = pageSpacersKey.getState(editor.state)?.spacers;
  if (cur && cur.size === spacers.size && [...spacers].every(([k, v]) => Math.abs((cur.get(k) ?? -1) - v) < 0.5)) return;
  editor.view.dispatch(editor.state.tr.setMeta(pageSpacersKey, spacers).setMeta('addToHistory', false));
}

// ─────────────────────────────── Calcul

export interface Atom { height: number; keepWithNext?: boolean }

/** Espace avant chaque atome ; zone de texte de la page p = [p × stride, p × stride + height]. */
export function liveSpacers(atoms: Atom[], height: number, stride: number) {
  const out: number[] = [];
  let extra = 0;
  let page = 0;
  let natural = 0;
  let end = 0;
  for (let i = 0; i < atoms.length; i += 1) {
    let y = natural + extra;
    let s = 0;
    // Atome qui commence dans l'intervalle entre deux feuilles (après un bloc trop haut) : page suivante.
    while (y + s >= page * stride + height - 0.5) page += 1;
    if (y < page * stride) s = page * stride - y;
    y += s;
    let needed = atoms[i].height;
    if (atoms[i].keepWithNext && i + 1 < atoms.length) needed += Math.min(atoms[i + 1].height, height / 3);
    if (y > page * stride + 0.5 && y + needed > page * stride + height + 0.5 && needed <= height) {
      page += 1;
      s += page * stride - y;
      y = page * stride;
    }
    out.push(s);
    extra += s;
    natural += atoms[i].height;
    end = y + atoms[i].height;
  }
  const pages = Math.max(1, Math.floor(Math.max(0, end - 0.5) / stride) + 1);
  return { spacers: out, pages };
}

// ─────────────────────────────── Accroche à la page

interface Options {
  /** Hauteur de la zone de texte (px). */
  height: number;
  /** Distance entre le haut de deux zones de texte (feuille + intervalle, px). */
  stride: number;
  /** Éditeurs des rangées découpables (clé de rangée → éditeur). */
  editors: () => Map<string, Editor>;
  /** Facteur de zoom CSS appliqué à la feuille (mesures ramenées à la taille réelle). */
  zoom?: number;
  enabled?: boolean;
}

export function useLivePagination(flowRef: React.RefObject<HTMLElement | null>, opts: Options) {
  const [rowSpacers, setRowSpacers] = useState<Record<string, number>>({});
  const [pages, setPages] = useState(1);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const frame = useRef(0);

  const run = useCallback(() => {
    const flow = flowRef.current;
    const { height, stride, editors, zoom = 1, enabled = true } = optsRef.current;
    if (!flow || !enabled || height <= 0) return;
    const top = flow.getBoundingClientRect().top;
    type A = { el: HTMLElement; row: string; index: number; kwn: boolean };
    const list: A[] = [];
    flow.querySelectorAll<HTMLElement>('[data-pg-row]').forEach((row) => {
      const key = row.dataset.pgRow || '';
      list.push({ el: row, row: key, index: -1, kwn: row.hasAttribute('data-pg-kwn') });
      if (!row.hasAttribute('data-pg-split')) return;
      const pm = row.querySelector<HTMLElement>('.ProseMirror');
      if (!pm) return;
      let index = 0;
      Array.from(pm.children).forEach((c) => {
        if (c.classList.contains('pg-spacer')) return;
        if (index > 0) list.push({ el: c as HTMLElement, row: key, index, kwn: /^H[1-6]$/.test(c.tagName) });
        index += 1;
      });
    });
    if (!list.length) return;
    // Positions naturelles (sans les espaces déjà posés).
    let inserted = 0;
    const natural = list.map((a) => {
      const prev = a.el.previousElementSibling as HTMLElement | null;
      if (prev?.classList.contains('pg-spacer')) inserted += prev.getBoundingClientRect().height / zoom;
      return (a.el.getBoundingClientRect().top - top) / zoom - inserted;
    });
    let totalInserted = 0;
    flow.querySelectorAll<HTMLElement>('.pg-spacer').forEach((s) => { totalInserted += s.getBoundingClientRect().height / zoom; });
    const flowBottom = flow.getBoundingClientRect().height / zoom - totalInserted;
    const atoms: Atom[] = list.map((a, i) => ({
      height: Math.max(0, (i + 1 < list.length ? natural[i + 1] : flowBottom) - natural[i]),
      keepWithNext: a.kwn,
    }));
    // La première rangée commence au haut de la première zone : décalage éventuel avant elle.
    const offset = natural[0];
    const { spacers, pages: n } = liveSpacers(atoms.map((a, i) => (i === 0 ? { ...a, height: a.height + offset } : a)), height, stride);
    const rows: Record<string, number> = {};
    const perEditor = new Map<string, Spacers>();
    list.forEach((a, i) => {
      const s = spacers[i] > 0.5 ? Math.round(spacers[i] * 10) / 10 : 0;
      if (a.index < 0) { if (s) rows[a.row] = s; return; }
      if (!perEditor.has(a.row)) perEditor.set(a.row, new Map());
      if (s) perEditor.get(a.row)?.set(a.index, s);
    });
    setRowSpacers((prev) => {
      const same = Object.keys(prev).length === Object.keys(rows).length && Object.entries(rows).every(([k, v]) => Math.abs((prev[k] ?? -1) - v) < 0.5);
      return same ? prev : rows;
    });
    setPages((p) => (p === n ? p : n));
    editors().forEach((ed, key) => setEditorSpacers(ed, perEditor.get(key) ?? new Map()));
  }, [flowRef]);

  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(run);
  }, [run]);

  useEffect(() => {
    const flow = flowRef.current;
    if (!flow) return;
    const ro = new ResizeObserver(schedule);
    ro.observe(flow);
    // Les rangées changent de taille sans que la feuille change forcément (un champ grandit, l'autre rétrécit).
    const mo = new MutationObserver(schedule);
    mo.observe(flow, { childList: true, subtree: true, characterData: true });
    document.fonts?.ready.then(schedule);
    schedule();
    return () => { ro.disconnect(); mo.disconnect(); cancelAnimationFrame(frame.current); };
  }, [flowRef, schedule]);

  useEffect(() => { schedule(); }, [opts.height, opts.stride, opts.zoom, opts.enabled, schedule]);

  return { rowSpacers, pages, refresh: schedule };
}
