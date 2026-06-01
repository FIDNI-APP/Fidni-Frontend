/**
 * Admin editor for the per-exam statistics "Analyse & tendances" block:
 *   - comparison_html : free rich text (CompactTipTapEditor)
 *   - insight_cards   : list of {title, text} cards
 *
 * The distribution chart (subject/subfield/chapter) is auto-derived from
 * question metadata and is NOT edited here.
 */
import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Check, ChevronRight } from 'lucide-react';
import {
  listConcoursExams, getExamStats, setExamStats,
  type ConcoursExamListItem, type ExamInsightCard,
} from '@/lib/api/concoursApi';
import CompactTipTapEditor from '@/components/editor/CompactTipTapEditor';

export default function StatsAdmin() {
  const [exams, setExams] = useState<ConcoursExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConcoursExamListItem | null>(null);

  useEffect(() => {
    (async () => {
      try { setLoading(true); setExams(await listConcoursExams()); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="text-center" style={{ padding: 40 }}>
      <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: '#4f46e5' }} />
    </div>
  );

  if (selected) {
    return <StatsEditor exam={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>
        Statistiques des examens
      </h2>
      <p style={{ fontSize: 13, color: '#7068a8', marginBottom: 16 }}>
        Choisis un examen pour éditer son analyse comparative (la répartition par chapitre est automatique).
      </p>
      {exams.length === 0 ? (
        <div className="fd-card text-center" style={{ padding: 40 }}>
          <p style={{ color: '#7068a8' }}>Aucun examen.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {exams.map(e => (
            <button key={e.id} className="fd-card flex items-center gap-3"
                    style={{ padding: '12px 16px', cursor: 'pointer', textAlign: 'left', border: 'none', width: '100%' }}
                    onClick={() => setSelected(e)}>
              <span style={{
                background: '#eef2ff', color: '#4338ca',
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: '.04em',
              }}>
                {e.concours_type_display.toUpperCase()}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }} className="flex-1">
                {e.title}
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: '#b0adcd' }} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function StatsEditor({ exam, onBack }: { exam: ConcoursExamListItem; onBack: () => void }) {
  const [html, setHtml] = useState('');
  const [cards, setCards] = useState<ExamInsightCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const s = await getExamStats(exam.id);
        setHtml(s.comparison_html || '');
        setCards(s.insight_cards || []);
      } finally { setLoading(false); }
    })();
  }, [exam.id]);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await setExamStats(exam.id, {
        comparison_html: html,
        insight_cards: cards.filter(c => c.title.trim() || c.text.trim()),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const updateCard = (i: number, patch: Partial<ExamInsightCard>) =>
    setCards(cs => cs.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const removeCard = (i: number) => setCards(cs => cs.filter((_, idx) => idx !== i));
  const addCard = () => setCards(cs => [...cs, { title: '', text: '' }]);

  if (loading) return (
    <div className="text-center" style={{ padding: 40 }}>
      <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: '#4f46e5' }} />
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={onBack} className="fd-btn-ghost mb-2" style={{ padding: '5px 10px', fontSize: 12 }}>
            ← Tous les examens
          </button>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b' }}>
            {exam.concours_type_display} · {exam.title}
          </h2>
        </div>
        <button className="fd-btn-primary" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
          {saved ? 'Enregistré' : 'Enregistrer'}
        </button>
      </div>

      {/* Insight cards */}
      <div className="fd-card mb-4" style={{ padding: '20px 22px' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>Cards d'insight</h3>
          <button className="fd-btn-ghost" onClick={addCard} style={{ fontSize: 12, padding: '5px 10px' }}>
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
        {cards.length === 0 ? (
          <p style={{ fontSize: 12, color: '#9391b8', fontStyle: 'italic' }}>
            Aucune card. Ajoute des points clés (ex. récurrence d'un type de question).
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map((c, i) => (
              <div key={i} className="flex gap-2" style={{
                background: '#faf9ff', border: '1px solid #efedf9', borderRadius: 10, padding: 12,
              }}>
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    value={c.title}
                    onChange={e => updateCard(i, { title: e.target.value })}
                    placeholder="Titre (ex. Récurrence)"
                    style={{
                      padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e4e2f5',
                      fontSize: 13, fontWeight: 600, color: '#1e1b4b', outline: 'none',
                    }}
                  />
                  <textarea
                    value={c.text}
                    onChange={e => updateCard(i, { text: e.target.value })}
                    placeholder="Texte explicatif…"
                    rows={2}
                    style={{
                      padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e4e2f5',
                      fontSize: 13, color: '#4b4880', outline: 'none', resize: 'vertical',
                    }}
                  />
                </div>
                <button onClick={() => removeCard(i)}
                        style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', alignSelf: 'flex-start' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rich comparison */}
      <div className="fd-card" style={{ padding: '20px 22px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>
          Analyse comparative
        </h3>
        <p style={{ fontSize: 12, color: '#7068a8', marginBottom: 12 }}>
          Texte libre : comparaison avec les autres concours, tendances sur les dernières années, etc.
        </p>
        <CompactTipTapEditor content={html} onChange={setHtml} />
      </div>
    </>
  );
}
