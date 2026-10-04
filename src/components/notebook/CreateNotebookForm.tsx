import React from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { ClassLevelModel, SubjectModel } from '@/types';

interface CreateNotebookFormProps {
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  classLevels: ClassLevelModel[];
  subjects: SubjectModel[];
  setSelectedClassLevel: (value: string) => void;
  selectedClassLevel: string;
  setSelectedSubject: (value: string) => void;
  selectedSubject: string;
  notebookTitle: string;
  setNotebookTitle: (value: string) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33302b', marginBottom: 7,
};
const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1px solid #e7e3dc', background: '#fff', fontSize: 14,
  color: '#1a1a1a', outline: 'none', transition: 'border-color .15s', fontFamily: 'inherit',
};

const CreateNotebookForm: React.FC<CreateNotebookFormProps> = ({
  onClose,
  onSubmit,
  loading,
  classLevels,
  subjects,
  setSelectedClassLevel,
  selectedClassLevel,
  setSelectedSubject,
  selectedSubject,
  notebookTitle,
  setNotebookTitle
}) => {
  const disabled = !selectedSubject || !selectedClassLevel || !notebookTitle || loading;
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = '#1a7a4a'; };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = '#e7e3dc'; };

  return (
    <div className="max-w-lg mx-auto" style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e3dc', padding: 24 }}>
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>Créer un cahier de cours</h2>
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="flex items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e7e3dc', background: '#fff', color: '#33302b', cursor: 'pointer' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label htmlFor="notebookTitle" style={labelStyle}>Titre du cahier</label>
          <input
            type="text"
            id="notebookTitle"
            value={notebookTitle}
            onChange={(e) => setNotebookTitle(e.target.value)}
            style={fieldStyle}
            placeholder="Ex : Mathématiques — 2ème Bac SM"
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        <div>
          <label htmlFor="classLevel" style={labelStyle}>Niveau</label>
          <select
            id="classLevel"
            value={selectedClassLevel}
            onChange={(e) => setSelectedClassLevel(e.target.value)}
            style={fieldStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            <option value="">Choisir votre niveau</option>
            {classLevels.map(level => (
              <option key={level.id} value={level.id}>{level.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="subject" style={labelStyle}>Matière</label>
          <select
            id="subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{ ...fieldStyle, opacity: (!selectedClassLevel || subjects.length === 0) ? 0.6 : 1 }}
            disabled={!selectedClassLevel || subjects.length === 0}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            <option value="">
              {!selectedClassLevel
                ? 'Choisissez d\'abord un niveau'
                : subjects.length === 0
                  ? 'Aucune matière pour ce niveau'
                  : 'Choisir une matière'}
            </option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-1">
          <button className="fd-btn-ghost" onClick={onClose}>Annuler</button>
          <button
            className="fd-btn-primary"
            onClick={onSubmit}
            disabled={disabled}
            style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</> : <><Plus className="w-4 h-4" /> Créer le cahier</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateNotebookForm;
