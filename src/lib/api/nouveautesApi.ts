/**
 * Fenêtres « Nouveautés » (14/10/2026) : la liste à montrer arrive avec le compte (`user.nouveautes`, réponse de
 * connexion et GET /auth/user/) ; backend apps/users/nouveautes.py.
 */
import { api } from './apiClient';

/** La fenêtre a été montrée : elle ne revient plus pour ce compte, sur aucun appareil. */
export const marquerNouveauteVue = async (id: string): Promise<{ a_voir: string[] }> =>
  (await api.post(`/nouveautes/${encodeURIComponent(id)}/vue/`)).data;
