import { api } from './client';
import { Domaine, Process, PaginatedResponse } from '../types';

export const domainesApi = {
  list: (page = 1, page_size = 50) =>
    api.get<PaginatedResponse<Domaine>>(`/api/domaines?page=${page}&page_size=${page_size}`),

  get: (id: number) => api.get<Domaine>(`/api/domaines/${id}`),

  create: (data: { nom: string; description?: string }) =>
    api.post<Domaine>('/api/domaines', data),

  update: (id: number, data: { nom: string; description?: string }) =>
    api.put<Domaine>(`/api/domaines/${id}`, data),

  delete: (id: number) =>
    api.delete(`/api/domaines/${id}`),

  // Process d'un domaine
  listProcesses: (domaineId: number, page = 1, page_size = 50) =>
    api.get<PaginatedResponse<Process>>(`/api/domaines/${domaineId}/processes?page=${page}&page_size=${page_size}`),

  // Document Word du domaine (tous ses processus avec leurs étapes),
  // généré côté serveur.
  exportDocx: (domaineId: number) =>
    api.getBlob(`/api/domaines/${domaineId}/export`),
};
