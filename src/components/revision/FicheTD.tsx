// « Fiche TD » (11/10/2026) : depuis une liste d'exercices ou d'examens, regrouper ceux de son choix en une
// fiche imprimable, sans passer par la page Réviser. Un panneau suit l'écran (en haut à droite ; en bas sur
// téléphone) ; on y glisse les cartes, ou on les ajoute avec « + Fiche » (le toucher n'a pas de glisser).
// « Créer la fiche » en fait une liste de révision étiquetée avec le niveau, la matière et le chapitre de la
// page (filtres de « Réviser »), puis la fiche s'envole vers « Réviser ».
// La fiche en cours est gardée dans ce navigateur : on peut changer de chapitre et continuer à la remplir.
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ClipboardList, GripVertical, Loader2, Plus, Printer, X } from 'lucide-react';
import { addItemToRevisionList, createRevisionList, getRevisionLists, type RevisionList } from '@/lib/api/revisionListApi';

export interface FicheItem { id: number; title: string; type: 'exercise' | 'exam' }
interface FicheState { open: boolean; name: string; items: FicheItem[] }
export interface FicheContext { levelIds: number[]; subjectIds: number[]; chapterIds: number[]; label: string | null }

const DRAG = 'application/x-fidni-contenu';
const key = (userId: string | number) => `fidni:fiche-td:${userId}`;
const empty: FicheState = { open: false, name: '', items: [] };

/** État de la fiche en cours (gardé dans ce navigateur, par compte). */
export function useFicheTD(userId: string | number | undefined) {
  const [s, setS] = useState<FicheState>(empty);
  useEffect(() => {
    if (!userId) return;
    try { const raw = localStorage.getItem(key(userId)); setS(raw ? { ...empty, ...JSON.parse(raw) } : empty); } catch { setS(empty); }
  }, [userId]);
  const save = useCallback((next: FicheState) => {
    setS(next);
    if (userId) { try { localStorage.setItem(key(userId), JSON.stringify(next)); } catch { /* stockage bloqué : la fiche vit le temps de la page */ } }
  }, [userId]);
  return {
    ...s,
    has: (id: number) => s.items.some((x) => x.id === id),
    add: (it: FicheItem) => { if (!s.items.some((x) => x.id === it.id)) save({ ...s, open: true, items: [...s.items, it] }); },
    remove: (id: number) => save({ ...s, items: s.items.filter((x) => x.id !== id) }),
    move: (from: number, to: number) => {
      const items = [...s.items];
      const [it] = items.splice(from, 1);
      items.splice(to, 0, it);
      save({ ...s, items });
    },
    setOpen: (open: boolean) => save({ ...s, open }),
    setName: (name: string) => save({ ...s, name }),
    reset: () => save(empty),
    /** Fiche créée : on repart d'une fiche vide, panneau ouvert (le message de réussite y est). */
    restart: () => save({ ...empty, open: true }),
  };
}
export type FicheTD = ReturnType<typeof useFicheTD>;

/** Une carte de la liste : glissable vers la fiche, et un bouton « + Fiche » quand la fiche est ouverte. */
export const FicheSlot: React.FC<{ fiche: FicheTD; item: FicheItem; children: React.ReactNode }> = ({ fiche, item, children }) => {
  if (!fiche.open) return <>{children}</>;
  const inFiche = fiche.has(item.id);
  return (
    <div className="relative" draggable onDragStart={(e) => { e.dataTransfer.setData(DRAG, JSON.stringify(item)); e.dataTransfer.effectAllowed = 'copy'; }}>
      <div className={`rounded-2xl transition-shadow ${inFiche ? 'ring-2 ring-brand/60' : 'cursor-grab hover:ring-2 hover:ring-ink/15'}`}>{children}</div>
      <button type="button" onClick={() => (inFiche ? fiche.remove(item.id) : fiche.add(item))}
        aria-pressed={inFiche} aria-label={inFiche ? `Retirer « ${item.title} » de la fiche` : `Ajouter « ${item.title} » à la fiche`}
        className={`absolute -top-3.5 right-4 z-10 inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold shadow-sm transition-colors ${
          inFiche ? 'bg-brand text-white hover:bg-brand-hover' : 'border border-line bg-white text-ink hover:border-ink'}`}>
        {inFiche ? <><Check className="h-3.5 w-3.5" /> Dans la fiche</> : <><Plus className="h-3.5 w-3.5" /> Fiche</>}
      </button>
    </div>
  );
};

/** L'envol vers « Réviser » : une pastille part du panneau et file vers le lien du menu, qui pulse à l'arrivée. */
function flyToRevise(from: DOMRect) {
  const targets = [...document.querySelectorAll<HTMLAnchorElement>('a[href="/reviser"]')]
    .filter((a) => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight; });
  const target = targets[0];
  if (!target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const to = target.getBoundingClientRect();
  const dot = document.createElement('div');
  dot.setAttribute('aria-hidden', 'true');
  Object.assign(dot.style, {
    position: 'fixed', left: `${from.left + from.width / 2 - 22}px`, top: `${from.top + from.height / 2 - 22}px`, width: '44px', height: '44px',
    borderRadius: '14px', background: '#1a7a4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: '200', boxShadow: '0 10px 30px rgba(26,122,74,.35)', pointerEvents: 'none', fontSize: '20px',
  });
  dot.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>';
  document.body.appendChild(dot);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const anim = dot.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(1.1)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(.35)`, opacity: 0.2 },
  ], { duration: 850, easing: 'cubic-bezier(.45,.05,.3,1)' });
  anim.onfinish = () => {
    dot.remove();
    target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', background: '#e6f2ec' }, { transform: 'scale(1)' }],
      { duration: 500, easing: 'ease-out' });
  };
}

interface Created { id: number; name: string; count: number }

/** Le panneau de la fiche : la liste glissée, le nom, « Créer la fiche », et les listes déjà faites sur ce chapitre. */
export const FichePanel: React.FC<{ fiche: FicheTD; context: FicheContext }> = ({ fiche, context }) => {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [related, setRelated] = useState<RevisionList[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const chapterKey = context.chapterIds.join(',');

  // Ses listes déjà étiquetées avec ce chapitre (ou contenant ses exercices) : accès direct, sans aller dans « Réviser ».
  useEffect(() => {
    if (!fiche.open) return;
    let off = false;
    getRevisionLists().then((lists) => {
      if (off) return;
      const ids = new Set(context.chapterIds);
      setRelated(ids.size
        ? lists.filter((l) => (l.chapters || []).some((c) => ids.has(c.id)) || (context.label && (l.item_chapters || []).includes(context.label)))
        : lists.slice(0, 5));
    }).catch(() => setRelated([]));
    return () => { off = true; };
  }, [fiche.open, chapterKey, created?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!fiche.open) return null;
  const defaultName = `Fiche TD${context.label ? ` — ${context.label}` : ''}`;
  const name = fiche.name || defaultName;

  const drop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    try { const it = JSON.parse(e.dataTransfer.getData(DRAG)) as FicheItem; if (it?.id) fiche.add(it); } catch { /* glissé d'ailleurs */ }
  };
  const create = async () => {
    if (!fiche.items.length) return;
    setBusy(true); setError(null);
    try {
      // Nom unique par compte : le nom proposé prend « (2) », « (3) »… s'il existe déjà ; un nom choisi reste tel quel.
      const labels = { class_level_ids: context.levelIds, subject_ids: context.subjectIds, chapter_ids: context.chapterIds };
      const base = name.trim().slice(0, 190);
      let list: RevisionList | null = null;
      for (let n = 1; !list; n += 1) {
        try {
          list = await createRevisionList({ name: n === 1 ? base : `${base} (${n})`, ...labels });
        } catch (err) {
          const dup = (err as { response?: { status?: number } })?.response?.status === 400;
          if (!dup || fiche.name || n >= 20) throw err;
        }
      }
      for (const it of fiche.items) await addItemToRevisionList(list.id, { content_type: it.type, object_id: it.id });
      if (panelRef.current) flyToRevise(panelRef.current.getBoundingClientRect());
      setCreated({ id: list.id, name: list.name, count: fiche.items.length });
      fiche.restart();
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(status === 400 ? 'Tu as déjà une liste avec ce nom : change le nom de la fiche.' : 'La fiche n’a pas pu être créée. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={panelRef} role="region" aria-label="Fiche TD en cours"
      className="fixed inset-x-3 bottom-[calc(var(--fd-tabbar-h,0px)+12px)] z-40 max-h-[60vh] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(20,18,16,.18)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-h-[min(70vh,640px)] sm:w-[340px]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <ClipboardList className="h-4 w-4 text-brand" aria-hidden />
        <p className="flex-1 text-[14px] font-semibold text-ink">Fiche TD</p>
        <button type="button" onClick={() => { setCreated(null); fiche.setOpen(false); }} aria-label="Fermer la fiche (elle est gardée)"
          className="rounded-lg p-1.5 text-ink-faint hover:bg-[#f2f1ee] hover:text-ink"><X className="h-4 w-4" /></button>
      </div>

      <div className="max-h-[calc(60vh-52px)] overflow-y-auto sm:max-h-[calc(min(70vh,640px)-52px)]">
        {created && (
          <div className="m-3 rounded-xl border border-brand-line bg-brand-soft px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-hover"><Check className="h-4 w-4" /> Fiche créée</p>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">« {created.name} » ({created.count} {created.count > 1 ? 'contenus' : 'contenu'}) est dans Réviser.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link to={`/revision-lists/${created.id}/pdf`} className="fd-btn-primary min-h-9 px-3 text-[12.5px]"><Printer className="h-3.5 w-3.5" /> Imprimer</Link>
              <Link to={`/revision-lists/${created.id}`} className="inline-flex min-h-9 items-center rounded-xl border border-line bg-white px-3 text-[12.5px] font-medium text-ink hover:border-ink">Ouvrir</Link>
            </div>
          </div>
        )}

        <div className="px-3 pb-3 pt-3">
          <label htmlFor="fiche-nom" className="sr-only">Nom de la fiche</label>
          <input id="fiche-nom" value={fiche.name} placeholder={defaultName} onChange={(e) => fiche.setName(e.target.value)} maxLength={200}
            className="h-10 w-full rounded-xl border border-line px-3 text-[13.5px] font-medium text-ink placeholder:text-ink-soft focus:border-brand focus:outline-none" />

          <ol onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG)) { e.preventDefault(); setOver(true); } }}
            onDragLeave={() => setOver(false)} onDrop={drop}
            className={`mt-2 min-h-[88px] space-y-1.5 rounded-xl border-2 border-dashed p-1.5 transition-colors ${over ? 'border-brand bg-brand-soft/50' : 'border-[#e2ded6]'}`}>
            {fiche.items.length === 0 && (
              <li className="px-2 py-5 text-center text-[12.5px] leading-snug text-ink-faint">
                Glisse des exercices ici,<br />ou clique sur <b className="text-ink-soft">+ Fiche</b> sur une carte.
              </li>
            )}
            {fiche.items.map((it, i) => (
              <li key={it.id} draggable onDragStart={() => setDragIndex(i)} onDragEnd={() => setDragIndex(null)}
                onDragOver={(e) => { if (dragIndex !== null && dragIndex !== i) { e.preventDefault(); fiche.move(dragIndex, i); setDragIndex(i); } }}
                className="group flex items-center gap-1.5 rounded-lg bg-paper px-2 py-1.5 text-[13px]">
                <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-ink-faint" aria-hidden />
                <span className="fd-nums w-4 shrink-0 text-[11.5px] text-ink-faint">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-ink" title={it.title}>{it.title}</span>
                <button type="button" onClick={() => fiche.remove(it.id)} aria-label={`Retirer « ${it.title} »`}
                  className="rounded p-0.5 text-ink-faint opacity-60 hover:text-[#a23b34] group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ol>
          {context.label && <p className="mt-1.5 text-[11.5px] text-ink-faint">Rangée dans Réviser avec le chapitre « {context.label} ».</p>}
          {error && <p className="mt-2 text-[12.5px] text-[#9c3b2e]">{error}</p>}
          <button type="button" onClick={create} disabled={busy || !fiche.items.length}
            className="fd-btn-primary mt-2.5 min-h-11 w-full justify-center text-[14px] disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Créer la fiche{fiche.items.length ? ` (${fiche.items.length})` : ''}
          </button>
        </div>

        {related && related.length > 0 && (
          <div className="border-t border-line px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{context.chapterIds.length ? 'Tes listes sur ce chapitre' : 'Tes listes'}</p>
            <ul className="mt-1.5 space-y-1">
              {related.slice(0, 6).map((l) => (
                <li key={l.id} className="flex items-center gap-2 text-[13px]">
                  <Link to={`/revision-lists/${l.id}`} className="min-w-0 flex-1 truncate text-ink hover:underline">{l.name}</Link>
                  <span className="fd-nums shrink-0 text-[11.5px] text-ink-faint">{l.item_count}</span>
                  <Link to={`/revision-lists/${l.id}/pdf`} aria-label={`Imprimer « ${l.name} »`} className="rounded p-1 text-ink-faint hover:text-ink"><Printer className="h-3.5 w-3.5" /></Link>
                </li>
              ))}
            </ul>
            <Link to="/reviser#mes-listes" className="mt-2 inline-block text-[12.5px] font-medium text-brand-hover hover:underline">Toutes mes listes</Link>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Bouton flottant, seul en bas à droite (11/10/2026 : dans l'en-tête, parmi les autres boutons blancs, on ne le
 * voyait pas). Vert comme une action principale, il suit l'écran et laisse sa place au panneau quand il s'ouvre.
 */
export const FicheButton: React.FC<{ fiche: FicheTD }> = ({ fiche }) => {
  if (fiche.open) return null;
  const n = fiche.items.length;
  return (
    <button type="button" onClick={() => fiche.setOpen(true)} data-tour="liste-fiche"
      aria-label={n ? `Ma fiche TD : ${n} ${n > 1 ? 'contenus' : 'contenu'}` : 'Créer une fiche TD'}
      className="fixed bottom-[calc(var(--fd-tabbar-h,0px)+16px)] right-4 z-40 inline-flex min-h-12 items-center gap-2.5 rounded-full bg-brand pl-4 pr-5 text-white shadow-[0_10px_28px_rgba(26,122,74,.38)] transition-transform hover:-translate-y-0.5 hover:bg-brand-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 sm:bottom-6 sm:right-6">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
        <ClipboardList className="h-[18px] w-[18px]" aria-hidden />
        {n > 0 && (
          <span className="fd-nums absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-white ring-2 ring-brand">{n}</span>
        )}
      </span>
      <span className="text-left leading-tight">
        <span className="block text-[14px] font-semibold">{n ? 'Ma fiche TD' : 'Créer une fiche TD'}</span>
        <span className="block text-[11.5px] text-white/80">{n ? `${n} ${n > 1 ? 'exercices' : 'exercice'} · à imprimer` : 'Regroupe des exercices à imprimer'}</span>
      </span>
    </button>
  );
};
