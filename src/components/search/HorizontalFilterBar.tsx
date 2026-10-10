/**
 * Barre de filtres des listes (exercices, examens, leçons).
 * - Niveau, puis directement les chapitres du niveau, regroupés par sous-domaine (la matière, unique
 *   aujourd'hui, est choisie d'office et sa ligne cachée).
 * - Options à 0 masquées (sauf si déjà choisies), difficultés à 0 désactivées.
 * - Statut en choix unique : Tous · À faire · À revoir · Réussis (élève connecté seulement).
 * - Téléphone : barre collante sous la barre du haut, panneau en tiroir depuis le bas avec
 *   « Voir les N exercices ».
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Filter as FilterIcon, RotateCcw, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ListSort } from '@/types/content';
import { getClassLevels, getSubjects, getChapters, getTheorems, getDifficultyCounts } from '@/lib/api';
import { slugify } from '@/lib/api/hubApi';
import { SortDropdown } from './SortDropdown';
import { api } from '@/lib/api/apiClient';
import { DifficultyBars } from '@/components/common/DifficultyBars';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { usePhone } from '@/components/content/listing/listingUtils';
import {
  clearedFilters, toggled, withoutChip, type ActiveChip, type FilterSlugs, type FixedFilters, type ListFilters,
} from './filterState';

export type { ActiveChip, FilterSlugs, ListFilters } from './filterState';

type Kind = 'exercise' | 'lesson' | 'exam';
type Status = 'all' | 'todo' | 'review' | 'success';

interface HorizontalFilterBarProps {
  contentType: Kind;
  filters: ListFilters;
  onFilterChange: (filters: ListFilters, slugs?: FilterSlugs) => void;
  sortBy: ListSort;
  onSortChange: (sort: ListSort) => void;
  accentColor?: string;
  /** Contrôle affiché à droite du tri (choix de l'affichage de la liste). */
  trailing?: React.ReactNode;
  /** Section « Examens nationaux » : filtre par année du Bac. */
  nationalSection?: boolean;
  /** Filtres imposés par la page (niveau, chapitre d'une page de niveau) : ni étiquette ni compteur. */
  fixed?: FixedFilters;
  /** Nombre de résultats (bouton « Voir les N exercices » du tiroir sur téléphone). */
  resultCount?: number;
  resultLoading?: boolean;
  /** Étiquettes des filtres actifs (pour « Retirer … × » quand la liste est vide). */
  onChipsChange?: (chips: ActiveChip[]) => void;
}

interface Option {
  id: string | number;
  name: string;
  slug?: string;
  content_count?: number | null;
  subfield?: { id: string | number; name: string } | { id: string | number; name: string }[] | null;
}

const STATUS_KEYS = ['todo', 'showCompleted', 'showFailed', 'showViewed', 'hideViewed'] as const;
const STATUS_LABEL: Record<(typeof STATUS_KEYS)[number], string> = {
  todo: 'À faire', showCompleted: 'Réussis', showFailed: 'À revoir', showViewed: 'Déjà ouverts', hideViewed: 'Jamais ouverts',
};
const STATUS_OPTIONS: { id: Status; label: string }[] = [
  { id: 'all', label: 'Tous' }, { id: 'todo', label: 'À faire' }, { id: 'review', label: 'À revoir' }, { id: 'success', label: 'Réussis' },
];
const DIFF_LABEL: Record<string, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };
const NOUN: Record<Kind, [string, string]> = {
  exercise: ['l’exercice', 'exercices'], exam: ['l’examen', 'examens'], lesson: ['la leçon', 'leçons'],
};

const subfieldOf = (o: Option) => (Array.isArray(o.subfield) ? o.subfield[0] : o.subfield) ?? null;
const isEmpty = (o: Option) => o.content_count === 0;

export const HorizontalFilterBar: React.FC<HorizontalFilterBarProps> = ({
  contentType,
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
  trailing,
  nationalSection = false,
  fixed,
  resultCount,
  resultLoading = false,
  onChipsChange,
}) => {
  const { isAuthenticated } = useAuth();
  const openSignup = useOpenSignup('filtre-statut');
  const phone = usePhone();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const [classLevels, setClassLevels] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [chapters, setChapters] = useState<Option[]>([]);
  // Nom et slug des chapitres choisis par l'adresse (page de chapitre, lien « S'entraîner ») avant que la
  // liste des chapitres du niveau soit chargée.
  const [chapterInfo, setChapterInfo] = useState<Record<string, { name: string; slug?: string }>>({});
  const [theorems, setTheorems] = useState<Option[]>([]);
  // null : pas encore chargés (le serveur n'envoie que les difficultés qui ont des contenus).
  const [difficultyCounts, setDifficultyCounts] = useState<Record<string, number> | null>(null);

  // Une seule matière (les maths) : choisie d'office, sans ligne « Matière ».
  const singleSubject = subjects.length === 1 ? String(subjects[0].id) : null;
  const subjectId = filters.subjects[0] ?? singleSubject;
  const fixedLevels = fixed?.classLevels ?? [];
  const fixedChapters = fixed?.chapters ?? [];

  useEffect(() => {
    getClassLevels(contentType).then((d) => setClassLevels(d as Option[])).catch((e) => console.error('Niveaux', e));
  }, [contentType]);

  const levelsKey = filters.classLevels.join(',');
  const subfieldsKey = filters.subfields.join(',');
  const chaptersKey = filters.chapters.join(',');

  const subjectsKey = filters.subjects.join(',');
  useEffect(() => {
    // Sans niveau, seulement pour nommer une matière venue de l'adresse.
    if (!filters.classLevels.length && !filters.subjects.length) { setSubjects([]); return; }
    let cancelled = false;
    getSubjects(filters.classLevels.length ? filters.classLevels : undefined, contentType)
      .then((d) => { if (!cancelled) setSubjects(d as Option[]); })
      .catch((e) => console.error('Matières', e));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelsKey, subjectsKey, contentType]);

  useEffect(() => {
    if (!filters.classLevels.length) { setChapters([]); return; }
    let cancelled = false;
    // Chapitres du niveau directement (le serveur n'exige ni matière ni sous-domaine).
    getChapters(filters.subjects[0] ?? '', filters.classLevels, filters.subfields, contentType)
      .then((d) => {
        if (cancelled) return;
        setChapters(d as Option[]);
        setChapterInfo((prev) => ({ ...prev, ...Object.fromEntries((d as Option[]).map((c) => [String(c.id), { name: c.name, slug: c.slug }])) }));
      })
      .catch((e) => console.error('Chapitres', e));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelsKey, subfieldsKey, contentType]);

  useEffect(() => {
    if (!filters.chapters.length || !filters.classLevels.length || !subjectId) { setTheorems([]); return; }
    let cancelled = false;
    getTheorems(subjectId, filters.classLevels, filters.subfields, filters.chapters, contentType)
      .then((d) => { if (!cancelled) setTheorems(d as Option[]); })
      .catch((e) => console.error('Théorèmes', e));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaptersKey, levelsKey, subfieldsKey, subjectId, contentType]);

  // Compteurs par difficulté : mêmes filtres que la liste, examens nationaux ou devoirs compris.
  useEffect(() => {
    if (contentType === 'lesson') return;
    let cancelled = false;
    getDifficultyCounts(contentType, {
      classLevels: filters.classLevels, subjects: filters.subjects, subfields: filters.subfields,
      chapters: filters.chapters, theorems: filters.theorems,
      isNationalExam: contentType === 'exam' ? nationalSection : undefined,
    })
      .then((d) => { if (!cancelled) setDifficultyCounts(d); })
      .catch((e) => console.error('Compteurs de difficulté', e));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, nationalSection, levelsKey, subjectsKey, subfieldsKey, chaptersKey, filters.theorems.join(',')]);

  // Chapitres de l'adresse absents de la liste chargée : leur nom pour l'étiquette, leur slug pour leur page.
  useEffect(() => {
    const missing = filters.chapters.filter((id) => !chapterInfo[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map((id) => api.get(`/chapters/${id}/`).then((r) => [id, { name: r.data?.name as string, slug: r.data?.slug as string | undefined }] as const).catch(() => null)))
      .then((rows) => {
        if (cancelled) return;
        const found = Object.fromEntries(rows.filter((r): r is NonNullable<typeof r> => !!r && !!r[1].name));
        if (Object.keys(found).length) setChapterInfo((prev) => ({ ...prev, ...found }));
      });
    return () => { cancelled = true; };
  }, [filters.chapters, chapterInfo]);

  const levelSlug = (id: string) => {
    const o = classLevels.find((l) => String(l.id) === id);
    return o ? o.slug || slugify(o.name) : undefined;
  };
  const chapterSlug = (id: string) => {
    const c = chapterInfo[id];
    return c ? c.slug || slugify(c.name) : undefined;
  };
  const emit = (next: ListFilters) => onFilterChange(next, {
    level: next.classLevels.length === 1 ? levelSlug(next.classLevels[0]) : undefined,
    chapter: next.chapters.length === 1 ? chapterSlug(next.chapters[0]) : undefined,
  });
  const toggle = (field: Parameters<typeof toggled>[1], value: string) => emit(toggled(filters, field, value));
  const clearAll = () => emit(clearedFilters(fixed));

  const status: Status = filters.todo ? 'todo'
    : filters.showFailed && !filters.showCompleted ? 'review'
      : filters.showCompleted && !filters.showFailed ? 'success' : 'all';
  const setStatus = (s: Status) => emit({
    ...filters, todo: s === 'todo', showFailed: s === 'review', showCompleted: s === 'success', showViewed: false, hideViewed: false,
  });

  const nameOf = (options: Option[], id: string) => options.find((o) => String(o.id) === id)?.name ?? id;

  // Étiquettes des filtres actifs (pas ceux qu'impose la page ; pas de statut pour un visiteur, le serveur l'ignore).
  const chips: ActiveChip[] = useMemo(() => {
    const out: ActiveChip[] = [];
    filters.classLevels.filter((id) => !fixedLevels.includes(id)).forEach((id) => out.push({ key: `classLevels:${id}`, label: nameOf(classLevels, id) }));
    if (!(singleSubject && filters.subjects.length === 1 && filters.subjects[0] === singleSubject)) {
      filters.subjects.forEach((id) => out.push({ key: `subjects:${id}`, label: nameOf(subjects, id) }));
    }
    filters.subfields.forEach((id) => {
      const sf = chapters.map(subfieldOf).find((s) => s && String(s.id) === id);
      out.push({ key: `subfields:${id}`, label: sf?.name ?? 'Sous-domaine' });
    });
    filters.chapters.filter((id) => !fixedChapters.includes(id)).forEach((id) => out.push({ key: `chapters:${id}`, label: chapterInfo[id]?.name ?? 'Chapitre' }));
    filters.theorems.forEach((id) => out.push({ key: `theorems:${id}`, label: nameOf(theorems, id) }));
    filters.difficulties.forEach((d) => out.push({ key: `difficulties:${d}`, label: DIFF_LABEL[d] ?? d }));
    if (isAuthenticated) STATUS_KEYS.forEach((k) => { if (filters[k]) out.push({ key: k, label: STATUS_LABEL[k] }); });
    if (filters.isNationalExam === true) out.push({ key: 'isNationalExam', label: 'National' });
    if (filters.isNationalExam === false) out.push({ key: 'isNationalExam', label: 'Autres examens' });
    if (filters.dateStart) out.push({ key: 'dateStart', label: `Depuis ${filters.dateStart}` });
    if (filters.dateEnd) out.push({ key: 'dateEnd', label: `Jusqu’à ${filters.dateEnd}` });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, classLevels, subjects, chapters, theorems, chapterInfo, isAuthenticated, singleSubject, fixedLevels.join(','), fixedChapters.join(',')]);

  const chipsKey = chips.map((c) => `${c.key}=${c.label}`).join('|');
  useEffect(() => { onChipsChange?.(chips); }, [chipsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilterCount = chips.length;

  // Tiroir du téléphone : Échap ferme, la page derrière ne défile pas, le focus revient au bouton.
  const sheetOpen = phone && isPanelOpen;
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sheetOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsPanelOpen(false); return; }
      // Tab reste dans le tiroir (la page derrière est inaccessible tant qu'il est ouvert).
      const sheet = sheetRef.current;
      if (e.key !== 'Tab' || !sheet) return;
      const focusable = [...sheet.querySelectorAll<HTMLElement>('button:not([disabled]), select, a[href], input, [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === sheet)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !sheet.contains(active))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const toggleBtn = toggleRef.current;
    window.setTimeout(() => sheetRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      toggleBtn?.focus();
    };
  }, [sheetOpen]);

  const renderChip = (chip: ActiveChip) => (
    <button
      key={chip.key}
      type="button"
      onClick={() => emit(withoutChip(filters, chip.key))}
      aria-label={`Retirer ${chip.label}`}
      title={`Retirer ${chip.label}`}
      className="inline-flex shrink-0 items-center gap-1.5 h-9 pl-3 pr-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-sm font-medium whitespace-nowrap transition-colors"
    >
      {chip.label}
      <X className="w-3.5 h-3.5" />
    </button>
  );

  const pill = (selected: boolean) => `min-h-10 sm:min-h-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
    selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`;
  const visible = (options: Option[], selected: string[]) => options.filter((o) => !isEmpty(o) || selected.includes(String(o.id)));

  // Chapitres du niveau, regroupés par sous-domaine (Analyse, Algèbre…).
  const chapterGroups = useMemo(() => {
    const groups = new Map<string, Option[]>();
    for (const c of visible(chapters, filters.chapters)) {
      const name = subfieldOf(c)?.name ?? '';
      groups.set(name, [...(groups.get(name) ?? []), c]);
    }
    return [...groups.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, chaptersKey]);

  const nationalYears = Array.from({ length: new Date().getFullYear() - 2008 + 1 }, (_, i) => 2008 + i).reverse();

  const rows = (
    <div className="space-y-0">
      <FilterRow title="Niveau">
        {visible(classLevels, filters.classLevels).map((o) => (
          <OptionButton key={o.id} option={o} selected={filters.classLevels.includes(String(o.id))} className={pill(filters.classLevels.includes(String(o.id)))}
            onClick={() => toggle('classLevels', String(o.id))} />
        ))}
      </FilterRow>

      {/* Matière : seulement s'il y en a plusieurs (sinon choisie d'office). */}
      {filters.classLevels.length > 0 && subjects.length > 1 && (
        <FilterRow title="Matière">
          {visible(subjects, filters.subjects).map((o) => (
            <OptionButton key={o.id} option={o} selected={filters.subjects.includes(String(o.id))} className={pill(filters.subjects.includes(String(o.id)))}
              onClick={() => toggle('subjects', String(o.id))} />
          ))}
        </FilterRow>
      )}

      {/* Chapitres juste après le niveau, par sous-domaine. */}
      {filters.classLevels.length > 0 && chapterGroups.length > 0 && (
        <FilterRow title="Chapitre">
          <div className="flex flex-col gap-2.5 w-full">
            {chapterGroups.map(([group, options]) => (
              <div key={group || '-'}>
                {chapterGroups.length > 1 && group && (
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {options.map((o) => (
                    <OptionButton key={o.id} option={o} selected={filters.chapters.includes(String(o.id))} className={pill(filters.chapters.includes(String(o.id)))}
                      onClick={() => toggle('chapters', String(o.id))} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </FilterRow>
      )}

      {filters.chapters.length > 0 && visible(theorems, filters.theorems).length > 0 && (
        <FilterRow title="Théorème">
          {visible(theorems, filters.theorems).map((o) => (
            <OptionButton key={o.id} option={o} selected={filters.theorems.includes(String(o.id))} className={pill(filters.theorems.includes(String(o.id)))}
              onClick={() => toggle('theorems', String(o.id))} />
          ))}
        </FilterRow>
      )}

      {/* Difficulté — exercices et examens ; une difficulté sans résultat ne se choisit pas. */}
      {contentType !== 'lesson' && (
        <FilterRow title="Difficulté">
          {([
            { id: 'easy', name: 'Facile', selected: 'bg-emerald-600 text-white shadow-sm', unselected: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' },
            { id: 'medium', name: 'Moyen', selected: 'bg-amber-500 text-white shadow-sm', unselected: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' },
            { id: 'hard', name: 'Difficile', selected: 'bg-rose-600 text-white shadow-sm', unselected: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' },
          ] as const).map((diff) => {
            const isSelected = filters.difficulties.includes(diff.id);
            const count = difficultyCounts ? (difficultyCounts[diff.id] ?? 0) : undefined;
            const off = count === 0 && !isSelected;
            return (
              <button
                key={diff.id}
                type="button"
                aria-pressed={isSelected}
                disabled={off}
                onClick={() => toggle('difficulties', diff.id)}
                className={`min-h-10 sm:min-h-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isSelected ? diff.selected : diff.unselected}`}
              >
                <span className="inline-flex items-center gap-1.5"><DifficultyBars difficulty={diff.id} />{diff.name}</span>
                {count != null && <span className={`ml-1.5 ${isSelected ? 'opacity-75' : 'opacity-50'}`}>({count})</span>}
              </button>
            );
          })}
        </FilterRow>
      )}

      {/* Statut — choix unique ; un visiteur n'a rien de fait, on l'invite à se connecter. */}
      {contentType !== 'lesson' && (
        <FilterRow title="Statut">
          {isAuthenticated ? (
            <div role="radiogroup" aria-label="Statut" className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((o) => (
                <button key={o.id} type="button" role="radio" aria-checked={status === o.id} onClick={() => setStatus(o.id)}
                  className={pill(status === o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => openSignup('login')}
              className="min-h-10 sm:min-h-0 px-3.5 py-2 rounded-lg text-sm font-medium text-brand-hover bg-brand-soft hover:bg-brand hover:text-white transition-colors text-left">
              Connecte-toi pour filtrer ce que tu as fait
            </button>
          )}
        </FilterRow>
      )}

      {/* Examens nationaux : filtre par année du Bac (la section décide national / devoirs). */}
      {contentType === 'exam' && nationalSection && (
        <FilterRow title="Année du Bac" last>
          <div className="flex items-center gap-3">
            <select
              value={filters.dateStart || ''}
              onChange={(e) => emit({ ...filters, dateStart: e.target.value || null })}
              aria-label="Depuis l’année"
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">De…</option>
              {nationalYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <span className="text-slate-400 text-sm">—</span>
            <select
              value={filters.dateEnd || ''}
              onChange={(e) => emit({ ...filters, dateEnd: e.target.value || null })}
              aria-label="Jusqu’à l’année"
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">À…</option>
              {nationalYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </FilterRow>
      )}
    </div>
  );

  const [the, many] = NOUN[contentType];
  const seeLabel = resultLoading || resultCount == null ? 'Voir les résultats'
    : resultCount === 0 ? 'Aucun résultat'
      : resultCount === 1 ? `Voir ${the}` : `Voir les ${resultCount} ${many}`;

  return (
    // Téléphone : la barre reste sous la barre du haut (60 px) pendant le défilement.
    <div className="sticky top-[60px] z-20 sm:static bg-white rounded-2xl border border-[#e7e3dc] mb-5 sm:mb-6 shadow-[0_6px_16px_rgba(20,18,16,.05)] sm:shadow-none">
      {/* Toolbar */}
      <div className="px-3 py-2.5 sm:p-4">
        <div className="flex flex-row items-center gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              data-tour="liste-filtres"
              aria-expanded={isPanelOpen}
              aria-haspopup={phone ? 'dialog' : undefined}
              className={`inline-flex items-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl font-semibold text-sm transition-all ${
                isPanelOpen && !phone
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FilterIcon className="w-4 h-4" />
              <span>Filtres</span>
              {activeFilterCount > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                  isPanelOpen && !phone ? 'bg-white/20 text-white' : 'bg-slate-900 text-white'
                }`}>
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`hidden sm:block w-4 h-4 transition-transform duration-200 ${isPanelOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Étiquettes actives (ordinateur : à la suite du bouton). */}
            {chips.length > 0 && <div className="hidden sm:flex flex-wrap items-center gap-2">{chips.map(renderChip)}</div>}

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Effacer
              </button>
            )}
          </div>

          {/* Right: Sort */}
          <div data-tour="liste-tri" className="flex items-center gap-2 sm:border-l sm:border-slate-200 sm:pl-3 flex-shrink-0">
            <ArrowUpDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            <SortDropdown value={sortBy} onChange={onSortChange} easiest={contentType !== 'lesson'} className="max-w-[52vw] sm:max-w-none" />
          </div>
          {trailing && <div className="flex-shrink-0">{trailing}</div>}
        </div>

        {/* Téléphone : les étiquettes sur une seule ligne qui défile. */}
        {chips.length > 0 && (
          <div className="sm:hidden mt-2 -mx-3 px-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {chips.map(renderChip)}
          </div>
        )}
      </div>

      {/* Ordinateur : panneau dépliable dans la page. */}
      <AnimatePresence>
        {isPanelOpen && !phone && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-200 px-5 py-4">
              {rows}
              {activeFilterCount > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Tout effacer
                  </button>
                  <span className="text-xs text-slate-400">
                    {activeFilterCount} filtre{activeFilterCount !== 1 ? 's' : ''} actif{activeFilterCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Téléphone : tiroir depuis le bas (hors de la barre collante, pour passer au-dessus de tout). */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {sheetOpen && (
            <div className="fixed inset-0 z-[60] flex flex-col justify-end print:hidden">
              <motion.div
                className="absolute inset-0 bg-black/40"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsPanelOpen(false)}
                aria-hidden
              />
              <motion.div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="filtres-titre"
                tabIndex={-1}
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
                className="relative flex max-h-[88vh] flex-col rounded-t-2xl bg-white shadow-2xl outline-none"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              >
                <div className="flex items-center justify-between h-14 pl-4 pr-2 border-b border-slate-100">
                  <h2 id="filtres-titre" className="text-[16px] font-semibold text-ink">
                    Filtres{activeFilterCount > 0 ? <span className="ml-1.5 text-ink-faint font-medium">({activeFilterCount})</span> : null}
                  </h2>
                  <button type="button" onClick={() => setIsPanelOpen(false)} aria-label="Fermer"
                    className="inline-flex w-10 h-10 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3">{rows}</div>
                <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100">
                  {activeFilterCount > 0 && (
                    <button type="button" onClick={clearAll}
                      className="inline-flex items-center gap-1.5 h-11 px-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">
                      <RotateCcw className="w-3.5 h-3.5" /> Tout effacer
                    </button>
                  )}
                  <button type="button" onClick={() => setIsPanelOpen(false)}
                    className="flex-1 h-11 rounded-xl bg-brand text-white text-[14.5px] font-semibold hover:bg-brand-hover transition-colors fd-nums">
                    {seeLabel}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};

/** Ligne du panneau : libellé + boutons (libellé au-dessus sur téléphone). */
const FilterRow: React.FC<{ title: string; last?: boolean; children: React.ReactNode }> = ({ title, last, children }) => (
  <div className={`flex flex-col sm:flex-row sm:items-start gap-2 ${last ? 'pb-1' : 'border-b border-slate-100 pb-3 mb-3'}`}>
    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-28 flex-shrink-0 sm:pt-2">
      {title}
    </span>
    <div className="flex flex-wrap gap-2 min-w-0 flex-1">{children}</div>
  </div>
);

const OptionButton: React.FC<{ option: Option; selected: boolean; className: string; onClick: () => void }> = ({ option, selected, className, onClick }) => (
  <button type="button" aria-pressed={selected} onClick={onClick} className={className}>
    {option.name}
    {option.content_count != null && (
      <span className={`ml-1.5 ${selected ? 'opacity-75' : 'opacity-50'}`}>({option.content_count})</span>
    )}
  </button>
);
