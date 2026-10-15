// Vidéo de présentation (15/10/2026) : la miniature de la vidéo, cliquable comme le bouton de la fenêtre (YouTube
// s'ouvre dans un nouvel onglet). Pas de lecteur YouTube intégré : aucun cookie de YouTube sur FIDNI. Image importée
// depuis src/assets (nom haché : pas de cache Cloudflare périmé).
import React from 'react';
import { Play } from 'lucide-react';
import miniature from '@/assets/nouveautes/video-presentation.jpg';
import { t } from '@/i18n';

const SceneVideo: React.FC<{ onCta?: () => void }> = ({ onCta }) => (
  <button type="button" onClick={onCta} aria-label={t('Regarder la vidéo sur YouTube')}
    className="fd-fixe group absolute inset-0 block h-full w-full overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gold/60">
    <img src={miniature} alt="" draggable={false} className="h-full w-full object-cover" />
    {/* En bas, sous le slogan de la miniature (au centre, il cachait « maths du »). */}
    <span className="absolute inset-x-0 bottom-4 flex justify-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(20,18,16,.72)] text-white shadow-[0_8px_24px_rgba(20,18,16,.35)] transition-transform duration-200 group-hover:scale-105">
        {/* Le triangle pointe à droite dans les deux sens de lecture : décalage optique physique, pas logique. */}
        <Play className="h-5 w-5 fill-current" style={{ marginLeft: 3 }} aria-hidden />
      </span>
    </span>
  </button>
);

export default SceneVideo;
