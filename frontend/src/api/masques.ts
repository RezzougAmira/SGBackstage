import { api } from './client';
import { Masque, MasqueImpact, MasqueSuppressionResult } from '../types';

export interface MasqueServiceInfo {
  nom: string;
  methode_http?: string;
  url?: string;
  input_desc?: string;
  output_desc?: string;
}

export const masquesApi = {
  list: (search?: string) => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return api.get<Masque[]>(`/api/masques${params}`);
  },

  get: (id: number) => api.get<Masque>(`/api/masques/${id}`),

  create: (data: { code: string; nom: string; description?: string; image_key?: string | null }) =>
    api.post<Masque>('/api/masques', data),

  // Crée le masque et le rattache à l'étape en une seule requête.
  createForEtape: (
    etapeId: number,
    data: { code: string; nom: string; description?: string; image_key?: string | null; service?: MasqueServiceInfo }
  ) => api.post<Masque>(`/api/etapes/${etapeId}/masques`, data),

  update: (id: number, data: { code: string; nom: string; description?: string; image_key?: string | null }) =>
    api.put<Masque>(`/api/masques/${id}`, data),

  // Par défaut les services et procédures sont conservés : ils peuvent être
  // appelés par d'autres masques. Leur effacement est un choix explicite.
  delete: (id: number, supprimerServices = false) =>
    api.delete<MasqueSuppressionResult>(
      `/api/masques/${id}?supprimer_services=${supprimerServices}`
    ),

  // Où le masque est utilisé, pour dimensionner la suppression avant de la confirmer.
  impact: (id: number) => api.get<MasqueImpact>(`/api/masques/${id}/impact`),
};
