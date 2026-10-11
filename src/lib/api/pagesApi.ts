// Pages « À propos » et « Contact » : texte fourni par le backend (config/pages.py), le même que celui
// de la page pré-remplie pour les moteurs de recherche (config/seo.py).
import { api } from './apiClient';

export interface InfoPageLink { label: string; href: string }
export interface InfoPageSection { title: string; paragraphs: string[]; links?: InfoPageLink[] }
export interface InfoPageData {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  sections: InfoPageSection[];
}

export const getInfoPage = async (slug: string) => (await api.get(`/pages/${slug}/`)).data as InfoPageData;
