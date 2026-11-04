import { api } from './client';
import { Masque, MasqueImpact, MasqueSuppressionResult, PaginatedResponse } from '../types';

export interface MasqueServiceInfo {
  nom: string;
  methode_http?: string;
  url?: string;
  input_desc?: string;
  output_desc?: string;
}

export interface MasquesListParams {
  search?: string;
  page?: number;
  page_size?: number;
}

export const masquesApi = {
  list: (params?: MasquesListParams) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return api.get<PaginatedResponse<Masque>>(`/api/masques${query}`);
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
