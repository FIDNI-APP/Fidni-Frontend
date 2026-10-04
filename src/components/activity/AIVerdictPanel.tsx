/**
 * Panneau de correction IA — réservé au superuser.
 * Upload d'une photo de copie → verdict par question (test du pipeline IA).
 * À terme : pré-remplira l'auto-évaluation de l'étudiant (human-in-the-loop).
 */
import React, { useRef, useState } from 'react';
import { Upload, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { aiCorrectionAPI, type AICorrectionResult } from '@/lib/api';

const INK = '#1a1a1a';
const GREEN = '#1a7a4a';

const VERDICT: Record<string, { label: string; bg: string; color: string }> = {
  success:       { label: 'Réussi',      bg: '#eaf3ed', color: '#15633c' },
  partial:       { label: 'Partiel',     bg: '#fdf4dc', color: '#8a6116' },
  failed:        { label: 'Échoué',      bg: '#fdeceb', color: '#a23b34' },
  not_attempted: { label: 'Non traitée', bg: '#f2f1ee', color: '#6b6862' },
};

export const AIVerdictPanel: React.FC<{ contentId: string }> = ({ contentId }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AICorrectionResult | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      setResult(await aiCorrectionAPI.correct(contentId, file));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Échec de la correction IA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ background: '#fff', border: '1px solid #e7e3dc', borderRadius: 16, padding: 22, marginTop: 16 }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
        <Sparkles className="w-4 h-4" style={{ color: GREEN }} />
        <h4 style={{ fontSize: 14, fontWeight: 700, color: INK, margin: 0 }}>Correction IA</h4>
        <span className="inline-flex items-center gap-1" style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, color: '#6b6862', background: '#f2f1ee', padding: '2px 8px', borderRadius: 99 }}>
          <ShieldCheck className="w-3 h-3" /> Superuser
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: '#6b6862', marginTop: 0, marginBottom: 16 }}>
        Photo d'une copie manuscrite → verdict par question, comparé aux solutions officielles de l'exercice.
      </p>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="w-full flex flex-col items-center justify-center gap-2"
        style={{
          padding: '20px', borderRadius: 12, border: '1.5px dashed #d8d4cc',
          background: 'transparent', color: '#33302b', cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? <Loader2 className="w-6 h-6 animate-spin" style={{ color: GREEN }} /> : <Upload className="w-6 h-6" style={{ color: '#9a958c' }} />}
        <span style={{ fontSize: 13, fontWeight: 600 }}>{loading ? 'Analyse en cours…' : 'Choisir une photo de copie'}</span>
      </button>

      {preview && (
        <img src={preview} alt="Copie" style={{ maxHeight: 180, margin: '14px auto 0', borderRadius: 10, display: 'block', border: '1px solid #e7e3dc' }} />
      )}

      {error && <p style={{ fontSize: 13, color: '#a23b34', marginTop: 12 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 18 }}>
          <div className="flex items-baseline gap-2" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>
              {result.score_awarded}<span style={{ color: '#9a958c' }}> / {result.score_total}</span>
            </span>
            <span style={{ fontSize: 11.5, color: '#9a958c' }}>points · {(result.processing_time_ms / 1000).toFixed(1)} s</span>
          </div>

          <div className="flex flex-col gap-2">
            {result.per_question.map((v) => {
              const cfg = VERDICT[v.verdict] || VERDICT.not_attempted;
              return (
                <div key={v.path} className="flex items-start gap-3" style={{ padding: '10px 12px', border: '1px solid #f2f1ee', borderRadius: 10 }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#6b6862', minWidth: 34, paddingTop: 2 }}>
                    {v.label || v.path.slice(0, 6)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 99, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    {v.comment && <p style={{ fontSize: 12.5, color: '#33302b', marginTop: 5, lineHeight: 1.5 }}>{v.comment}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {result.global_feedback && (
            <div style={{ marginTop: 12, border: '1px solid #e7e3dc', borderLeft: `3px solid ${GREEN}`, background: '#fff', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#33302b', lineHeight: 1.55 }}>
              {result.global_feedback}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
