// Assistant « Ajouter un contenu », étape « Écrire » (exercice, examen) : une carte par question, l'énoncé
// d'abord ; indication, solution, barème et sous-questions s'ajoutent d'un clic, sans rien imposer.
// Même structure que le reste du site (blocks / subQuestions, champ `hint` pour l'indication).
import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Heading, Lightbulb, ListPlus, Plus, Text, Trash2, CheckCircle2 } from 'lucide-react';
import { TextBlockEditor } from '@/components/content/editor/TextBlockEditor';
import type { ExerciseBlock, SubQuestionBlock } from '@/components/content/editor/FlexibleExerciseEditor';
import type { ContentBlock } from '@/types/content';

const newId = () => Math.random().toString(36).slice(2, 9);
const empty = (): ContentBlock => ({ type: 'text', html: '' });
const filled = (b?: ContentBlock) => !!b?.html && b.html.replace(/<[^>]*>/g, '').trim().length > 0;

export const newQuestion = (): ExerciseBlock => ({ id: newId(), type: 'question', content: empty(), subQuestions: [] });
export const newSection = (n: number): ExerciseBlock => ({ id: newId(), type: 'section', content: { type: 'text', html: `Exercice ${n}` } });
const newContext = (): ExerciseBlock => ({ id: newId(), type: 'context', content: empty(), subQuestions: [] });
const newSub = (): SubQuestionBlock => ({ id: newId(), content: empty() });
const letter = (i: number) => String.fromCharCode(97 + (i % 26));

const iconBtn = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink disabled:opacity-30';
const chip = (on: boolean, tone: 'gold' | 'brand') =>
  `inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors ${
    on ? (tone === 'gold' ? 'border-gold-line bg-gold-soft text-gold-strong' : 'border-brand-line bg-brand-soft text-brand-hover')
      : 'border-line bg-white text-ink-soft hover:border-ink/40 hover:text-ink'}`;

const Points: React.FC<{ value?: number; onChange: (v?: number) => void }> = ({ value, onChange }) => (
  <label className="inline-flex items-center gap-1 text-[12px] text-ink-faint">
    <input type="number" min="0" step="0.25" inputMode="decimal" value={value ?? ''} placeholder="—"
      onChange={(e) => { const v = parseFloat(e.target.value); onChange(Number.isFinite(v) && v > 0 ? v : undefined); }}
      className="h-8 w-14 rounded-lg border border-line bg-white px-2 text-center text-[13px] text-ink focus:border-brand focus:outline-none" />
    pt
  </label>
);

/** Indication et solution d'une question (ou sous-question) : fermées tant qu'elles sont vides. */
const Extras: React.FC<{
  hint?: ContentBlock; solution?: ContentBlock; onChange: (p: { hint?: ContentBlock; solution?: ContentBlock }) => void;
}> = ({ hint, solution, onChange }) => {
  const [showHint, setShowHint] = useState(filled(hint));
  const [showSol, setShowSol] = useState(filled(solution));
  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={chip(showHint, 'gold')} aria-pressed={showHint}
          onClick={() => { if (showHint) onChange({ hint: undefined }); setShowHint(!showHint); }}>
          <Lightbulb className="h-3.5 w-3.5" /> {showHint ? 'Indication' : 'Ajouter une indication'}
        </button>
        <button type="button" className={chip(showSol, 'brand')} aria-pressed={showSol}
          onClick={() => { if (showSol) onChange({ solution: undefined }); setShowSol(!showSol); }}>
          <CheckCircle2 className="h-3.5 w-3.5" /> {showSol ? 'Solution' : 'Ajouter la solution'}
        </button>
      </div>
      {showHint && (
        <div className="rounded-xl border border-gold-line bg-gold-soft/40 p-2">
          <p className="mb-1 px-1 text-[11.5px] text-gold-strong">La méthode en une ou deux phrases, sans le calcul — montrée avant la solution.</p>
          <TextBlockEditor value={hint} onChange={(h) => onChange({ hint: h })} placeholder="Ex. forme indéterminée : on factorise par le terme dominant." minHeight="40px" />
        </div>
      )}
      {showSol && (
        <div className="rounded-xl border border-brand-line bg-brand-soft/40 p-2">
          <TextBlockEditor value={solution} onChange={(s) => onChange({ solution: s })} placeholder="La solution rédigée, comme sur une copie." minHeight="60px" />
        </div>
      )}
    </div>
  );
};

interface Props {
  blocks: ExerciseBlock[];
  onChange: (blocks: ExerciseBlock[]) => void;
  isExam: boolean;
}

export const QuestionsEditor: React.FC<Props> = ({ blocks, onChange, isExam }) => {
  const set = (i: number, b: ExerciseBlock) => onChange(blocks.map((x, j) => (j === i ? b : x)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...blocks];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const remove = (i: number) => {
    const b = blocks[i];
    if ((filled(b.content) || b.subQuestions?.length) && b.type !== 'section'
      && !window.confirm('Supprimer cette question et tout ce qu’elle contient ?')) return;
    onChange(blocks.filter((_, j) => j !== i));
  };
  const sections = blocks.filter((b) => b.type === 'section').length;

  let q = 0;
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        const tools = (
          <span className="ml-auto flex shrink-0 items-center">
            <button type="button" className={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" className={iconBtn} onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Descendre"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" className={`${iconBtn} hover:!text-[#a23b34]`} onClick={() => remove(i)} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
          </span>
        );

        if (b.type === 'section') {
          q = 0; // chaque partie renumérote ses questions, comme sur le site
          const title = (b.content?.html || '').replace(/<[^>]*>/g, '');
          return (
            <div key={b.id} className="flex flex-wrap items-center gap-2 border-b-2 border-ink/80 pb-2 pt-4">
              <input value={title} onChange={(e) => set(i, { ...b, content: { type: 'text', html: e.target.value } })}
                aria-label="Titre de la partie" placeholder="Exercice 1"
                className="fd-paper min-w-0 flex-1 bg-transparent text-[19px] font-bold text-ink placeholder:text-ink-faint focus:outline-none" />
              <Points value={b.points} onChange={(points) => set(i, { ...b, points })} />
              {tools}
            </div>
          );
        }

        if (b.type === 'context') {
          return (
            <div key={b.id} className="rounded-2xl border border-line bg-white p-3 sm:p-4">
              <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-ink-soft"><Text className="h-4 w-4" /> Texte d’introduction {tools}</div>
              <TextBlockEditor value={b.content} onChange={(content) => set(i, { ...b, content })}
                placeholder="Ex. On considère la fonction f définie sur ℝ par…" minHeight="50px" />
            </div>
          );
        }

        q += 1;
        const subs = b.subQuestions || [];
        const setSubs = (next: SubQuestionBlock[]) => set(i, { ...b, subQuestions: next, ...(next.length ? { hint: undefined, solution: undefined, points: undefined } : {}) });
        return (
          <div key={b.id} className="rounded-2xl border border-line bg-white p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="fd-paper text-[16px] font-bold text-ink">{q}.</span>
              <span className="text-[12.5px] font-semibold text-ink-soft">Question {q}</span>
              {!subs.length && (isExam || b.points) ? <Points value={b.points} onChange={(points) => set(i, { ...b, points })} /> : null}
              {tools}
            </div>
            <TextBlockEditor value={b.content} onChange={(content) => set(i, { ...b, content })}
              placeholder="L’énoncé de la question (formules entre $…$)." minHeight="50px" />

            {!subs.length && (
              <Extras hint={b.hint} solution={b.solution} onChange={(p) => set(i, { ...b, ...p })} />
            )}

            {subs.length > 0 && (
              <div className="mt-3 space-y-3 border-l-2 border-line pl-3 sm:pl-4">
                {subs.map((sq, k) => (
                  <div key={sq.id}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="fd-paper text-[15px] font-bold text-ink-soft">{letter(k)})</span>
                      {isExam || sq.points ? <Points value={sq.points} onChange={(points) => setSubs(subs.map((x, j) => (j === k ? { ...x, points } : x)))} /> : null}
                      <button type="button" className={`${iconBtn} ml-auto hover:!text-[#a23b34]`} aria-label="Supprimer la sous-question"
                        onClick={() => setSubs(subs.filter((_, j) => j !== k))}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <TextBlockEditor value={sq.content} onChange={(content) => setSubs(subs.map((x, j) => (j === k ? { ...x, content } : x)))}
                      placeholder={`Sous-question ${letter(k)})`} minHeight="40px" />
                    <Extras hint={sq.hint} solution={sq.solution}
                      onChange={(p) => setSubs(subs.map((x, j) => (j === k ? { ...x, ...p } : x)))} />
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setSubs([...subs, newSub()])}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-medium text-ink-soft hover:bg-[#f2f1ee] hover:text-ink">
              <ListPlus className="h-4 w-4" /> {subs.length ? 'Ajouter une sous-question' : 'Découper en sous-questions a), b)…'}
            </button>
          </div>
        );
      })}

      {/* Ajouter : la question d'abord (le cas courant), le reste à côté. */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="button" onClick={() => onChange([...blocks, newQuestion()])} className="fd-btn-primary min-h-10 px-4 text-[13.5px]">
          <Plus className="h-4 w-4" /> Question
        </button>
        <button type="button" onClick={() => onChange([...blocks, newContext()])}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-soft hover:border-ink/40 hover:text-ink">
          <Text className="h-4 w-4" /> Texte d’introduction
        </button>
        {isExam && (
          <button type="button" onClick={() => onChange([...blocks, newSection(sections + 1)])}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-soft hover:border-ink/40 hover:text-ink">
            <Heading className="h-4 w-4" /> Exercice {sections + 1}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionsEditor;
