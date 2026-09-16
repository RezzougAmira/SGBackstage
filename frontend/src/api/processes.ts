import { api } from './client';
import { Process, Etape } from '../types';

export const processesApi = {
  get: (domaineId: number, id: number) =>
    api.get<Process>(`/api/domaines/${domaineId}/processes/${id}`),

  create: (domaineId: number, data: { nom: string; description?: string }) =>
    api.post<Process>(`/api/domaines/${domaineId}/processes`, { ...data, domaine_id: domaineId }),

  update: (domaineId: number, id: number, data: { nom: string; description?: string }) =>
    api.put<Process>(`/api/domaines/${domaineId}/processes/${id}`, { ...data, domaine_id: domaineId }),

  delete: (domaineId: number, id: number) =>
    api.delete(`/api/domaines/${domaineId}/processes/${id}`),

  // Étapes d'un process
  listEtapes: (processId: number) =>
    api.get<Etape[]>(`/api/processes/${processId}/etapes`),
};
