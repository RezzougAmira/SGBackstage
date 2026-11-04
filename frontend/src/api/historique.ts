import { api } from './client';
import {
  HistoriqueFilters,
  HistoriqueResponse,
  HistoriqueTypeEntite,
  HistoriqueUtilisateur,
} from '../types';

export const historiqueApi = {
  /** Journal des changements, avec filtres et pagination. */
  list: (filters: HistoriqueFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.action) params.set('action', filters.action);
    if (filters.type_entite) params.set('type_entite', filters.type_entite);
    if (filters.entite_id !== undefined) params.set('entite_id', String(filters.entite_id));
    if (filters.utilisateur_id !== undefined)
      params.set('utilisateur_id', String(filters.utilisateur_id));
    if (filters.depuis) params.set('depuis', filters.depuis);
    if (filters.jusqua) params.set('jusqua', filters.jusqua);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page ?? 1));
    params.set('page_size', String(filters.page_size ?? 50));
    return api.get<HistoriqueResponse>(`/api/historique/?${params.toString()}`);
  },

  /** Utilisateurs présents dans le journal (pour le filtre, tous rôles). */
  utilisateurs: () => api.get<HistoriqueUtilisateur[]>('/api/historique/utilisateurs'),

  /** Dossier Word d'un objet : fiche courante + journal complet. */
  exportDossier: (typeEntite: HistoriqueTypeEntite, entiteId: number) =>
    api.getBlob(`/api/historique/export/${typeEntite}/${entiteId}`),
};