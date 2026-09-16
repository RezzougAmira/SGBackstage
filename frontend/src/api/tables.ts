import { api } from './client';
import { Table, Attribut } from '../types';

export const tablesApi = {
  list: () => api.get<Table[]>('/api/tables'),

  get: (id: number) => api.get<Table>(`/api/tables/${id}`),

  create: (data: { nom: string; base_donnees?: string; description?: string }) =>
    api.post<Table>('/api/tables', data),

  update: (id: number, data: { nom: string; base_donnees?: string; description?: string }) =>
    api.put<Table>(`/api/tables/${id}`, data),

  delete: (id: number) => api.delete(`/api/tables/${id}`),

  // Attributs d'une table
  listAttributs: (tableId: number) =>
    api.get<Attribut[]>(`/api/tables/${tableId}/attributs`),
};
