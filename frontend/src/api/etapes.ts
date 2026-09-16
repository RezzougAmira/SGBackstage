import { api } from './client';
import { Etape } from '../types';

export const etapesApi = {
  get: (processId: number, id: number) =>
    api.get<Etape>(`/api/processes/${processId}/etapes/${id}`),

  create: (processId: number, data: { nom: string; description?: string; ordre: number }) =>
    api.post<Etape>(`/api/processes/${processId}/etapes`, { ...data, process_id: processId }),

  update: (processId: number, id: number, data: { nom: string; description?: string; ordre: number }) =>
    api.put<Etape>(`/api/processes/${processId}/etapes/${id}`, { ...data, process_id: processId }),

  delete: (processId: number, id: number) =>
    api.delete(`/api/processes/${processId}/etapes/${id}`),

  reorder: (processId: number, etapeIds: number[]) =>
    api.put(`/api/processes/${processId}/etapes/reorder`, { etape_ids: etapeIds }),
};
