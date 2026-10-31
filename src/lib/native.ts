/**
 * Application mobile (iOS / Android, Capacitor) : le même site, embarqué dans l'application.
 * Ce module regroupe ce qu'une WebView ne fait pas comme un navigateur : imprimer / enregistrer en PDF,
 * télécharger un fichier, partager, ouvrir un site extérieur. Sur le web, chaque fonction garde le
 * comportement d'avant (window.print, lien de téléchargement, navigator.share…).
 */
import { Capacitor, registerPlugin, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** Vrai dans l'application iOS / Android, faux dans un navigateur. */
export const isNativeApp = Capacitor.isNativePlatform();
export const nativePlatform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';

/** Adresse publique du site : les liens partagés depuis l'application pointent vers fidni.fr. */
export const PUBLIC_SITE = 'https://fidni.fr';

/** Plugin natif de l'application (android/…/FidniNativePlugin.java, ios/App/App/FidniNativePlugin.swift). */
interface FidniNativePlugin {
  /** Fenêtre d'impression du système pour la page affichée (styles @media print) : imprimante ou PDF. */
  printPage(options: { name: string }): Promise<void>;
  /** Couleur derrière la barre d'état (et la barre de navigation d'Android), assortie au thème. */
  setBackground(options: { color: string }): Promise<void>;
}
const FidniNative = registerPlugin<FidniNativePlugin>('FidniNative');

/** Adresse d'une page de l'application telle qu'on la partage (https://fidni.fr/…), quel que soit l'appareil. */
export function publicUrl(path: string = window.location.pathname + window.location.search + window.location.hash): string {
  return PUBLIC_SITE + (path.startsWith('/') ? path : `/${path}`);
}

/**
 * Imprime la page affichée (aperçu « Enregistrer en PDF » compris). Dans l'application, l'événement
 * `afterprint` est émis à la fermeture de la fenêtre du système, comme le fait un navigateur.
 */
export async function printPage(name = document.title || 'FIDNI'): Promise<void> {
  if (!isNativeApp) { window.print(); return; }
  try {
    await FidniNative.printPage({ name: name.slice(0, 120) });
  } finally {
    window.dispatchEvent(new Event('afterprint'));
  }
}

const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

/**
 * Enregistre un fichier produit par le site (export des notes, .docx, .tex). Navigateur : téléchargement.
 * Application : fichier écrit dans le cache puis feuille de partage du système (Fichiers, Drive, WhatsApp…).
 */
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  if (!isNativeApp) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  const { uri } = await Filesystem.writeFile({
    path: filename, data: await blobToBase64(blob), directory: Directory.Cache, recursive: true,
  });
  try {
    await Share.share({ title: filename, files: [uri] });
  } catch {
    /* feuille de partage fermée sans choix : rien à faire */
  }
}

/** Partage un lien : feuille de partage du système (application, ou navigateur qui la propose), sinon copie. */
export async function shareLink(options: { title: string; text?: string; url: string }): Promise<'shared' | 'copied' | 'cancelled'> {
  if (isNativeApp) {
    try { await Share.share(options); return 'shared'; } catch { return 'cancelled'; }
  }
  if (navigator.share) {
    try { await navigator.share(options); return 'shared'; } catch { return 'cancelled'; }
  }
  await navigator.clipboard.writeText(options.url);
  return 'copied';
}

/** Ouvre un site extérieur : navigateur intégré dans l'application, nouvel onglet sur le web. */
export function openExternal(url: string): void {
  if (isNativeApp) void Browser.open({ url });
  else window.open(url, '_blank', 'noopener,noreferrer');
}

/** Barre d'état assortie au thème du site (fond de la barre du haut, icônes lisibles). */
export function syncSystemBars(theme: 'light' | 'dark'): void {
  if (!isNativeApp) return;
  // Fond de la barre du haut et de la barre d'onglets (bg-white ; en sombre : styles/mode-sombre.css).
  const color = theme === 'dark' ? '#24221f' : '#ffffff';
  void SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => undefined);
  void FidniNative.setBackground({ color }).catch(() => undefined);
}
