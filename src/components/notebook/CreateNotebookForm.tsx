import React from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Créer un cahier de cours</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="notebookTitle" className="block text-sm font-medium text-gray-700 mb-1">
            Notebook Title
          </label>
          <input
            type="text"
            id="notebookTitle"
            value={notebookTitle}
            onChange={(e) => setNotebookTitle(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter a title for your notebook"
          />
        </div>
        
        <div>
          <label htmlFor="classLevel" className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
          <select
            id="classLevel"
            value={selectedClassLevel}
            onChange={(e) => setSelectedClassLevel(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Choisir votre niveau</option>
            {classLevels.map(level => (
              <option key={level.id} value={level.id}>{level.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
          <select
            id="subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            disabled={!selectedClassLevel || subjects.length === 0}
          >
            <option value="">
              {!selectedClassLevel 
                ? "Select a class level first" 
                : subjects.length === 0 
                  ? "No subjects available for this level" 
                  : "Select a subject"}
            </option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-3 mt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="border-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={!selectedSubject || !selectedClassLevel || !notebookTitle || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Créer un cahier de cours
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateNotebookForm;