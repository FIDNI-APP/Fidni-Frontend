// Une leçon du cahier sur sa feuille, avec les annotations de l'élève (surlignages, traits, notes).
// Les annotations existantes sont toujours visibles ; la barre d'outils n'apparaît qu'en mode « Annoter »
// (bouton de SectionContent, proposé seulement avec une souris). Enregistrement automatique (1 s après un geste).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Eraser, Highlighter, Loader2, Pen, Redo2, StickyNote, Trash2, Undo2 } from 'lucide-react';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { LessonRenderer } from '@/components/content/viewer/LessonRenderer';
import { NotebookPaper, NOTEBOOK_THEME, paperTextStyle, type NotebookTheme } from './NotebookPaper';

export type Annotation = {
  id: string;
  type: 'highlight' | 'note' | 'pen';
  position: { x: number; y: number; width?: number; height?: number };
  color: string;
  content?: string;
  path?: string;
  strokeWidth?: number;
};

type Tool = 'highlight' | 'pen' | 'note' | 'eraser';

interface NotebookContentProps {
  content: string;
  structure?: unknown;
  className?: string;
  notebookTheme?: NotebookTheme;
  onReady?: () => void;
  onSaveAnnotations?: (annotations: Annotation[]) => Promise<void>;
  initialAnnotations?: Annotation[];
  /** Mode annotation : barre d'outils visible, la feuille répond aux gestes. */
  annotating?: boolean;
}

// Quatre couleurs du site : or, vert, brique, encre.
const COLORS = [
  { name: 'or', value: '#e9c46a' },
  { name: 'vert', value: '#7cc59a' },
  { name: 'brique', value: '#e0928a' },
  { name: 'encre', value: '#33302b' },
];

const TOOLS: { key: Tool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'highlight', label: 'Surligner', icon: Highlighter },
  { key: 'pen', label: 'Stylo', icon: Pen },
  { key: 'note', label: 'Note', icon: StickyNote },
  { key: 'eraser', label: 'Effacer', icon: Eraser },
];

// Leçon sans contenu : on le dit, et on signale quand même que la feuille est prête (le squelette s'efface).
const EmptyLessonBody: React.FC<{ onReady?: () => void }> = ({ onReady }) => {
  useEffect(() => {
    const id = requestAnimationFrame(() => { onReady?.(); });
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return <p className="py-12 text-center text-[13.5px] text-ink-faint">Cette leçon n’a pas encore de contenu à afficher.</p>;
};

// Leçon structurée (sections JSON) : prévient quand elle est affichée.
const StructuredLessonContent: React.FC<{ structure: unknown; onReady?: () => void }> = ({ structure, onReady }) => {
  useEffect(() => {
    const id = requestAnimationFrame(() => { onReady?.(); });
    return () => cancelAnimationFrame(id);
  }, [structure, onReady]);
  return <LessonRenderer structure={structure as React.ComponentProps<typeof LessonRenderer>['structure']} />;
};

const NotebookContent: React.FC<NotebookContentProps> = ({
  content,
  structure,
  className = '',
  notebookTheme = NOTEBOOK_THEME,
  onReady,
  onSaveAnnotations,
  initialAnnotations,
  annotating = false,
}) => {
  const hasStructure = Boolean((structure as { sections?: unknown[] } | undefined)?.sections?.length);
  const [tool, setTool] = useState<Tool | null>(null);
  const [color, setColor] = useState(COLORS[0].value);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations ?? []);
  const [history, setHistory] = useState<{ list: Annotation[][]; at: number }>({ list: [initialAnnotations ?? []], at: 0 });
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const dirty = useRef(false);

  // Drawing in progress
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [path, setPath] = useState('');
  const layerRef = useRef<HTMLDivElement>(null);

  // Annotations chargées après coup (ou leçon suivante) : on repart de celles-ci.
  useEffect(() => {
    const init = initialAnnotations ?? [];
    setAnnotations(init);
    setHistory({ list: [init], at: 0 });
    dirty.current = false;
  }, [initialAnnotations]);

  // Fin du mode annotation : on repose l'outil.
  useEffect(() => { if (!annotating) setTool(null); }, [annotating]);

  const commit = useCallback((next: Annotation[]) => {
    dirty.current = true;
    setAnnotations(next);
    setHistory((h) => {
      const list = [...h.list.slice(0, h.at + 1), next];
      return { list, at: list.length - 1 };
    });
  }, []);

  const undo = () => {
    if (history.at <= 0) return;
    dirty.current = true;
    setAnnotations(history.list[history.at - 1]);
    setHistory((h) => ({ ...h, at: h.at - 1 }));
  };
  const redo = () => {
    if (history.at >= history.list.length - 1) return;
    dirty.current = true;
    setAnnotations(history.list[history.at + 1]);
    setHistory((h) => ({ ...h, at: h.at + 1 }));
  };

  // Enregistrement automatique, une seconde après le dernier geste.
  useEffect(() => {
    if (!dirty.current || !onSaveAnnotations) return;
    const timer = window.setTimeout(async () => {
      setSaveState('saving');
      try {
        await onSaveAnnotations(annotations);
        dirty.current = false;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [annotations, onSaveAnnotations]);

  const point = (e: React.PointerEvent) => {
    const rect = layerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!annotating || !tool || tool === 'eraser' || !layerRef.current) return;
    if (e.target !== layerRef.current && tool !== 'pen' && tool !== 'highlight') return;
    // Pas de « mousedown » derrière : il retirerait le focus de la note qu'on vient de poser.
    e.preventDefault();
    const p = point(e);
    if (tool === 'note') {
      commit([...annotations, { id: `note-${Date.now()}`, type: 'note', color, position: { x: p.x, y: p.y, width: 200, height: 96 }, content: '' }]);
      setTool(null);
      return;
    }
    layerRef.current.setPointerCapture?.(e.pointerId);
    setDrawing(true);
    setStart(p);
    if (tool === 'pen') setPath(`M ${p.x} ${p.y}`);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing || !start) return;
    const p = point(e);
    if (tool === 'pen') setPath((d) => `${d} L ${p.x} ${p.y}`);
    else if (tool === 'highlight') setSize({ width: p.x - start.x, height: p.y - start.y });
  };

  const onPointerUp = () => {
    if (!drawing) return;
    if (tool === 'pen' && path.includes('L')) {
      commit([...annotations, { id: `pen-${Date.now()}`, type: 'pen', color, position: { x: 0, y: 0 }, path, strokeWidth: 2 }]);
    } else if (tool === 'highlight' && start && size && Math.abs(size.width) > 4 && Math.abs(size.height) > 4) {
      commit([...annotations, {
        id: `highlight-${Date.now()}`, type: 'highlight', color,
        position: {
          x: Math.min(start.x, start.x + size.width), y: Math.min(start.y, start.y + size.height),
          width: Math.abs(size.width), height: Math.abs(size.height),
        },
      }]);
    }
    setDrawing(false);
    setStart(null);
    setSize(null);
    setPath('');
  };

  const erase = (id: string) => { if (annotating && tool === 'eraser') commit(annotations.filter((a) => a.id !== id)); };
  // Texte d'une note : remplace l'état courant de l'historique (pas une étape par lettre tapée).
  const editNote = (id: string, text: string) => {
    const next = annotations.map((a) => (a.id === id ? { ...a, content: text } : a));
    dirty.current = true;
    setAnnotations(next);
    setHistory((h) => ({ ...h, list: h.list.map((l, i) => (i === h.at ? next : l)) }));
  };
  const clearAll = () => {
    if (annotations.length && window.confirm('Effacer toutes tes annotations de cette leçon ?')) commit([]);
  };

  const erasing = annotating && tool === 'eraser';
  const toolBtn = 'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';

  return (
    <div className="flex flex-col">
      {annotating && (
        <div role="toolbar" aria-label="Outils d’annotation"
          className="sticky top-0 z-30 flex flex-wrap items-center gap-x-1 gap-y-1.5 border-b border-line bg-white/95 px-3 py-2 backdrop-blur">
          {TOOLS.map(({ key, label, icon: Icon }) => {
            const on = tool === key;
            return (
              <button key={key} type="button" aria-pressed={on} onClick={() => setTool(on ? null : key)} title={label}
                className={`${toolBtn} ${on ? 'bg-ink text-white' : 'text-ink-soft hover:bg-[#f2f1ee] hover:text-ink'}`}>
                <Icon className="h-4 w-4" /> <span className="hidden lg:inline">{label}</span>
              </button>
            );
          })}
          <span className="mx-1.5 h-5 w-px bg-line" aria-hidden />
          <span className="flex items-center gap-1" role="radiogroup" aria-label="Couleur">
            {COLORS.map((c) => (
              <button key={c.value} type="button" role="radio" aria-checked={color === c.value} aria-label={`Couleur ${c.name}`} title={c.name}
                onClick={() => setColor(c.value)}
                className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-105 ${color === c.value ? 'border-ink' : 'border-white ring-1 ring-line'}`}
                style={{ backgroundColor: c.value }} />
            ))}
          </span>
          <span className="mx-1.5 h-5 w-px bg-line" aria-hidden />
          <button type="button" onClick={undo} disabled={history.at <= 0} title="Annuler" aria-label="Annuler"
            className={`${toolBtn} text-ink-soft hover:bg-[#f2f1ee] disabled:opacity-40`}><Undo2 className="h-4 w-4" /></button>
          <button type="button" onClick={redo} disabled={history.at >= history.list.length - 1} title="Refaire" aria-label="Refaire"
            className={`${toolBtn} text-ink-soft hover:bg-[#f2f1ee] disabled:opacity-40`}><Redo2 className="h-4 w-4" /></button>
          <button type="button" onClick={clearAll} disabled={!annotations.length} title="Tout effacer"
            className={`${toolBtn} text-[#a23b34] hover:bg-[#fbecea] disabled:opacity-40`}><Trash2 className="h-4 w-4" /> <span className="hidden lg:inline">Tout effacer</span></button>
          <span className="ml-auto inline-flex items-center gap-1 pl-2 text-[12px] text-ink-faint" aria-live="polite">
            {saveState === 'saving' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…</>
              : saveState === 'saved' ? <><Check className="h-3.5 w-3.5 text-brand" /> Enregistré</>
                : saveState === 'error' ? <span className="text-[#a23b34]">Pas enregistré</span> : null}
          </span>
        </div>
      )}

      <NotebookPaper theme={notebookTheme}>
        <div className={`relative z-10 ${className}`}>
          <div className="py-6 pr-4 sm:py-8 sm:pr-8" style={paperTextStyle(notebookTheme)}>
            {hasStructure ? (
              <StructuredLessonContent structure={structure} onReady={onReady} />
            ) : content ? (
              <TipTapRenderer content={content} onReady={onReady} />
            ) : (
              <EmptyLessonBody onReady={onReady} />
            )}
          </div>
        </div>

        {/* Calque des annotations : ne capte les gestes qu'en mode annotation avec un outil. */}
        <div
          ref={layerRef}
          className={`absolute inset-0 z-20 ${annotating && tool && tool !== 'eraser' ? (tool === 'note' ? 'cursor-text' : 'cursor-crosshair') : ''}`}
          style={{ pointerEvents: annotating && tool ? 'auto' : 'none', touchAction: annotating && tool ? 'none' : undefined }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {annotations.filter((a) => a.type === 'highlight').map((a) => (
            <div key={a.id} onClick={() => erase(a.id)}
              className={`absolute rounded-sm ${erasing ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-[#a23b34]' : ''}`}
              style={{
                left: a.position.x, top: a.position.y, width: a.position.width, height: a.position.height,
                backgroundColor: a.color, opacity: 0.4, mixBlendMode: 'multiply', pointerEvents: erasing ? 'auto' : 'none',
              }} />
          ))}

          <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }} aria-hidden>
            {annotations.filter((a) => a.type === 'pen').map((a) => (
              <g key={a.id} onClick={() => erase(a.id)} style={{ cursor: erasing ? 'pointer' : 'default' }}>
                <path d={a.path || ''} stroke={a.color} strokeWidth={a.strokeWidth || 2} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
                {/* Zone de clic plus large que le trait, pour la gomme. */}
                <path d={a.path || ''} stroke="transparent" strokeWidth={14} fill="none" style={{ pointerEvents: erasing ? 'stroke' : 'none' }} />
              </g>
            ))}
            {drawing && path && <path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>

          {drawing && tool === 'highlight' && start && size && (
            <div className="pointer-events-none absolute rounded-sm"
              style={{
                left: Math.min(start.x, start.x + size.width), top: Math.min(start.y, start.y + size.height),
                width: Math.abs(size.width), height: Math.abs(size.height), backgroundColor: color, opacity: 0.35,
              }} />
          )}

          {annotations.filter((a) => a.type === 'note').map((a) => (
            <div key={a.id} onClick={() => erase(a.id)}
              className={`absolute max-w-[260px] rounded-r-lg border-l-4 bg-[#fffbea] shadow-[0_4px_14px_rgba(20,18,16,.10)] ${erasing ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-[#a23b34]' : ''}`}
              style={{ left: a.position.x, top: a.position.y, minWidth: 180, borderLeftColor: a.color, pointerEvents: annotating ? 'auto' : 'none' }}>
              {annotating && !erasing ? (
                <textarea value={a.content || ''} autoFocus={!a.content} rows={3}
                  onChange={(e) => editNote(a.id, e.target.value)}
                  placeholder="Écris ta note…"
                  className="block w-full resize-y border-none bg-transparent p-2.5 text-[13px] leading-snug text-ink outline-none placeholder:text-ink-faint" />
              ) : (
                <p className="whitespace-pre-wrap p-2.5 text-[13px] leading-snug text-ink">{a.content || <span className="text-ink-faint">Note vide</span>}</p>
              )}
            </div>
          ))}
        </div>
      </NotebookPaper>
    </div>
  );
};

export default NotebookContent;
