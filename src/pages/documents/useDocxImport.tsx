/** « Importer un document Word (.docx) » : choix du fichier, envoi, puis ouverture du nouveau document. */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { t } from '@/i18n';
import { documentsAPI } from '@/lib/api/documentsApi';

const DOCX = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function useDocxImport(beforeLeave?: () => Promise<void>) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const onFile = async (f?: File) => {
    if (!f) return;
    if (!/\.docx$/i.test(f.name)) { toast.error(t('Choisis un fichier Word .docx (un .doc doit d’abord être enregistré en .docx).')); return; }
    if (f.size > 15 * 1024 * 1024) { toast.error(t('Fichier trop lourd (15 Mo au plus).')); return; }
    setBusy(true);
    const tid = toast.loading(t('Import de « {name} »…', { name: f.name }));
    try {
      await beforeLeave?.();
      const d = await documentsAPI.importDocx(f);
      toast.success(t('Document importé'), { id: tid });
      navigate(`/documents/${d.id}`, { state: { avertissements: d.avertissements ?? [] } });
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || t('L’import a échoué.'), { id: tid });
    } finally {
      setBusy(false);
    }
  };
  const input = (
    <input ref={ref} type="file" accept={DOCX} className="hidden" onChange={(e) => {
      const f = e.target.files?.[0];
      e.target.value = '';
      void onFile(f);
    }} />
  );
  return { open: () => ref.current?.click(), input, busy };
}
