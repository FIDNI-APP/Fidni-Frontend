/**
 * Barre de filtres des listes (exercices, examens, leçons), allégée le 11/10/2026 :
 * - en vue, le filtre le plus utile : le statut de l'élève en onglets (Tout · À faire · À revoir · Réussis) ;
 *   à droite, le tri (« Pour toi ») et « Filtres » ; le reste (niveau, chapitre, théorème, difficulté, année
 *   du Bac) dans le panneau « Filtres » ;
 * - Niveau, puis directement les chapitres du niveau, regroupés par sous-domaine (la matière, unique
 *   aujourd'hui, est choisie d'office et sa ligne cachée) ;
 * - Options à 0 masquées (sauf si déjà choisies), difficultés à 0 désactivées ;
 * - Filtres actifs en étiquettes « × » sous la barre ;
 * - Téléphone : le panneau s'ouvre en tiroir depuis le bas, avec « Voir les N exercices ». La barre n'est plus
 *   collante (elle cachait les cartes en défilant).
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, SlidersHorizontal, RotateCcw } from 'lucide-react';
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
  /** Liste ouverte depuis un dossier (10/10/2026) : « chapter » = le dossier fixe niveau et chapitre (lignes
   *  Niveau, Matière, Chapitre masquées) ; « year » = une année du Bac (ligne « Année du Bac » masquée). */
  inFolder?: 'chapter' | 'year';
  /** Dossier d'une année du Bac : compteurs de difficulté de cette année. */
  nationalYear?: string;
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
  inFolder,
  nationalYear,
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
    // Dossier d'un chapitre : pas de ligne Chapitre, rien à charger.
    if (!filters.classLevels.length || inFolder === 'chapter') { setChapters([]); return; }
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
  }, [levelsKey, subfieldsKey, contentType, inFolder]);

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
      nationalYear,
    })
      .then((d) => { if (!cancelled) setDifficultyCounts(d); })
      .catch((e) => console.error('Compteurs de difficulté', e));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, nationalSection, nationalYear, levelsKey, subjectsKey, subfieldsKey, chaptersKey, filters.theorems.join(',')]);

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
      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#efece6] pl-3.5 pr-2.5 text-[13px] font-medium text-ink-soft whitespace-nowrap transition-colors hover:bg-[#e7e3dc] hover:text-ink sm:min-h-9"
    >
      {chip.label}
      <X className="w-3.5 h-3.5" />
    </button>
  );

  const pill = (selected: boolean) => `min-h-10 sm:min-h-9 px-3.5 py-1.5 rounded-full border text-[13.5px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
    selected ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`;
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
    // La dernière ligne n'a pas de trait sous elle.
    <div className="[&>*:last-child]:mb-0 [&>*:last-child]:border-b-0 [&>*:last-child]:pb-1">
      {/* Dans le dossier d'un chapitre, niveau et chapitre sont ceux du dossier : pas de ligne pour les changer. */}
      {inFolder !== 'chapter' && (
        <FilterRow title="Niveau">
          {visible(classLevels, filters.classLevels).map((o) => (
            <OptionButton key={o.id} option={o} selected={filters.classLevels.includes(String(o.id))} className={pill(filters.classLevels.includes(String(o.id)))}
              onClick={() => toggle('classLevels', String(o.id))} />
          ))}
        </FilterRow>
      )}

      {/* Matière : seulement s'il y en a plusieurs (sinon choisie d'office). */}
      {inFolder !== 'chapter' && filters.classLevels.length > 0 && subjects.length > 1 && (
        <FilterRow title="Matière">
          {visible(subjects, filters.subjects).map((o) => (
            <OptionButton key={o.id} option={o} selected={filters.subjects.includes(String(o.id))} className={pill(filters.subjects.includes(String(o.id)))}
              onClick={() => toggle('subjects', String(o.id))} />
          ))}
        </FilterRow>
      )}

      {/* Chapitres juste après le niveau, par sous-domaine. */}
      {inFolder !== 'chapter' && filters.classLevels.length > 0 && chapterGroups.length > 0 && (
        <FilterRow title="Chapitre">
          <div className="flex flex-col gap-2.5 w-full">
            {chapterGroups.map(([group, options]) => (
              <div key={group || '-'}>
                {chapterGroups.length > 1 && group && (
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-ink-faint">{group}</p>
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
            // Couleurs de la difficulté (mêmes teintes que les cartes : listingUtils DIFFICULTY).
            { id: 'easy', name: 'Facile', selected: 'border-[#2f8a57] bg-[#2f8a57] text-white', unselected: 'border-[#cfe5d7] bg-[#eaf3ed] text-[#15633c] hover:border-[#2f8a57]' },
            { id: 'medium', name: 'Moyen', selected: 'border-[#c9962e] bg-[#c9962e] text-white', unselected: 'border-[#efdcae] bg-[#faf3e2] text-[#8a6318] hover:border-[#c9962e]' },
            { id: 'hard', name: 'Difficile', selected: 'border-[#b4534b] bg-[#b4534b] text-white', unselected: 'border-[#f0d4cf] bg-[#fbecea] text-[#a23b34] hover:border-[#b4534b]' },
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
                className={`min-h-10 sm:min-h-9 px-3.5 py-1.5 rounded-full border text-[13.5px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-40 ${
                  isSelected ? diff.selected : diff.unselected}`}
              >
                <span className="inline-flex items-center gap-1.5"><DifficultyBars difficulty={diff.id} />{diff.name}</span>
                {count != null && <span className={`fd-nums ml-1.5 ${isSelected ? 'opacity-70' : 'text-ink-faint'}`}>{count}</span>}
              </button>
            );
          })}
        </FilterRow>
      )}

      {/* Statut — élève : les onglets de la barre ; un visiteur n'a rien de fait, on l'invite à se connecter. */}
      {contentType !== 'lesson' && !isAuthenticated && (
        <FilterRow title="Statut">
          <button type="button" onClick={() => openSignup('login')}
            className="min-h-10 rounded-full bg-brand-soft px-3.5 py-1.5 text-left text-[13.5px] font-medium text-brand-hover transition-colors hover:bg-brand hover:text-white sm:min-h-9">
            Connecte-toi pour filtrer ce que tu as fait
          </button>
        </FilterRow>
      )}

      {/* Examens nationaux : filtre par année du Bac (la section décide national / devoirs). */}
      {contentType === 'exam' && nationalSection && inFolder !== 'year' && (
        <FilterRow title="Année du Bac" last>
          <div className="flex items-center gap-3">
            <select
              value={filters.dateStart || ''}
              onChange={(e) => emit({ ...filters, dateStart: e.target.value || null })}
              aria-label="Depuis l’année"
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13.5px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">De…</option>
              {nationalYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <span className="text-[13px] text-ink-faint">à</span>
            <select
              value={filters.dateEnd || ''}
              onChange={(e) => emit({ ...filters, dateEnd: e.target.value || null })}
              aria-label="Jusqu’à l’année"
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13.5px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">À…</option>
              {nationalYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </FilterRow>
      )}
    </div>
  );

  // Une ligne au moins dans le panneau ? Dans le dossier d'un chapitre de leçons, il ne reste parfois que le
  // théorème : sans lui, le bouton « Filtres » ouvrirait un panneau vide.
  const hasRows = inFolder !== 'chapter' || contentType !== 'lesson'
    || (filters.chapters.length > 0 && visible(theorems, filters.theorems).length > 0);
  // Onglets du statut en vue : élève connecté, exercices et examens.
  const quickStatus = isAuthenticated && contentType !== 'lesson';
  // Étiquettes sous la barre : pas celles du statut quand les onglets le montrent déjà.
  const shownChips = quickStatus ? chips.filter((c) => !(STATUS_KEYS as readonly string[]).includes(c.key)) : chips;
  // Pastille de « Filtres » : ce qui se choisit dans le panneau (le statut a ses onglets).
  const panelCount = shownChips.length;

  const [the, many] = NOUN[contentType];
  const seeLabel = resultLoading || resultCount == null ? 'Voir les résultats'
    : resultCount === 0 ? 'Aucun résultat'
      : resultCount === 1 ? `Voir ${the}` : `Voir les ${resultCount} ${many}`;

  return (
    <div className="mb-5 sm:mb-6">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        {/* Le statut de l'élève, en onglets (choix unique). */}
        {quickStatus && (
          <div role="radiogroup" aria-label="Statut" data-tour="liste-statut"
            className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-white p-1 sm:inline-flex sm:grid-cols-none">
            {STATUS_OPTIONS.map((o) => {
              const on = status === o.id;
              return (
                <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => setStatus(o.id)}
                  className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-[13.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:min-h-9 sm:px-3.5 ${
                    on ? 'bg-ink text-white' : 'text-ink-faint hover:bg-[#f7f6f3] hover:text-ink'}`}>
                  {o.id === 'review' && <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-gold-line' : 'bg-gold'}`} aria-hidden />}
                  {o.id === 'success' && <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-brand-line' : 'bg-brand'}`} aria-hidden />}
                  {o.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Tri, filtres, affichage. */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <div data-tour="liste-tri" className="min-w-0 flex-1 sm:flex-none">
            <SortDropdown value={sortBy} onChange={onSortChange} easiest={contentType !== 'lesson'} className="w-full sm:w-auto" />
          </div>
          {hasRows && (
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              data-tour="liste-filtres"
              aria-expanded={isPanelOpen}
              aria-haspopup={phone ? 'dialog' : undefined}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[13.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                isPanelOpen && !phone ? 'border-ink bg-[#f7f6f3] text-ink' : 'border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filtres</span>
              {panelCount > 0 && (
                <span className="fd-nums inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-bold text-white">
                  {panelCount}
                </span>
              )}
              <ChevronDown className={`hidden h-4 w-4 transition-transform duration-200 sm:block ${isPanelOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
          {trailing && <div className="flex-shrink-0">{trailing}</div>}
        </div>
      </div>

      {/* Filtres actifs : une étiquette « × » chacun. */}
      {shownChips.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {shownChips.map(renderChip)}
          {shownChips.length > 1 && (
            <button type="button" onClick={clearAll}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-ink-faint transition-colors hover:text-ink sm:min-h-9">
              <RotateCcw className="h-3.5 w-3.5" /> Tout effacer
            </button>
          )}
        </div>
      )}

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
            <div className="mt-3 rounded-2xl border border-line bg-white px-5 py-4">
              {rows}
              <div className="mt-1 flex items-center justify-between border-t border-[#f0ede8] pt-3">
                {activeFilterCount > 0 ? (
                  <button type="button" onClick={clearAll}
                    className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-medium text-ink-faint transition-colors hover:text-ink">
                    <RotateCcw className="h-3.5 w-3.5" /> Tout effacer
                  </button>
                ) : <span />}
                <button type="button" onClick={() => setIsPanelOpen(false)}
                  className="inline-flex min-h-9 items-center rounded-xl px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-[#f2f1ee] hover:text-ink">
                  Fermer
                </button>
              </div>
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
                <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#e7e3dc]" aria-hidden />
                <div className="flex items-center justify-between h-12 pl-4 pr-2 border-b border-[#f0ede8]">
                  <h2 id="filtres-titre" className="text-[16px] font-semibold text-ink">
                    Filtres{panelCount > 0 ? <span className="ml-1.5 text-ink-faint font-medium">({panelCount})</span> : null}
                  </h2>
                  <button type="button" onClick={() => setIsPanelOpen(false)} aria-label="Fermer"
                    className="inline-flex w-10 h-10 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3">{rows}</div>
                <div className="flex items-center gap-2 px-4 py-3 border-t border-[#f0ede8]">
                  {activeFilterCount > 0 && (
                    <button type="button" onClick={clearAll}
                      className="inline-flex items-center gap-1.5 h-11 px-3 rounded-xl text-[13.5px] font-medium text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
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
  <div className={`flex flex-col sm:flex-row sm:items-start gap-2 ${last ? 'pb-1' : 'border-b border-[#f0ede8] pb-3.5 mb-3.5'}`}>
    <span className="w-28 flex-shrink-0 text-[11px] font-semibold uppercase tracking-[.08em] text-ink-faint sm:pt-2.5">
      {title}
    </span>
    <div className="flex flex-wrap gap-2 min-w-0 flex-1">{children}</div>
  </div>
);

const OptionButton: React.FC<{ option: Option; selected: boolean; className: string; onClick: () => void }> = ({ option, selected, className, onClick }) => (
  <button type="button" aria-pressed={selected} onClick={onClick} className={className}>
    {option.name}
    {option.content_count != null && (
      <span className={`fd-nums ml-1.5 ${selected ? 'opacity-70' : 'text-ink-faint'}`}>{option.content_count}</span>
    )}
  </button>
);
