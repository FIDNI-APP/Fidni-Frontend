// Assistant « Ajouter un contenu », étape « Écrire » (leçon) : des parties (I., II.…) avec leur texte et,
// au besoin, des sous-parties (1., 2.…). Les encadrés (définition, théorème…) sont dans la barre « Encarts ».
import React from 'react';
import { ArrowDown, ArrowUp, ListPlus, Plus, Trash2 } from 'lucide-react';
import { TextBlockEditor } from '@/components/content/editor/TextBlockEditor';
import type { SectionBlock, SubSectionBlock } from '@/components/content/editor/FlexibleLessonEditor';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const newId = () => Math.random().toString(36).slice(2, 9);
export const newLessonSection = (): SectionBlock => ({ id: newId(), title: '', content: { type: 'text', html: '' }, subSections: [] });
const iconBtn = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink disabled:opacity-30';

export const LessonSectionsEditor: React.FC<{ sections: SectionBlock[]; onChange: (s: SectionBlock[]) => void }> = ({ sections, onChange }) => {
  const set = (i: number, s: SectionBlock) => onChange(sections.map((x, j) => (j === i ? s : x)));
  const move = (i: number, d: -1 | 1) => { const n = [...sections]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n); };
  const remove = (i: number) => {
    if (sections[i].content?.html && !window.confirm('Supprimer cette partie et son texte ?')) return;
    onChange(sections.filter((_, j) => j !== i));
  };
  return (
    <div className="space-y-3">
      {sections.map((s, i) => {
        const subs = s.subSections || [];
        const setSubs = (next: SubSectionBlock[]) => set(i, { ...s, subSections: next });
        return (
          <div key={s.id} className="rounded-2xl border border-line bg-white p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="fd-paper text-[18px] font-bold text-brand">{ROMAN[i] || i + 1}.</span>
              <input value={s.title} onChange={(e) => set(i, { ...s, title: e.target.value })} placeholder="Titre de la partie (ex. Dérivabilité)"
                aria-label={`Titre de la partie ${i + 1}`}
                className="fd-paper min-w-0 flex-1 bg-transparent text-[18px] font-bold text-ink placeholder:text-ink-faint focus:outline-none" />
              <button type="button" className={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" className={iconBtn} onClick={() => move(i, 1)} disabled={i === sections.length - 1} aria-label="Descendre"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" className={`${iconBtn} hover:!text-[#a23b34]`} onClick={() => remove(i)} aria-label="Supprimer la partie"><Trash2 className="h-4 w-4" /></button>
            </div>
            <TextBlockEditor value={s.content} onChange={(content) => set(i, { ...s, content })}
              placeholder="Le texte de la partie. « Encarts » pour une définition, un théorème, une méthode…" minHeight="70px" />
            {subs.length > 0 && (
              <div className="mt-3 space-y-3 border-l-2 border-line pl-3 sm:pl-4">
                {subs.map((ss, k) => (
                  <div key={ss.id}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="fd-paper text-[15px] font-bold text-brand">{k + 1}.</span>
                      <input value={ss.title} onChange={(e) => setSubs(subs.map((x, j) => (j === k ? { ...x, title: e.target.value } : x)))}
                        placeholder="Titre de la sous-partie" aria-label={`Titre de la sous-partie ${k + 1}`}
                        className="fd-paper min-w-0 flex-1 bg-transparent text-[15.5px] font-bold text-ink placeholder:text-ink-faint focus:outline-none" />
                      <button type="button" className={`${iconBtn} hover:!text-[#a23b34]`} aria-label="Supprimer la sous-partie"
                        onClick={() => setSubs(subs.filter((_, j) => j !== k))}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <TextBlockEditor value={ss.content} onChange={(content) => setSubs(subs.map((x, j) => (j === k ? { ...x, content } : x)))}
                      placeholder="Texte de la sous-partie" minHeight="50px" />
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setSubs([...subs, { id: newId(), title: '', content: { type: 'text', html: '' } }])}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-medium text-ink-soft hover:bg-[#f2f1ee] hover:text-ink">
              <ListPlus className="h-4 w-4" /> Ajouter une sous-partie
            </button>
          </div>
        );
      })}
      <button type="button" onClick={() => onChange([...sections, newLessonSection()])} className="fd-btn-primary min-h-10 px-4 text-[13.5px]">
        <Plus className="h-4 w-4" /> Partie {ROMAN[sections.length] || sections.length + 1}
      </button>
    </div>
  );
};

export default LessonSectionsEditor;
