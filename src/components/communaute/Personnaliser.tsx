/**
 * « Personnaliser » (propriétaire) : bannière, objectif, badges en vitrine, blocs visibles des autres, abonnements.
 */
import React, { useEffect, useId, useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { FormError, ModalShell, fieldCls } from '@/components/enregistrements/ModalShell';
import { BANNIERES, BLOCS, communauteApi, type Badge, type BadgeId, type Bloc, type Reglages } from '@/lib/api/communauteApi';
import { BANNIERE_NOMS, BanniereArt, Medaille, nomPalier } from './art';
import { t } from '@/i18n';

const OBJECTIFS = ['Médecine', 'Pharmacie', 'Ingénierie', 'CPGE', 'ENSA', 'ENCG', 'Architecture', 'Informatique'];
const BLOC_NOMS: Record<Bloc, string> = {
  chiffres: 'Chiffres', badges: 'Badges', chapitres: 'Chapitres maîtrisés', defi: 'Défi du jour', activite: 'Activité',
};

const Interrupteur: React.FC<{ actif: boolean; onChange: (v: boolean) => void; titre: string; detail?: string }> = ({ actif, onChange, titre, detail }) => (
  <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 py-1.5">
    <span className="min-w-0">
      <span className="block text-[14px] font-medium text-ink">{titre}</span>
      {detail && <span className="block text-[12.5px] leading-snug text-ink-faint">{detail}</span>}
    </span>
    <button type="button" role="switch" aria-checked={actif} onClick={() => onChange(!actif)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${actif ? 'bg-brand' : 'bg-[#d8d4cc]'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[inset-inline-start] ${actif ? 'start-6' : 'start-1'}`} />
    </button>
  </label>
);

export const Personnaliser: React.FC<{
  open: boolean;
  onClose: () => void;
  reglages: Reglages;
  badges: Badge[];
  onSaved: (r: Reglages) => void;
}> = ({ open, onClose, reglages, badges, onSaved }) => {
  const id = useId();
  const [r, setR] = useState(reglages);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => { if (open) { setR(reglages); setErreur(null); } }, [open, reglages]);

  const obtenus = badges.filter((b) => b.palier > 0);
  const basculerVitrine = (b: BadgeId) => setR((x) => ({
    ...x, vitrine: x.vitrine.includes(b) ? x.vitrine.filter((v) => v !== b) : x.vitrine.length >= 3 ? x.vitrine : [...x.vitrine, b],
  }));
  const basculerBloc = (b: Bloc) => setR((x) => ({
    ...x, blocs_masques: x.blocs_masques.includes(b) ? x.blocs_masques.filter((v) => v !== b) : [...x.blocs_masques, b],
  }));

  const enregistrer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      const saved = await communauteApi.modifier({
        banniere: r.banniere, objectif: r.objectif, vitrine: r.vitrine, blocs_masques: r.blocs_masques,
        abonnes_a_valider: r.abonnes_a_valider, visible_recherche: r.visible_recherche,
      });
      onSaved(saved);
      toast.success(t('Profil mis à jour'));
      onClose();
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, string> } }).response?.data;
      setErreur(data ? Object.values(data).join(' ') : t('Enregistrement impossible pour le moment.'));
    } finally {
      setEnvoi(false);
    }
  };

  const titreSection = 'mb-2 mt-6 text-[12px] font-bold uppercase tracking-[.08em] text-ink-faint';
  return (
    <ModalShell open={open} onClose={onClose} labelId={id} title={t('Personnaliser mon profil')} onSubmit={enregistrer}>
      <div className="-mx-1 max-h-[64vh] overflow-y-auto px-1">
        <p className={titreSection}>{t('Bannière')}</p>
        <div className="grid grid-cols-3 gap-2">
          {BANNIERES.map((b) => {
            const choisie = (r.banniere || '') === b;
            return (
              <button key={b} type="button" onClick={() => setR((x) => ({ ...x, banniere: b }))} aria-pressed={choisie}
                className={`relative overflow-hidden rounded-xl border-2 transition-colors ${choisie ? 'border-ink' : 'border-transparent hover:border-line'}`}>
                <BanniereArt banniere={b} className="h-12" />
                <span className="block bg-white px-1.5 py-1 text-[11.5px] font-medium text-ink-soft">{t(BANNIERE_NOMS[b])}</span>
                {choisie && <Check className="absolute end-1.5 top-1.5 h-4 w-4 rounded-full bg-ink p-0.5 text-white" aria-hidden />}
              </button>
            );
          })}
        </div>

        <label htmlFor={`${id}-objectif`} className={`${titreSection} block`}>{t('Objectif')}</label>
        <input id={`${id}-objectif`} className={fieldCls} maxLength={60} value={r.objectif}
          onChange={(e) => setR((x) => ({ ...x, objectif: e.target.value }))} placeholder={t('Par exemple : Médecine')} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {OBJECTIFS.map((o) => (
            <button key={o} type="button" onClick={() => setR((x) => ({ ...x, objectif: o }))}
              className={`min-h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors ${r.objectif === o ? 'border-gold bg-gold-soft text-gold-strong' : 'border-line text-ink-soft hover:border-[#cfc9bf]'}`}>
              {o}
            </button>
          ))}
        </div>

        <p className={titreSection}>{t('Vitrine')} <span className="font-semibold normal-case tracking-normal">· {t('3 badges au plus')}</span></p>
        {obtenus.length === 0 ? (
          <p className="text-[13px] text-ink-faint">{t('Aucun badge obtenu pour l’instant.')}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {obtenus.map((b) => {
              const rang = r.vitrine.indexOf(b.id);
              return (
                <button key={b.id} type="button" onClick={() => basculerVitrine(b.id)} aria-pressed={rang >= 0}
                  className={`relative flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors ${rang >= 0 ? 'border-ink bg-[#faf9f7]' : 'border-line hover:border-[#cfc9bf]'}`}>
                  <Medaille badge={b.id} palier={b.palier} taille={44} />
                  <span className="line-clamp-2 text-[11.5px] font-medium leading-tight text-ink-soft">{t(b.nom)}</span>
                  <span className="text-[10.5px] text-ink-faint">{nomPalier(b.palier)}</span>
                  {rang >= 0 && <span className="fd-nums absolute end-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">{rang + 1}</span>}
                </button>
              );
            })}
          </div>
        )}

        <p className={titreSection}>{t('Visible des autres membres')}</p>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {BLOCS.map((b) => {
            const visible = !r.blocs_masques.includes(b);
            return (
              <li key={b}>
                <button type="button" onClick={() => basculerBloc(b)} aria-pressed={visible}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-start text-[13.5px] font-medium transition-colors ${visible ? 'border-line text-ink' : 'border-dashed border-[#d8d4cc] text-ink-faint'}`}>
                  {visible ? <Eye className="h-4 w-4 shrink-0 text-brand" aria-hidden /> : <EyeOff className="h-4 w-4 shrink-0" aria-hidden />}
                  <span className="flex-1">{t(BLOC_NOMS[b])}</span>
                  <span className="text-[11.5px]">{visible ? t('Visible') : t('Masqué')}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className={titreSection}>{t('Abonnements')}</p>
        <div className="divide-y divide-line">
          <Interrupteur actif={r.abonnes_a_valider} onChange={(v) => setR((x) => ({ ...x, abonnes_a_valider: v }))}
            titre={t('Valider mes abonnés')} detail={r.mineur ? t('Activé par défaut pour les moins de 18 ans.') : undefined} />
          <Interrupteur actif={r.visible_recherche} onChange={(v) => setR((x) => ({ ...x, visible_recherche: v }))}
            titre={t('Apparaître dans la recherche de membres')} />
        </div>
        {erreur && <FormError>{erreur}</FormError>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="fd-btn-ghost min-h-10">{t('Annuler')}</button>
        <button type="submit" disabled={envoi} className="fd-btn-primary min-h-10 disabled:opacity-60">{t('Enregistrer')}</button>
      </div>
    </ModalShell>
  );
};

export default Personnaliser;
