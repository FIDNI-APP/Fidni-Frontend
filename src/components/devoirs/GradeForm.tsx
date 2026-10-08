// « Ma note : [14,5] / 20 » d'un DS passé (virgule ou point acceptés).
import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { devoirsApi, type UpcomingTest } from '@/lib/api/devoirsApi';

export const GradeForm: React.FC<{ test: UpcomingTest; onSaved: (t: UpcomingTest) => void; autoFocus?: boolean }> = ({ test, onSaved, autoFocus }) => {
  const [value, setValue] = useState(test.grade !== null ? String(test.grade).replace('.', ',') : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const parsed = Number(value.replace(',', '.'));
  const valid = value.trim() !== '' && !Number.isNaN(parsed) && parsed >= 0 && parsed <= 20;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(false);
    try {
      onSaved(await devoirsApi.update(test.id, { grade: Math.round(parsed * 100) / 100 }));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-1.5">
      <label className="text-[12.5px] text-ink-faint" htmlFor={`grade-${test.id}`}>Ma note</label>
      <input id={`grade-${test.id}`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="—" autoFocus={autoFocus}
        aria-invalid={!!value && !valid}
        className={`fd-nums h-8 w-14 rounded-lg border bg-white px-2 text-center text-[13.5px] font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand/25 ${
          value && !valid ? 'border-[#e0a59f]' : 'border-line focus:border-brand'}`} />
      <span className="text-[12.5px] text-ink-faint">/ 20</span>
      <button type="submit" disabled={!valid || busy} aria-label="Enregistrer ma note"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-40">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      {error && <span role="alert" className="basis-full text-[12px] text-[#a23b34]">La note n’a pas pu être enregistrée.</span>}
    </form>
  );
};

export default GradeForm;
