import React from 'react';
import { BookOpen, Plus, Loader2 } from 'lucide-react';
import NotebookCard from './NotebookCard';
import { Notebook } from '@/types';

interface NotebooksListViewProps {
  notebooks: Notebook[];
  onSelectNotebook: (id: string) => void;
  onDeleteNotebook: (id: string) => void;
  onCreateNotebook: () => void;
  isLoading?: boolean;
}

const NotebooksListView: React.FC<NotebooksListViewProps> = ({
  notebooks,
  onSelectNotebook,
  onDeleteNotebook,
  onCreateNotebook,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#9a958c' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="flex items-center justify-between gap-4 mb-7">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: '#f2f1ee', border: '1px solid #e7e3dc' }}>
            <BookOpen className="w-5 h-5" style={{ color: '#1a1a1a' }} />
          </div>
          <div className="min-w-0">
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01em' }}>Cahiers de cours</h1>
            <p style={{ fontSize: 13.5, color: '#6b6862', marginTop: 1 }}>Vos leçons rassemblées, matière par matière</p>
          </div>
        </div>
        <button className="fd-btn-primary flex-shrink-0" onClick={onCreateNotebook} data-tour="cahiers-nouveau">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouveau cahier</span>
        </button>
      </header>

      {notebooks.length === 0 ? (
        <div className="text-center py-16 px-6" style={{ background: '#fff', border: '1px solid #e7e3dc', borderRadius: 16 }}>
          <div className="mx-auto mb-4 flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 16, background: '#f7f6f3' }}>
            <BookOpen className="w-7 h-7" style={{ color: '#cfcdc8' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Aucun cahier pour le moment</h3>
          <p style={{ fontSize: 13.5, color: '#6b6862', marginBottom: 20, maxWidth: 360, marginInline: 'auto' }}>
            Créez votre premier cahier pour rassembler vos leçons par matière et suivre votre progression.
          </p>
          <button className="fd-btn-primary" style={{ margin: '0 auto' }} onClick={onCreateNotebook}>
            <Plus className="w-4 h-4" />
            Créer un cahier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-tour="cahiers-liste">
          {notebooks.map((notebook) => (
            <NotebookCard
              key={notebook.id}
              notebook={notebook}
              onClick={onSelectNotebook}
              onDelete={onDeleteNotebook}
            />
          ))}

          {/* Add new notebook */}
          <button
            className="group"
            onClick={onCreateNotebook}
            style={{
              height: 232, borderRadius: 14, border: '1.5px dashed #d8d4cc', background: 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'border-color .16s, background .16s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1a7a4a'; e.currentTarget.style.background = 'rgba(26,122,74,.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d8d4cc'; e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="flex items-center justify-center mb-3" style={{ width: 52, height: 52, borderRadius: 14, background: '#f2f1ee' }}>
              <Plus className="w-6 h-6" style={{ color: '#33302b' }} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>Créer un cahier</h3>
            <p style={{ fontSize: 12.5, color: '#9a958c' }}>Ajouter une nouvelle matière</p>
          </button>
        </div>
      )}
    </div>
  );
};

export default NotebooksListView;
