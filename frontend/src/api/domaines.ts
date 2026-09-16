import { api } from './client';
import { Domaine, Process } from '../types';

export const domainesApi = {
  list: () => api.get<Domaine[]>('/api/domaines'),

  get: (id: number) => api.get<Domaine>(`/api/domaines/${id}`),

  create: (data: { nom: string; description?: string }) =>
    api.post<Domaine>('/api/domaines', data),

  update: (id: number, data: { nom: string; description?: string }) =>
    api.put<Domaine>(`/api/domaines/${id}`, data),

  delete: (id: number) =>
    api.delete(`/api/domaines/${id}`),

  // Process d'un domaine
  listProcesses: (domaineId: number) =>
    api.get<Process[]>(`/api/domaines/${domaineId}/processes`),
};
